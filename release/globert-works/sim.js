/* ===========================================================
   sim.js — Globert simulation engine
   Tile grid, discrete belt flow, recipes, producers.
   Exposes window.SIM.
   =========================================================== */
(function(){
  // direction index: 0=N 1=E 2=S 3=W
  const DX=[0,1,0,-1], DY=[-1,0,1,0];

  const RECIPES={
    smelt:    {in:{ore:1},          out:'plate',  time:2, label:'Smelt Plate',   short:'Furnace'},
    press:    {in:{plate:2},        out:'gear',   time:3, label:'Press Gear',    short:'Press'},
    assemble: {in:{plate:1,gear:1}, out:'widget', time:4, label:'Assemble Widget',short:'Assembly'}
  };
  const RECIPE_ORDER=['smelt','press','assemble'];

  const RES={
    ore:   {name:'Ore',    sub:'Raw material'},
    plate: {name:'Plate',  sub:'Smelted stock'},
    gear:  {name:'Gear',   sub:'Pressed part'},
    widget:{name:'Widget', sub:'Finished good'}
  };

  const UNIT_PRICE=45;          // cash per widget shipped
  const ASM_BUF=6;              // per-ingredient input buffer cap
  const STORE_CAP=12;
  const EXTRACT_TIME=3;         // steps per ore

  const COSTS={extractor:250, belt:5, assembler:300, storage:150, shipping:400};
  const REFUND=0.6;

  const S={
    N:12, cells:[], nodes:[],
    cash:2500,
    economy:true,
    step:0,
    produced:{ore:0,plate:0,gear:0,widget:0},
    shipped:0,
    shipTimes:[],               // ms timestamps for throughput
    onWidgetShipped:null,       // hook (set by erp)
    onShipFx:null,              // hook (set by main) -> visual pop
  };

  function inB(x,y){return x>=0&&y>=0&&x<S.N&&y<S.N;}
  function cellAt(x,y){return inB(x,y)?S.cells[y][x]:null;}

  function initWorld(N){
    S.N=N;
    S.cells=Array.from({length:N},()=>Array.from({length:N},()=>null));
    S.nodes=Array.from({length:N},()=>Array.from({length:N},()=>null));
    scatterNodes();
  }

  function scatterNodes(){
    const N=S.N;
    // a few ore clusters near edges/corners so belts have to travel
    const seeds=[
      [1,1],[2,1],[1,2],
      [N-2,2],[N-2,1],[N-3,1],
      [2,N-3],[1,N-2],[2,N-2]
    ];
    seeds.forEach(([x,y])=>{ if(inB(x,y)) S.nodes[y][x]='ore'; });
  }

  /* ---------- building factory ---------- */
  function makeBuilding(kind,dir,x,y){
    const b={kind,dir:dir||0,x,y,moved:false,visiting:false};
    if(kind==='belt'){ b.item=null; b.fromX=x; b.fromY=y; b.arrivedStep=-1; }
    if(kind==='extractor'){ b.out=null; b.timer=0; b.res=(S.nodes[y][x]||'ore'); }
    if(kind==='assembler'){ b.recipe='smelt'; b.in={}; b.craft=0; b.out=null; b.active=false; }
    if(kind==='storage'){ b.buf=[]; }
    if(kind==='shipping'){ b.glow=0; }
    return b;
  }

  function canPlace(x,y,kind){
    if(!inB(x,y))return false;
    if(kind==='extractor') return S.nodes[y][x]==='ore';
    return true;
  }
  function cost(kind){return COSTS[kind]||0;}
  function canAfford(kind){return !S.economy || S.cash>=cost(kind);}

  function place(x,y,kind,dir,free){
    if(!canPlace(x,y,kind))return false;
    if(!free && S.economy && S.cash<cost(kind))return false;
    S.cells[y][x]=makeBuilding(kind,dir,x,y);
    if(!free && S.economy)S.cash-=cost(kind);
    return true;
  }
  function remove(x,y,silent){
    if(!inB(x,y))return;
    const c=S.cells[y][x];
    if(c && !silent && S.economy)S.cash+=Math.round(cost(c.kind)*REFUND);
    S.cells[y][x]=null;
  }
  function setDir(x,y,dir){ const c=cellAt(x,y); if(c) c.dir=dir; }
  function cycleRecipe(x,y){
    const c=cellAt(x,y); if(!c||c.kind!=='assembler')return;
    const i=RECIPE_ORDER.indexOf(c.recipe);
    c.recipe=RECIPE_ORDER[(i+1)%RECIPE_ORDER.length];
    c.in={}; c.craft=0; c.out=null;
  }
  function setRecipe(x,y,r){ const c=cellAt(x,y); if(c&&c.kind==='assembler'&&RECIPES[r]){c.recipe=r;c.in={};c.craft=0;c.out=null;} }

  /* ---------- transport helpers ---------- */
  // what item is sitting at this cell's output, ready to push
  function getOut(b){
    if(!b)return null;
    if(b.kind==='belt')return b.item;
    if(b.kind==='extractor')return b.out;
    if(b.kind==='assembler')return b.out;
    if(b.kind==='storage')return b.buf.length?b.buf[0]:null;
    return null;
  }
  function clearOut(b){
    if(b.kind==='belt')b.item=null;
    else if(b.kind==='extractor')b.out=null;
    else if(b.kind==='assembler')b.out=null;
    else if(b.kind==='storage')b.buf.shift();
  }
  // can target accept this item?
  function accepts(t,item){
    if(!t)return false;
    if(t.moved)return false;            // already received this step
    if(t.kind==='belt')return t.item===null;
    if(t.kind==='assembler'){
      const rc=RECIPES[t.recipe]; if(!rc||!rc.in[item])return false;
      return (t.in[item]||0)<ASM_BUF;
    }
    if(t.kind==='storage')return t.buf.length<STORE_CAP;
    if(t.kind==='shipping')return item==='widget';
    return false;
  }
  function deliver(t,item,fromX,fromY){
    if(t.kind==='belt'){ t.item=item; t.fromX=fromX; t.fromY=fromY; t.moved=true; t.arrivedStep=S.step; }
    else if(t.kind==='assembler'){ t.in[item]=(t.in[item]||0)+1; }
    else if(t.kind==='storage'){ t.buf.push(item); t.moved=true; }
    else if(t.kind==='shipping'){ shipWidget(t); }
  }

  // recursive push: free downstream then move
  function pushFrom(b){
    if(!b||b.moved||b.visiting)return;
    const item=getOut(b);
    if(item===null)return;
    const tx=b.x+DX[b.dir], ty=b.y+DY[b.dir];
    const t=cellAt(tx,ty);
    if(!t)return;
    b.visiting=true;
    if(t.kind==='belt'&&t.item!==null) pushFrom(t);   // try to make room
    if(accepts(t,item)){
      clearOut(b);
      deliver(t,item,b.x,b.y);
      if(b.kind==='belt')b.moved=true;
    }
    b.visiting=false;
  }

  function shipWidget(dock){
    S.shipped++;
    S.cash+=UNIT_PRICE;
    S.shipTimes.push(performance.now());
    if(dock)dock.glow=1;
    if(typeof S.onShipFx==='function'&&dock)S.onShipFx(dock.x,dock.y,UNIT_PRICE);
    if(typeof S.onWidgetShipped==='function')S.onWidgetShipped();
  }

  /* ---------- main step ---------- */
  function step(){
    S.step++;
    const N=S.N;
    // reset flags
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const c=S.cells[y][x];if(c){c.moved=false;c.visiting=false;}}

    // 1) movement: push every producer/transport forward one tile
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const c=S.cells[y][x];if(c)pushFrom(c);}

    // 2) production / crafting timers
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const c=S.cells[y][x]; if(!c)continue;
      if(c.kind==='extractor'){
        if(c.out===null){
          c.timer++;
          if(c.timer>=EXTRACT_TIME){ c.out=c.res; c.timer=0; S.produced[c.res]++; }
        }
      } else if(c.kind==='assembler'){
        const rc=RECIPES[c.recipe];
        if(c.out===null){
          const ready=Object.keys(rc.in).every(k=>(c.in[k]||0)>=rc.in[k]);
          c.active=ready;
          if(ready){
            c.craft++;
            if(c.craft>=rc.time){
              Object.keys(rc.in).forEach(k=>{c.in[k]-=rc.in[k];});
              c.out=rc.out; c.craft=0; S.produced[rc.out]++;
            }
          } else c.craft=0;
        } else c.active=false;
      } else if(c.kind==='shipping'){
        if(c.glow>0)c.glow=Math.max(0,c.glow-0.08);
      }
    }
  }

  /* ---------- queries for ERP ---------- */
  function wip(){
    let n=0; const N=S.N;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const c=S.cells[y][x]; if(!c)continue;
      if(c.kind==='belt'&&c.item)n++;
      else if(c.kind==='extractor'&&c.out)n++;
      else if(c.kind==='assembler'){ if(c.out)n++; for(const k in c.in)n+=c.in[k]; }
      else if(c.kind==='storage')n+=c.buf.length;
    }
    return n;
  }
  function counts(){
    // current live counts per resource across the floor
    const c={ore:0,plate:0,gear:0,widget:0};
    const N=S.N;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const b=S.cells[y][x]; if(!b)continue;
      if(b.kind==='belt'&&b.item)c[b.item]++;
      else if(b.kind==='extractor'&&b.out)c[b.out]++;
      else if(b.kind==='assembler'){ if(b.out)c[b.out]++; for(const k in b.in)c[k]+=b.in[k]; }
      else if(b.kind==='storage')b.buf.forEach(it=>c[it]++);
    }
    return c;
  }
  function buildingStats(){
    let ext=0,asm=0,asmActive=0,belt=0,store=0,ship=0;
    const N=S.N;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const c=S.cells[y][x]; if(!c)continue;
      if(c.kind==='extractor')ext++;
      else if(c.kind==='assembler'){asm++; if(c.active)asmActive++;}
      else if(c.kind==='belt')belt++;
      else if(c.kind==='storage')store++;
      else if(c.kind==='shipping')ship++;
    }
    return {ext,asm,asmActive,belt,store,ship};
  }
  function throughput(){ // widgets/min over last 60s
    const now=performance.now(), cut=now-60000;
    while(S.shipTimes.length&&S.shipTimes[0]<cut)S.shipTimes.shift();
    return S.shipTimes.length;
  }

  /* ---------- save / load ---------- */
  function serialize(){
    const b=[];
    for(let y=0;y<S.N;y++)for(let x=0;x<S.N;x++){const c=S.cells[y][x];if(c)b.push([x,y,c.kind,c.dir,c.recipe||0]);}
    return {v:1,N:S.N,cash:S.cash,economy:S.economy,produced:S.produced,shipped:S.shipped,cells:b};
  }
  function deserialize(d){
    if(!d||!Array.isArray(d.cells))return false;
    initWorld(d.N||12);
    S.cash=d.cash!=null?d.cash:2500;
    if(d.economy!=null)S.economy=d.economy;
    S.produced=Object.assign({ore:0,plate:0,gear:0,widget:0},d.produced||{});
    S.shipped=d.shipped||0;
    S.shipTimes=[];
    d.cells.forEach(([x,y,k,dir,r])=>{
      if(!inB(x,y))return;
      if(!COSTS[k])return;
      const c=makeBuilding(k,dir,x,y);
      if(r&&c.kind==='assembler')c.recipe=r;
      S.cells[y][x]=c;
    });
    return true;
  }

  window.SIM={
    S, RECIPES, RECIPE_ORDER, RES, DX, DY, UNIT_PRICE, COSTS,
    initWorld, place, remove, setDir, canPlace, cost, canAfford, cellAt, inB,
    cycleRecipe, setRecipe, makeBuilding, step,
    wip, counts, buildingStats, throughput, serialize, deserialize
  };
})();
