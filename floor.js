/* ===========================================================
   floor.js — Globert shop-floor renderer + input (canvas)
   Low-poly geometric, top-down. Exposes window.FLOOR.
   =========================================================== */
(function(){
  const {S,DX,DY}=SIM;
  let canvas,ctx,DPR=1;
  let cam={tile:52,ox:0,oy:0};
  let hover=null;             // {x,y}
  let ghostDir=1;            // placement direction
  let painting=false, lastTile=null, lastButton=0;
  let tool='select';
  let pixiLayer=null;

  const COL={};
  function refreshColors(){
    const cs=getComputedStyle(document.documentElement);
    ['green','green-deep','green-700','ore','ore-dk','plate','plate-dk',
     'gear','gear-dk','widget','widget-dk','ink','ink-2','ink-3','line',
     'line-2','paper','panel','panel-2','mint','green-soft','gold'].forEach(k=>{
      COL[k]=cs.getPropertyValue('--'+k).trim()||'#000';
    });
  }

  const visual={beltSpeed:1, lowPoly:0.65, ambient:'day'};
  const popups=[];   // floating cash FX {x,y,text,born}
  function popCash(tx,ty,amt){ popups.push({x:tx+0.5,y:ty+0.5,text:'+$'+amt,born:performance.now()}); }
  function drawPopups(){
    const now=performance.now(),T=cam.tile;
    for(let i=popups.length-1;i>=0;i--){
      const p=popups[i],age=(now-p.born)/1100;
      if(age>=1){popups.splice(i,1);continue;}
      const [sx,sy]=t2s(p.x,p.y);
      ctx.save();
      ctx.globalAlpha=age<0.15?age/0.15:(1-age)*1.1;
      ctx.font=`700 ${Math.round(T*0.34)}px var(--font-disp)`;ctx.textAlign='center';
      ctx.fillStyle=COL['green-deep'];
      ctx.fillText(p.text, sx-T/2, sy-T/2-age*T*1.1);
      ctx.restore();
    }
  }

  /* ---------- geometry helpers ---------- */
  function rrect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
  function lighten(hex,amt){return mix(hex,'#ffffff',amt);}
  function darken(hex,amt){return mix(hex,'#000000',amt);}
  function mix(a,b,t){
    const pa=parse(a),pb=parse(b);
    return `rgb(${Math.round(pa[0]+(pb[0]-pa[0])*t)},${Math.round(pa[1]+(pb[1]-pa[1])*t)},${Math.round(pa[2]+(pb[2]-pa[2])*t)})`;
  }
  function parse(h){
    h=h.replace('#','');
    if(h.length===3)h=h.split('').map(c=>c+c).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }

  /* ---------- resource tokens (exported) ---------- */
  function drawResource(g,type,cx,cy,size){
    const r=size/2, lp=visual.lowPoly;
    g.save(); g.translate(cx,cy);
    if(type==='ore'){
      const pts=[]; for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-90);pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
      g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
      g.fillStyle=COL['ore'];g.fill();
      // top facet
      g.beginPath();g.moveTo(pts[5][0],pts[5][1]);g.lineTo(pts[0][0],pts[0][1]);g.lineTo(0,0);g.closePath();
      g.fillStyle=lighten(COL['ore'],0.32*lp+0.05);g.fill();
      g.beginPath();g.moveTo(pts[2][0],pts[2][1]);g.lineTo(pts[3][0],pts[3][1]);g.lineTo(0,0);g.closePath();
      g.fillStyle=darken(COL['ore'],0.28*lp);g.fill();
    } else if(type==='plate'){
      const s=r*1.55;
      rrectP(g,-s/2,-s/2,s,s,3);g.fillStyle=COL['plate'];g.fill();
      g.beginPath();g.moveTo(-s/2,-s/2);g.lineTo(s/2,-s/2);g.lineTo(-s/2,s/2);g.closePath();
      g.fillStyle=lighten(COL['plate'],0.3*lp+0.05);g.fill();
      g.beginPath();g.moveTo(s/2,-s/2);g.lineTo(s/2,s/2);g.lineTo(-s/2,s/2);g.closePath();
      g.fillStyle=darken(COL['plate'],0.22*lp);g.fill();
    } else if(type==='gear'){
      const teeth=8,ro=r,ri=r*0.74;
      g.beginPath();
      for(let i=0;i<teeth*2;i++){const a=Math.PI/teeth*i;const rad=i%2?ri:ro;g.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}
      g.closePath();g.fillStyle=COL['gear'];g.fill();
      g.beginPath();g.arc(0,0,r*0.42,0,7);g.fillStyle=darken(COL['gear'],0.25);g.fill();
      g.beginPath();g.arc(-r*0.12,-r*0.12,r*0.36,Math.PI,Math.PI*1.6);g.lineWidth=r*0.16;
      g.strokeStyle=lighten(COL['gear'],0.35*lp+0.05);g.stroke();
    } else if(type==='widget'){
      const s=r*1.7;
      rrectP(g,-s/2,-s/2,s,s,s*0.26);g.fillStyle=COL['widget'];g.fill();
      // notch (G cut) top-right
      g.fillStyle=COL['paper'];
      rrectP(g,s*0.08,-s*0.5,s*0.42,s*0.3,2);g.fill();
      // facet
      g.beginPath();g.moveTo(-s/2,-s/2+4);g.lineTo(-s/2,s/2);g.lineTo(0,s/2);g.closePath();
      g.fillStyle=darken(COL['widget'],0.2*lp);g.fill();
      g.beginPath();g.arc(0,s*0.06,s*0.2,0,7);g.fillStyle=lighten(COL['widget'],0.4*lp+0.1);g.fill();
    }
    g.restore();
  }
  function rrectP(g,x,y,w,h,r){
    g.beginPath();g.moveTo(x+r,y);
    g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
  }

  /* ---------- camera ---------- */
  function resize(){
    if(!canvas)return;
    const parent=canvas.parentElement||canvas;
    const rect=parent.getBoundingClientRect();
    const width=Math.max(1,rect.width||canvas.clientWidth||window.innerWidth||1);
    const height=Math.max(1,rect.height||canvas.clientHeight||window.innerHeight||1);
    DPR=Math.min(window.devicePixelRatio||1,2);
    canvas.width=width*DPR; canvas.height=height*DPR;
    canvas.style.width=width+'px'; canvas.style.height=height+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    const pad=46;
    cam.tile=Math.floor(Math.min((width-pad*2)/S.N,(height-pad*2)/S.N));
    cam.tile=Math.max(28,cam.tile);
    const gw=cam.tile*S.N, gh=cam.tile*S.N;
    cam.ox=Math.round((width-gw)/2);
    cam.oy=Math.round((height-gh)/2);
    if(pixiLayer&&pixiLayer.resize)pixiLayer.resize();
  }
  function t2s(x,y){return [cam.ox+x*cam.tile, cam.oy+y*cam.tile];}
  function s2t(px,py){return [Math.floor((px-cam.ox)/cam.tile), Math.floor((py-cam.oy)/cam.tile)];}

  /* ---------- render ---------- */
  function render(frac,now){
    const w=canvas.width/DPR,h=canvas.height/DPR;
    ctx.clearRect(0,0,w,h);
    const T=cam.tile;
    const amb=visual.ambient;

    // board base
    const [bx,by]=t2s(0,0);
    ctx.save();
    ctx.shadowColor='rgba(28,39,34,.16)';ctx.shadowBlur=34;ctx.shadowOffsetY=12;
    rrect(bx-6,by-6,T*S.N+12,T*S.N+12,18);
    ctx.fillStyle=amb==='dusk'?'#e7e3da':(amb==='night'?'#1b241f':COL['panel']);
    ctx.fill();
    ctx.restore();

    // grid cells + nodes
    for(let y=0;y<S.N;y++)for(let x=0;x<S.N;x++){
      const [sx,sy]=t2s(x,y);
      const node=S.nodes[y][x];
      ctx.fillStyle=((x+y)&1)?(amb==='night'?'#222d27':COL['panel']):(amb==='night'?'#1f2923':COL['panel-2']);
      ctx.fillRect(sx,sy,T,T);
      if(node==='ore') drawNode(sx,sy,T,now);
    }
    // grid lines
    ctx.strokeStyle=amb==='night'?'rgba(255,255,255,.05)':COL['line-2'];ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<=S.N;i++){const [gx]=t2s(i,0);const [,gy]=t2s(0,i);
      ctx.moveTo(gx,by);ctx.lineTo(gx,by+T*S.N);ctx.moveTo(bx,gy);ctx.lineTo(bx+T*S.N,gy);}
    ctx.stroke();

    // belts (under)
    for(let y=0;y<S.N;y++)for(let x=0;x<S.N;x++){const c=S.cells[y][x];if(c&&c.kind==='belt')drawBelt(c,now);}
    // machines
    for(let y=0;y<S.N;y++)for(let x=0;x<S.N;x++){const c=S.cells[y][x];if(c&&c.kind!=='belt')drawMachine(c,now);}
    // items (top)
    for(let y=0;y<S.N;y++)for(let x=0;x<S.N;x++){const c=S.cells[y][x];if(!c)continue;
      if(c.kind==='belt'&&c.item)drawBeltItem(c,frac);
      else if(c.kind==='extractor'&&c.out)drawMachItem(c,c.out,now);
      else if(c.kind==='assembler'&&c.out)drawMachItem(c,c.out,now);
    }
    // ghost
    if(hover&&tool!=='select')drawGhost();
    // hover ring (select)
    if(hover&&tool==='select'){
      const [sx,sy]=t2s(hover.x,hover.y);
      ctx.strokeStyle=COL['green'];ctx.lineWidth=2;rrect(sx+2,sy+2,T-4,T-4,7);ctx.stroke();
    }
    // floating cash fx
    drawPopups();
    if(pixiLayer&&pixiLayer.drawCells)pixiLayer.drawCells({sim:S,cam,hover,tool,now});
  }

  function drawNode(sx,sy,T,now){
    ctx.fillStyle=COL['paper'];ctx.globalAlpha=0.55;ctx.fillRect(sx,sy,T,T);ctx.globalAlpha=1;
    // ore crystals
    const cx=sx+T/2,cy=sy+T/2;
    const spots=[[-.18,-.12,.16],[.16,.04,.13],[-.04,.2,.11]];
    spots.forEach(([dx,dy,s])=>drawResource(ctx,'ore',cx+dx*T,cy+dy*T,s*T));
    ctx.fillStyle=COL['ore-dk'];ctx.font=`600 ${Math.round(T*0.13)}px var(--font-disp)`;
  }

  function dirAngle(d){return [-Math.PI/2,0,Math.PI/2,Math.PI][d];}

  function drawBelt(c,now){
    const [sx,sy]=t2s(c.x,c.y),T=cam.tile,cx=sx+T/2,cy=sy+T/2;
    rrect(sx+3,sy+3,T-6,T-6,7);
    ctx.fillStyle=visual.ambient==='night'?'#2c3831':mix(COL['panel-2'],COL['line'],0.7);ctx.fill();
    // chevrons scrolling along dir
    ctx.save();ctx.translate(cx,cy);ctx.rotate(dirAngle(c.dir));
    const phase=((now*0.001*visual.beltSpeed*1.3)%1);
    ctx.strokeStyle=visual.ambient==='night'?mix(COL['mint'],COL['ink'],0.3):mix(COL['ink-3'],COL['ink'],0.25);
    ctx.lineWidth=Math.max(2.4,T*0.06);
    ctx.lineCap='round';ctx.lineJoin='round';
    for(let i=-1;i<=1;i++){
      const off=(i+phase)*(T*0.42)-T*0.16;
      ctx.globalAlpha=Math.max(0,0.72-Math.abs(off)/(T*0.8));
      ctx.beginPath();
      ctx.moveTo(off-T*0.12,-T*0.13);ctx.lineTo(off+T*0.04,0);ctx.lineTo(off-T*0.12,T*0.13);
      ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.restore();
  }

  function drawBeltItem(c,frac){
    const T=cam.tile;
    let fx=c.x,fy=c.y;
    if(c.arrivedStep===S.step){fx=c.fromX;fy=c.fromY;}      // animate only the hop it just made
    const ix=fx+(c.x-fx)*frac, iy=fy+(c.y-fy)*frac;
    const [sx,sy]=t2s(ix,iy);
    const cx=sx+T/2,cy=sy+T/2;
    ctx.save();
    ctx.fillStyle='rgba(28,39,34,.16)';ctx.beginPath();ctx.ellipse(cx,cy+T*0.16,T*0.2,T*0.09,0,0,7);ctx.fill();
    ctx.restore();
    drawResource(ctx,c.item,cx,cy,T*0.5);
  }

  function drawMachItem(c,item,now){
    const T=cam.tile,[sx,sy]=t2s(c.x,c.y);
    const cx=sx+T/2+DX[c.dir]*T*0.24, cy=sy+T/2+DY[c.dir]*T*0.24;
    const bob=Math.sin(now*0.004)*T*0.02;
    drawResource(ctx,item,cx,cy+bob,T*0.4);
  }

  function machinePanel(c,fill,stroke){
    const [sx,sy]=t2s(c.x,c.y),T=cam.tile;
    ctx.save();
    ctx.shadowColor='rgba(28,39,34,.12)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
    rrect(sx+4,sy+4,T-8,T-8,9);ctx.fillStyle=fill;ctx.fill();
    ctx.restore();
    if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;rrect(sx+4,sy+4,T-8,T-8,9);ctx.stroke();}
    return [sx,sy,T,sx+T/2,sy+T/2];
  }

  function outArrow(cx,cy,dir,T,col){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(dirAngle(dir));
    ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(T*0.34,0);ctx.lineTo(T*0.22,-T*0.08);ctx.lineTo(T*0.22,T*0.08);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  function drawMachine(c,now){
    if(c.kind==='extractor'){
      const [sx,sy,T,cx,cy]=machinePanel(c,COL['ink'],null);
      // hex core
      const r=T*0.24;ctx.beginPath();
      for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-90);ctx[i?'lineTo':'moveTo'](cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
      ctx.closePath();ctx.fillStyle=COL['green'];ctx.fill();
      // rotating drill ticks
      ctx.save();ctx.translate(cx,cy);ctx.rotate(now*0.002);
      ctx.strokeStyle=lighten(COL['green'],0.45);ctx.lineWidth=T*0.045;ctx.lineCap='round';
      for(let i=0;i<3;i++){ctx.rotate(Math.PI*2/3);ctx.beginPath();ctx.moveTo(0,-r*0.45);ctx.lineTo(0,-r*0.78);ctx.stroke();}
      ctx.restore();
      outArrow(cx,cy,c.dir,T,lighten(COL['ink'],0.4));
    } else if(c.kind==='assembler'){
      const rc=SIM.RECIPES[c.recipe];
      const [sx,sy,T,cx,cy]=machinePanel(c,COL['panel'],c.active?COL['green']:COL['line']);
      // recipe gear glyph
      ctx.save();ctx.translate(cx,cy-T*0.04);
      if(c.active)ctx.rotate(now*0.003);
      const teeth=8,ro=T*0.2,ri=T*0.15;ctx.beginPath();
      for(let i=0;i<teeth*2;i++){const a=Math.PI/teeth*i;const rad=i%2?ri:ro;ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}
      ctx.closePath();ctx.fillStyle=c.active?COL['green']:COL['ink-3'];ctx.fill();
      ctx.beginPath();ctx.arc(0,0,T*0.07,0,7);ctx.fillStyle=COL['panel'];ctx.fill();
      ctx.restore();
      // output token icon mini
      drawResource(ctx,rc.out,cx,cy+T*0.2,T*0.2);
      // craft progress ring
      if(c.active){
        ctx.beginPath();ctx.arc(cx,cy-T*0.04,T*0.27,-Math.PI/2,-Math.PI/2+Math.PI*2*(c.craft/rc.time));
        ctx.strokeStyle=COL['green'];ctx.lineWidth=2.4;ctx.stroke();
      }
      outArrow(cx,cy,c.dir,T,COL['green']);
    } else if(c.kind==='storage'){
      const [sx,sy,T,cx,cy]=machinePanel(c,COL['mint'],null);
      const fill=c.buf.length/12;
      // stacked boxes
      const boxes=Math.ceil(fill*6);
      ctx.fillStyle=COL['green-deep'];
      for(let i=0;i<boxes;i++){
        const col=i%3,row=Math.floor(i/3);
        const bw=T*0.16;
        ctx.globalAlpha=0.85;
        rrectP(ctx,cx-T*0.26+col*(bw+T*0.04),cy+T*0.06-row*(bw+T*0.04),bw,bw,2);ctx.fill();
      }
      ctx.globalAlpha=1;
      outArrow(cx,cy,c.dir,T,COL['green-deep']);
    } else if(c.kind==='shipping'){
      const glow=c.glow||0;
      const [sx,sy,T,cx,cy]=machinePanel(c,COL['green-deep'],null);
      if(glow>0){ctx.save();ctx.globalAlpha=glow*0.6;ctx.fillStyle=COL['green'];rrect(sx+1,sy+1,T-2,T-2,10);ctx.fill();ctx.restore();}
      // box icon
      ctx.fillStyle=lighten(COL['green-deep'],0.5);
      rrectP(ctx,cx-T*0.16,cy-T*0.16,T*0.32,T*0.3,3);ctx.fill();
      ctx.strokeStyle=COL['green-deep'];ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(cx,cy-T*0.16);ctx.lineTo(cx,cy+T*0.14);ctx.stroke();
      // outgoing chevrons
      ctx.save();ctx.translate(cx,cy);ctx.rotate(dirAngle(c.dir));
      ctx.strokeStyle=COL['mint'];ctx.lineWidth=T*0.05;ctx.lineCap='round';
      const ph=(now*0.002)%1;
      for(let i=0;i<2;i++){const o=T*0.24+i*T*0.1+ph*T*0.08;
        ctx.globalAlpha=0.8-i*0.3;ctx.beginPath();
        ctx.moveTo(o-T*0.06,-T*0.08);ctx.lineTo(o+T*0.02,0);ctx.lineTo(o-T*0.06,T*0.08);ctx.stroke();}
      ctx.globalAlpha=1;ctx.restore();
    }
  }

  function drawGhost(){
    const [sx,sy]=t2s(hover.x,hover.y),T=cam.tile;
    const placeable = SIM.canPlace(hover.x,hover.y,tool) && !SIM.cellAt(hover.x,hover.y);
    const afford = SIM.canAfford(tool);
    const ok = tool==='delete' ? !!SIM.cellAt(hover.x,hover.y) : (placeable && afford);
    ctx.save();ctx.globalAlpha=0.55;
    rrect(sx+4,sy+4,T-8,T-8,9);
    ctx.fillStyle=ok?(tool==='delete'?'rgba(214,96,74,.25)':COL['green-soft']):'rgba(214,96,74,.22)';
    ctx.fill();
    ctx.setLineDash([5,4]);ctx.lineWidth=2;
    ctx.strokeStyle=ok?(tool==='delete'?COL['danger']:COL['green']):COL['danger'];
    rrect(sx+4,sy+4,T-8,T-8,9);ctx.stroke();ctx.setLineDash([]);
    if(ok&&tool!=='delete'){
      // direction arrow hint for directional tools
      if(tool!=='select'){outArrow(sx+T/2,sy+T/2,ghostDir,T,COL['green']);}
    }
    ctx.globalAlpha=1;
    // cost / can't-afford label
    if(tool!=='delete'&&SIM.S.economy){
      const c=SIM.cost(tool);
      ctx.font=`700 ${Math.round(T*0.2)}px var(--font-disp)`;ctx.textAlign='center';
      ctx.fillStyle=afford?COL['ink-2']:COL['danger'];
      ctx.fillText((afford?'$':'need $')+c, sx+T/2, sy+T-7);
    }
    ctx.restore();
  }

  /* ---------- input ---------- */
  function evtTile(e){
    const rect=canvas.getBoundingClientRect();
    return s2t(e.clientX-rect.left, e.clientY-rect.top);
  }
  function applyAt(x,y,btn){
    if(!SIM.inB(x,y))return;
    if(tool==='delete'||btn===2){SIM.remove(x,y);return;}
    if(tool==='select')return;
    if(SIM.cellAt(x,y)&&tool!=='belt'){return;}
    if(tool==='belt'){
      if(SIM.cellAt(x,y)&&SIM.cellAt(x,y).kind!=='belt')return;
      if(!SIM.cellAt(x,y))SIM.place(x,y,'belt',ghostDir);
    } else {
      SIM.place(x,y,tool,ghostDir);
    }
  }
  function onDown(e){
    const [x,y]=evtTile(e); if(!SIM.inB(x,y))return;
    lastButton=e.button;
    if(tool==='select'&&e.button===0){
      const c=SIM.cellAt(x,y);
      if(c&&c.kind==='assembler'){
        const rect=canvas.getBoundingClientRect();const [sx,sy]=t2s(x,y);
        if(window.openRecipePopover)window.openRecipePopover(x,y,rect.left+sx+cam.tile,rect.top+sy);
      } else if(c){ SIM.setDir(x,y,(c.dir+1)%4); }
      return;
    }
    painting=true; lastTile={x,y};
    applyAt(x,y,e.button);
  }
  function onMove(e){
    const [x,y]=evtTile(e);
    hover=SIM.inB(x,y)?{x,y}:null;
    if(!painting||!hover)return;
    if(lastTile&&(x!==lastTile.x||y!==lastTile.y)){
      if(tool==='belt'&&lastButton===0){
        const dx=x-lastTile.x,dy=y-lastTile.y;
        if(Math.abs(dx)+Math.abs(dy)===1){
          const nd=dx===1?1:dx===-1?3:dy===1?2:0;
          ghostDir=nd;
          const prev=SIM.cellAt(lastTile.x,lastTile.y);
          if(prev&&prev.kind==='belt')prev.dir=nd;
          if(!SIM.cellAt(x,y))SIM.place(x,y,'belt',nd);
          else if(SIM.cellAt(x,y).kind==='belt')SIM.cellAt(x,y).dir=nd;
        }
      } else {
        applyAt(x,y,lastButton);
      }
      lastTile={x,y};
    }
  }
  function onUp(){painting=false;lastTile=null;}
  function onLeave(){hover=null;painting=false;lastTile=null;}

  function setTool(t){tool=t;}
  function getTool(){return tool;}
  function rotate(){ghostDir=(ghostDir+1)%4; if(hover){const c=SIM.cellAt(hover.x,hover.y);if(c&&tool==='select')SIM.setDir(hover.x,hover.y,(c.dir+1)%4);}}

  function init(cv,opts){
    opts=opts||{};
    if(!cv)return;
    canvas=cv;ctx=canvas.getContext('2d');
    refreshColors();
    if(window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement||canvas);
    else window.addEventListener('resize',resize);
    if(window.GLOBERT_PIXI&&window.GLOBERT_PIXI.createFloorLayer){
      window.GLOBERT_PIXI.createFloorLayer({stage:canvas.parentElement||canvas}).then(layer=>{
        pixiLayer=layer;
        resize();
      }).catch(()=>{pixiLayer=null;});
    }
    resize();
    if(opts.static)return;          // preview mode: render only, no input
    canvas.addEventListener('pointerdown',onDown);
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
    canvas.addEventListener('pointerleave',onLeave);
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }

  window.FLOOR={init,render,resize,refreshColors,setTool,getTool,rotate,visual,drawResource,popCash,
    get ghostDir(){return ghostDir;}, set ghostDir(v){ghostDir=v;}};
})();
