/* ===========================================================
   main.js — Globert boot, demo factory, game loop, wiring.
   Exposes window.GLOBERT (used by tweaks island + HUD).
   =========================================================== */
(function(){
  const BASE_INTERVAL=420;       // ms per sim step at beltSpeed 1
  const SAVE_KEY='globert_save_v1';
  const PREFS_KEY='globert_prefs_v1';
  let acc=0,last=performance.now(),lastUI=0,lastSave=0,view='floor';
  let paused=false,speedMul=1,simClock=0;

  /* ---------- demo factory (placed for free) ---------- */
  function buildDemo(){
    for(let y=0;y<SIM.S.N;y++)for(let x=0;x<SIM.S.N;x++)SIM.remove(x,y,true);
    const N=SIM.S.N;
    const P=(x,y,k,d)=>SIM.place(x,y,k,d,true);
    if(N<12){ buildMini(P); return; }
    // plate feeder (top-left deposit)
    P(1,2,'extractor',1);
    P(2,2,'belt',1); P(3,2,'belt',1);
    P(4,2,'assembler',2);
    P(4,3,'belt',2); P(4,4,'storage',2); P(4,5,'belt',2);
    P(4,6,'belt',1); P(5,6,'belt',1);
    // gear feeder (top-right deposit)
    P(10,2,'extractor',3);
    P(9,2,'belt',3); P(8,2,'belt',3);
    P(7,2,'assembler',2);
    P(7,3,'belt',2); P(7,4,'belt',2);
    P(7,5,'assembler',3);
    P(6,5,'belt',2);
    // final assembler + ship
    P(6,6,'assembler',2);
    P(6,7,'belt',2);
    P(6,8,'shipping',2);
    SIM.setRecipe(4,2,'smelt');
    SIM.setRecipe(7,2,'smelt');
    SIM.setRecipe(7,5,'press');
    SIM.setRecipe(6,6,'assemble');
  }
  function buildMini(P){
    P(1,2,'extractor',1);P(2,2,'belt',1);P(3,2,'assembler',1);SIM.setRecipe(3,2,'smelt');
    P(4,2,'belt',1);P(5,2,'assembler',1);SIM.setRecipe(5,2,'assemble');
    P(6,2,'belt',1);P(7,2,'shipping',1);
  }
  function clearFloor(){ for(let y=0;y<SIM.S.N;y++)for(let x=0;x<SIM.S.N;x++)SIM.remove(x,y,true); }

  /* ---------- save / load ---------- */
  function saveGame(){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify({sim:SIM.serialize(), erp:ERP.dump()})); }catch(e){}
  }
  function loadGame(){
    try{
      const d=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!d||!d.sim)return false;
      if(!SIM.deserialize(d.sim))return false;
      if(d.erp)ERP.restore(d.erp);
      return true;
    }catch(e){return false;}
  }
  function loadPrefs(){
    try{ return JSON.parse(localStorage.getItem(PREFS_KEY))||{}; }catch(e){ return {}; }
  }

  /* ---------- loop ---------- */
  function loop(now){
    let dt=now-last; last=now; if(dt>500)dt=500;
    const interval=BASE_INTERVAL/((FLOOR.visual.beltSpeed*speedMul)||1);
    if(!paused){
      acc+=dt; simClock+=dt*speedMul;
      let g=0; while(acc>=interval && g<10){ SIM.step(); acc-=interval; g++; }
      ERP.tick(now);
      if(window.LEVELS)LEVELS.tick(now);
      if(window.ADVENTURE)ADVENTURE.tick(now);
    }
    const frac=paused?0:Math.min(1,acc/interval);
    if(view==='floor')FLOOR.render(frac,simClock);
    if(now-lastUI>180){
      ERP.renderSidebar(now);
      if(view==='office')ERP.renderOffice(now);
      lastUI=now;
    }
    if(now-lastSave>2500){ saveGame(); lastSave=now; }
    requestAnimationFrame(loop);
  }

  /* ---------- tools / view ---------- */
  const TOOL_NAME={select:'Select',extractor:'Extractor',belt:'Conveyor',assembler:'Assembler',storage:'Storage',shipping:'Shipping',delete:'Demolish'};
  function selectTool(t){
    FLOOR.setTool(t);
    document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));
    document.getElementById('curTool').textContent=TOOL_NAME[t]||t;
  }
  function setView(v){
    view=v;
    document.querySelectorAll('#viewToggle button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
    document.getElementById('stage').classList.toggle('hide',v!=='floor');
    document.getElementById('sidebar').classList.toggle('hide',v!=='floor');
    document.getElementById('office').classList.toggle('show',v==='office');
    if(v==='floor')requestAnimationFrame(()=>FLOOR.resize());
  }
  function setSpeed(v){
    if(v===0){paused=true;}
    else{paused=false;speedMul=v;}
    document.querySelectorAll('#timehud button').forEach(b=>{
      const bv=+b.dataset.spd;
      b.classList.toggle('active', v===0 ? bv===0 : (!paused&&bv===speedMul));
    });
  }

  /* ---------- tweaks ---------- */
  const PALETTES={
    Paper:{'--paper':'#eef1ec','--panel':'#ffffff','--panel-2':'#f6f8f5'},
    Cream:{'--paper':'#efe9df','--panel':'#fffdf8','--panel-2':'#f6f1e7'},
    Slate:{'--paper':'#e6eaee','--panel':'#ffffff','--panel-2':'#f1f4f7'}
  };
  function setTweak(key,val){
    if(key==='beltSpeed')FLOOR.visual.beltSpeed=val;
    else if(key==='lowPoly')FLOOR.visual.lowPoly=val;
    else if(key==='ambient')FLOOR.visual.ambient=val;
    else if(key==='mode'){ SIM.S.economy=(val!=='Sandbox'); document.body.classList.toggle('sandbox',val==='Sandbox'); }
    else if(key==='palette'){
      const p=PALETTES[val]||PALETTES.Paper;
      Object.entries(p).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
      FLOOR.refreshColors();
    }
    else if(key==='gridSize'){
      if(val===SIM.S.N)return;
      SIM.initWorld(val); buildDemo(); ERP.resetDisp();
      FLOOR.refreshColors(); FLOOR.resize();
    }
  }

  /* ---------- boot ---------- */
  function boot(){
    let loaded=false;
    try{ loaded=loadGame(); }catch(e){}
    if(!loaded){ SIM.initWorld(12); buildDemo(); }

    FLOOR.init(document.getElementById('floor'));
    const prefs=loadPrefs();
    ['mode','palette','beltSpeed','lowPoly','ambient'].forEach(k=>{
      if(prefs[k]!=null)setTweak(k,prefs[k]);
    });
    SIM.S.onShipFx=(x,y,amt)=>FLOOR.popCash(x,y,amt);
    ERP.buildInv();
    ERP.resetDisp();
    if(window.LEVELS)LEVELS.init();
    if(window.ADVENTURE)ADVENTURE.init();
    if(window.TUTORIAL)TUTORIAL.init();
    if(window.RELEASE)RELEASE.wire();

    // toolbar — append costs to tooltips
    document.querySelectorAll('.tool[data-tool]').forEach(b=>{
      b.addEventListener('click',()=>selectTool(b.dataset.tool));
      const c=SIM.COSTS[b.dataset.tool], tip=b.querySelector('.tool-tip');
      if(c&&tip)tip.insertAdjacentHTML('beforeend',` · <b>$${c}</b>`);
    });
    document.getElementById('btnDemo').addEventListener('click',()=>{buildDemo();ERP.toast('Starter factory rebuilt','');});
    document.getElementById('btnClear').addEventListener('click',()=>{clearFloor();ERP.toast('Floor cleared','');});
    document.querySelectorAll('#viewToggle button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
    document.querySelectorAll('#timehud button').forEach(b=>b.addEventListener('click',()=>setSpeed(+b.dataset.spd)));

    // keys
    const KEY={v:'select',e:'extractor',b:'belt',a:'assembler',s:'storage',d:'shipping',x:'delete'};
    window.addEventListener('keydown',ev=>{
      if(ev.target.tagName==='INPUT'||ev.target.tagName==='TEXTAREA')return;
      const k=ev.key.toLowerCase();
      if(k==='r'){FLOOR.rotate();ev.preventDefault();}
      else if(k==='escape')selectTool('select');
      else if(k===' '){ev.preventDefault();setSpeed(paused?1:0);}
      else if(KEY[k])selectTool(KEY[k]);
      else if(k==='tab'){ev.preventDefault();setView(view==='floor'?'office':'floor');}
    });

    requestAnimationFrame(loop);
  }

  window.GLOBERT={setTweak,setSpeed,buildDemo,clearFloor,selectTool,setView,saveGame};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
