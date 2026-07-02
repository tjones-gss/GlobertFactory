/* ===========================================================
   home.js — Globert start screen.
   Reads saves, runs a live shop-floor preview with the real
   renderer, and builds the career roadmap, record + settings.
   =========================================================== */
(function(){
  const $=s=>document.querySelector(s);
  const SAVE_KEY='globert_save_v1';
  const LEVELS_KEY='globert_levels_v1';
  const PREFS_KEY='globert_prefs_v1';

  const PREF_DEFAULTS={mode:'Career',palette:'Paper',beltSpeed:1,lowPoly:0.65,ambient:'day',gridSize:12};
  const PALETTES={
    Paper:{'--paper':'#eef1ec','--panel':'#ffffff','--panel-2':'#f6f8f5'},
    Cream:{'--paper':'#efe9df','--panel':'#fffdf8','--panel-2':'#f6f1e7'},
    Slate:{'--paper':'#e6eaee','--panel':'#ffffff','--panel-2':'#f1f4f7'}
  };

  function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }

  const save=readJSON(SAVE_KEY);
  const levels=readJSON(LEVELS_KEY);
  const prefs=Object.assign({}, PREF_DEFAULTS, readJSON(PREFS_KEY)||{});
  const best=(levels&&levels.best)||{};
  const done=(levels&&levels.done)||[];
  const hasSave=!!(save&&save.sim&&Array.isArray(save.sim.cells)&&save.sim.cells.length);

  /* ---------- helpers ---------- */
  function fmt(n){ return Number(n||0).toLocaleString(); }
  function currentIndex(){
    for(let i=0;i<CHAPTERS.length;i++){ if(!done.includes(CHAPTERS[i].id))return i; }
    return CHAPTERS.length;
  }
  function currentRank(){
    const c=currentIndex();
    if(c>=CHAPTERS.length)return CAREER_TOP;
    return c===0?'New Hire':CHAPTERS[c-1].rank;
  }

  /* ---------- mascots ---------- */
  $('#heroMascot').innerHTML=globertMascot({size:128});
  $('#ctaMascot').innerHTML=globertMascot({size:120});

  /* ---------- play buttons ---------- */
  const playLabel = hasSave ? 'Continue your shift' : 'Start your shift';
  $('#heroPlayLabel').textContent=playLabel;
  $('#ctaPlayLabel').textContent=playLabel;
  $('#navPlay').lastChild.textContent=hasSave?' Continue':' Open the floor';

  /* ---------- hero trust row ---------- */
  const shippedAll = hasSave ? (save.sim.shipped||0) : (best.shipped||0);
  const trust = hasSave ? [
    {v:fmt(shippedAll), l:'Widgets shipped'},
    {v:(best.tpmPeak||0)+'/min', l:'Peak throughput'},
    {v:(best.onTime!=null?best.onTime:100)+'%', l:'On-time delivery'}
  ] : [
    {v:'8', l:'Chapters to clear'},
    {v:'6', l:'Machine types'},
    {v:'∞', l:'Sandbox runs'}
  ];
  $('#heroTrust').innerHTML=trust.map(t=>
    `<div class="trust-item"><div class="tv num">${t.v}</div><div class="tl">${t.l}</div></div>`).join('');

  /* ---------- how-it-works loop ---------- */
  function resIcon(type,px){
    FLOOR.refreshColors();
    const c=document.createElement('canvas');
    const d=Math.min(window.devicePixelRatio||1,2);
    c.width=px*d;c.height=px*d;c.style.width=px+'px';c.style.height=px+'px';
    const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);
    FLOOR.drawResource(g,type,px/2,px/2,px*0.86);
    return c;
  }
  const SHIP_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>`;
  const STEPS=[
    {res:'ore',   h:'Mine',     p:'Drop an extractor on an ore deposit and let it dig.'},
    {res:'plate', h:'Smelt',    p:'An assembler running the furnace recipe turns ore into plate.'},
    {res:'gear',  h:'Press',    p:'Press two plates into a gear — the trickier sub-part.'},
    {res:'widget',h:'Assemble', p:'Combine a plate and a gear into a finished Widget.'},
    {svg:SHIP_SVG,h:'Ship',     p:'Route Widgets to the dock. Each one ships for instant cash.'}
  ];
  const arrow=`<div class="loop-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6l6 6-6 6"/></svg></div>`;
  const loopEl=$('#loop');
  STEPS.forEach((s,i)=>{
    const step=document.createElement('div');
    step.className='loop-step';
    const ico=document.createElement('div');ico.className='loop-ico';
    if(s.res)ico.appendChild(resIcon(s.res,34)); else ico.innerHTML=s.svg;
    step.appendChild(ico);
    step.insertAdjacentHTML('beforeend',`<h4>${s.h}</h4><p>${s.p}</p>`);
    loopEl.appendChild(step);
    if(i<STEPS.length-1)loopEl.insertAdjacentHTML('beforeend',arrow);
  });

  /* ---------- career roadmap ---------- */
  const cur=currentIndex();
  const check=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>`;
  const dotic=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
  const lockic=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
  $('#chapterGrid').innerHTML=CHAPTERS.map((ch,i)=>{
    const isDone=i<cur, isCur=i===cur, isLock=i>cur;
    const cls=isDone?'done':isCur?'cur':'locked';
    const status=isDone?`<span class="chap-status s-done">Cleared</span>`
                 :isCur?`<span class="chap-status s-cur">In progress</span>`
                 :`<span class="chap-status s-lock">Locked</span>`;
    const goals=ch.goals.map(g=>`<li>${isDone?check:dotic}<span>${g.label}</span></li>`).join('');
    const foot=isLock
      ? `<span class="chap-reward">+$${fmt(ch.reward)}</span><span class="chap-lockico">${lockic}</span>`
      : `<span class="chap-reward">+$${fmt(ch.reward)}</span><a class="btn-link" href="Globert Factory.html">${isDone?'Revisit':'Resume'}
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M5 12h14m-6-6l6 6-6 6"/></svg></a>`;
    return `<div class="chap ${cls}">
        <div class="chap-top">
          <span class="chap-badge">${isDone?check:ch.n}</span>
          ${status}
        </div>
        <h4>${ch.name}</h4>
        <div class="rank">${ch.rank}</div>
        <p class="blurb">${ch.blurb}</p>
        <ul class="goals">${goals}</ul>
        <div class="chap-foot">${foot}</div>
      </div>`;
  }).join('');

  /* ---------- stats / record ---------- */
  const sb=$('#statsBlock');
  if(hasSave||best.shipped){
    const iCash=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
    const iTpm=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 5-7"/></svg>`;
    const iOn=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>`;
    const iShip=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>`;
    const cash = hasSave ? (save.sim.cash||0) : (best.cash||0);
    const cards=[
      {ic:iCash,l:'Cash on hand',v:'$'+fmt(Math.round(cash)),m:'Reinvest it in machines'},
      {ic:iTpm, l:'Peak throughput',v:fmt(best.tpmPeak||0),m:'Widgets / min record'},
      {ic:iOn,  l:'On-time delivery',v:(best.onTime!=null?best.onTime:100)+'%',m:fmt(best.ordersDone||0)+' orders shipped'},
      {ic:iShip,l:'Widgets shipped',v:fmt(shippedAll),m:'Lifetime, all shifts'}
    ];
    sb.className='stats';
    sb.innerHTML=cards.map(c=>
      `<div class="stat"><div class="sl">${c.ic}${c.l}</div><div class="sv">${c.v}</div><div class="sm">${c.m}</div></div>`).join('');
  }else{
    sb.className='';
    sb.innerHTML=`<div class="stats-empty">
        <div class="se-rank">Current rank · ${currentRank()}</div>
        <p>No shifts on the clock yet. Open the floor, ship your first Widget, and your record starts filling in right here.</p>
        <div style="margin-top:18px"><a class="btn btn-dark btn-md" href="Globert Factory.html">Clock in →</a></div>
      </div>`;
  }

  /* ---------- settings ---------- */
  function savePrefs(){ try{ localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(e){} }
  function seg(key,opts){
    return `<div class="seg" data-key="${key}">`+opts.map(o=>
      `<button data-val="${o}" class="${String(prefs[key])===String(o)?'on':''}">${o}</button>`).join('')+`</div>`;
  }
  $('#settingsCard').innerHTML=`
    <div class="set-row">
      <div class="set-lbl"><b>Mode</b></div>
      ${seg('mode',['Career','Sandbox'])}
    </div>
    <div class="set-row">
      <div class="set-lbl"><b>Belt speed</b><span class="set-val" id="bsVal">${prefs.beltSpeed}×</span></div>
      <input type="range" id="beltSpeed" min="0.4" max="2.5" step="0.1" value="${prefs.beltSpeed}">
    </div>
    <div class="set-row">
      <div class="set-lbl"><b>Factory size</b></div>
      ${seg('gridSize',[10,12,16])}
    </div>
    <div class="set-row">
      <div class="set-lbl"><b>Ambient</b></div>
      ${seg('ambient',['day','dusk','night'])}
    </div>
    <div class="set-row">
      <div class="set-lbl"><b>Palette</b></div>
      ${seg('palette',['Paper','Cream','Slate'])}
    </div>
    <div class="set-row">
      <div class="set-lbl"><b>Reset save</b></div>
      <button class="btn btn-ghost btn-md" id="resetBtn" style="justify-content:center">Wipe floor &amp; career</button>
    </div>
    <p class="set-note">Settings apply the next time you open the floor. ${prefs.mode==='Sandbox'?'Sandbox mode gives you unlimited cash.':''}</p>`;

  $('#settingsCard').querySelectorAll('.seg').forEach(s=>{
    s.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b)return;
      const key=s.dataset.key; let val=b.dataset.val;
      if(key==='gridSize')val=Number(val);
      prefs[key]=val; savePrefs();
      s.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
      if(key==='palette')applyPreviewPalette();
    });
  });
  const bs=$('#beltSpeed');
  bs.addEventListener('input',()=>{ prefs.beltSpeed=Number(bs.value); $('#bsVal').textContent=prefs.beltSpeed+'×'; savePrefs(); FLOOR.visual.beltSpeed=prefs.beltSpeed; });
  $('#resetBtn').addEventListener('click',()=>{
    if(confirm('Wipe your factory and career progress? This cannot be undone.')){
      try{ localStorage.removeItem(SAVE_KEY); localStorage.removeItem(LEVELS_KEY); }catch(e){}
      location.reload();
    }
  });

  /* ---------- live preview (real renderer) ---------- */
  function applyPreviewPalette(){
    // keep the page on Paper; only nudge the board panel via FLOOR colors
    FLOOR.refreshColors();
  }
  function buildPreviewDemo(){
    const N=SIM.S.N;
    const P=(x,y,k,d)=>SIM.place(x,y,k,d,true);
    P(1,2,'extractor',1); P(2,2,'belt',1); P(3,2,'belt',1);
    P(4,2,'assembler',2); SIM.setRecipe(4,2,'smelt');
    P(4,3,'belt',2); P(4,4,'storage',2); P(4,5,'belt',2);
    P(4,6,'belt',1); P(5,6,'belt',1);
    P(10,2,'extractor',3); P(9,2,'belt',3); P(8,2,'belt',3);
    P(7,2,'assembler',2); SIM.setRecipe(7,2,'smelt');
    P(7,3,'belt',2); P(7,4,'belt',2);
    P(7,5,'assembler',3); SIM.setRecipe(7,5,'press'); P(6,5,'belt',2);
    P(6,6,'assembler',2); SIM.setRecipe(6,6,'assemble');
    P(6,7,'belt',2); P(6,8,'shipping',2);
  }

  SIM.initWorld(12);
  buildPreviewDemo();
  const cv=$('#previewCanvas');
  FLOOR.visual.beltSpeed=prefs.beltSpeed||1;
  FLOOR.init(cv,{static:true});
  SIM.S.onShipFx=(x,y,amt)=>FLOOR.popCash(x,y,amt);

  const BASE=420; let acc=0,last=performance.now(),simClock=0,lastChip=0;
  function loop(now){
    let dt=now-last; last=now; if(dt>500)dt=500;
    const interval=BASE/((FLOOR.visual.beltSpeed)||1);
    acc+=dt; simClock+=dt;
    let g=0; while(acc>=interval && g<8){ SIM.step(); acc-=interval; g++; }
    FLOOR.render(Math.min(1,acc/interval),simClock);
    if(now-lastChip>250){
      $('#pvRate').textContent=SIM.throughput();
      $('#pvShip').textContent=fmt(SIM.S.shipped);
      lastChip=now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
