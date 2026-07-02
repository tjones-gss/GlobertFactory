/* ===========================================================
   adventure.js — Shift Skirmish mode.
   Timed contracts add replayable pressure on top of the factory.
   Exposes window.ADVENTURE.
   =========================================================== */
(function(){
  const KEY='globert_adventure_v1';
  const A={active:null, completed:0, wins:0, losses:0, streak:0, bestStreak:0, score:0, grades:{S:0,A:0,B:0,C:0}, lastResult:null};
  let lastSave=0,lastRender=0,audioCtx=null,audioUnlocked=false;
  window.addEventListener('pointerdown',()=>{audioUnlocked=true;},{once:true});
  window.addEventListener('keydown',()=>{audioUnlocked=true;},{once:true});

  const RUNS=[
    {
      id:'hot-order', title:'Hot order', tag:'Rush',
      blurb:'A customer needs a small batch right now. Clear the rush orders before the timers bite.',
      goal:'Ship 12 Widgets', reward:900, seconds:95, target:12,
      metric:()=>SIM.S.shipped,
      seed:()=>{ ERP.enqueueOrder(4,46000,'Vantage Assembly','Rush'); ERP.enqueueOrder(4,62000,'Arclight Mfg','Rush'); ERP.enqueueOrder(4,78000,'Bright Forge Co','Rush'); }
    },
    {
      id:'throughput-trial', title:'Throughput trial', tag:'Flow',
      blurb:'Prove the line can warm up and stay moving. Peak widgets per minute is the whole fight.',
      goal:'Reach 10 Widgets / min', reward:1200, seconds:120,
      metric:()=>SIM.throughput(), target:10,
      seed:()=>{ ERP.enqueueOrder(8,82000,'Meridian Works','Flow'); ERP.enqueueOrder(8,112000,'Kepler Machining','Flow'); }
    },
    {
      id:'lean-sprint', title:'Lean sprint', tag:'Lean',
      blurb:'Ship fast without burying the floor in inventory. Keep work-in-progress under control.',
      goal:'Ship 18 Widgets with WIP under 42', reward:1500, seconds:130,
      metric:()=>SIM.S.shipped, target:18, fail:()=>SIM.wip()>42, failText:'WIP limit exceeded',
      seed:()=>{ ERP.enqueueOrder(6,72000,'Northbay Tooling','Lean'); ERP.enqueueOrder(6,96000,'Ostrander Parts','Lean'); ERP.enqueueOrder(6,122000,'Riverside Fab','Lean'); }
    },
    {
      id:'cash-crunch', title:'Cash crunch', tag:'Cash',
      blurb:'Turn the existing line into money. Every shipped Widget matters, and the clock is stingy.',
      goal:'Earn $1,800 from shipped Widgets', reward:1350, seconds:115, target:1800,
      metric:()=>SIM.S.cash,
      seed:()=>{ ERP.enqueueOrder(10,96000,'Cedar & Volt','Cash'); ERP.enqueueOrder(10,118000,'Halewood Industrial','Cash'); }
    },
    {
      id:'machine-swarm', title:'Machine swarm', tag:'Scale',
      blurb:'Bring a busy cell online. This rewards clean branching and a floor that can actually feed itself.',
      goal:'Run 8 active machines at once', reward:1700, seconds:125, target:8, absolute:true,
      metric:()=>ERP.maxActive||0,
      seed:()=>{ ERP.enqueueOrder(12,112000,'Riverside Fab','Scale'); }
    },
    {
      id:'perfect-dock', title:'Perfect dock', tag:'Audit',
      blurb:'Auditors are watching the dock. Ship every skirmish order on time or lose the streak.',
      goal:'Complete 3 audit orders on time', reward:1900, seconds:145, target:3,
      metric:()=>ERP.onTime||0,
      fail:()=>ERP.orders.some(o=>o.label==='Audit'&&o.done&&o.late),
      failText:'audit order shipped late',
      seed:()=>{ ERP.enqueueOrder(4,62000,'Kepler Machining','Audit'); ERP.enqueueOrder(5,92000,'Meridian Works','Audit'); ERP.enqueueOrder(5,122000,'Bright Forge Co','Audit'); }
    }
  ];

  function load(){
    try{
      const d=JSON.parse(localStorage.getItem(KEY));
      if(d)Object.assign(A,d,{active:null,lastResult:null,grades:Object.assign(A.grades,d.grades||{})});
    }catch(e){}
  }
  function save(){
    try{ localStorage.setItem(KEY,JSON.stringify({v:2,completed:A.completed,wins:A.wins,losses:A.losses,streak:A.streak,bestStreak:A.bestStreak,score:A.score,grades:A.grades})); }catch(e){}
  }
  function fmtTime(ms){
    const s=Math.max(0,Math.ceil(ms/1000));
    return s>=60?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:`0:${String(s).padStart(2,'0')}`;
  }
  function runById(id){ return RUNS.find(r=>r.id===id); }
  function currentValue(run){
    if(!run)return 0;
    const base=A.active?A.active.base:0;
    if(run.id==='throughput-trial'||run.absolute)return run.metric();
    return Math.max(0,run.metric()-base);
  }
  function target(run){ return run.target||Number((run.goal.match(/\d+/)||[1])[0])||1; }
  function tone(kind){
    try{
      if(!audioUnlocked)return;
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      const notes=kind==='win'?[523,659,784]:kind==='fail'?[220,174]:[392,523];
      notes.forEach((hz,i)=>{
        const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
        osc.type='triangle'; osc.frequency.value=hz;
        gain.gain.setValueAtTime(0.0001,audioCtx.currentTime+i*0.08);
        gain.gain.exponentialRampToValueAtTime(0.035,audioCtx.currentTime+i*0.08+0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+i*0.08+0.16);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(audioCtx.currentTime+i*0.08); osc.stop(audioCtx.currentTime+i*0.08+0.18);
      });
    }catch(e){}
  }
  function start(id){
    if(A.active)return;
    const run=runById(id); if(!run)return;
    const now=performance.now();
    A.active={id,start:now,deadline:now+run.seconds*1000,base:run.metric(),ordersBefore:ERP.completed||0};
    if(run.seed)run.seed();
    if(window.ERP)ERP.toast(`Skirmish started · <b>${run.title}</b>`,'');
    tone('start');
    render();
  }
  function gradeFor(run,win,elapsed,left){
    if(!win)return 'C';
    const pace=left/(run.seconds*1000);
    if(pace>=0.45)return 'S';
    if(pace>=0.25)return 'A';
    if(pace>=0.08)return 'B';
    return 'C';
  }
  function finish(win,reason){
    const active=A.active, run=runById(active&&active.id); if(!run)return;
    const now=performance.now();
    const elapsed=now-active.start, left=Math.max(0,active.deadline-now);
    const grade=gradeFor(run,win,elapsed,left);
    A.completed++;
    const result={win,reason:reason||'',run:run.title,tag:run.tag,grade,elapsed:fmtTime(elapsed),left:fmtTime(left),reward:0,streak:A.streak};
    if(win){
      const gradeMult={S:1.35,A:1.18,B:1.05,C:1}[grade]||1;
      const bonus=Math.round(run.reward*gradeMult*(1+Math.min(A.streak,5)*0.12));
      A.wins++; A.streak++; A.bestStreak=Math.max(A.bestStreak,A.streak);
      A.grades[grade]=(A.grades[grade]||0)+1;
      A.score+=bonus; SIM.S.cash+=bonus;
      result.reward=bonus; result.streak=A.streak;
      if(window.ERP&&ERP.resetDisp)ERP.resetDisp();
      if(window.ERP)ERP.toast(`Grade ${grade} skirmish · <b>+$${bonus.toLocaleString()}</b>`,'cash');
      tone('win');
    }else{
      A.losses++; A.streak=0;
      if(window.ERP)ERP.toast(`Skirmish failed · ${reason||'time expired'}`,'');
      tone('fail');
    }
    A.lastResult=result;
    A.active=null;
    save(); render(); showResult(result);
  }
  function tick(now){
    if(!A.active)return;
    const run=runById(A.active.id);
    if(!run){A.active=null;return;}
    if(run.fail&&run.fail())finish(false,run.failText||'constraint failed');
    else if(currentValue(run)>=target(run))finish(true);
    else if(now>=A.active.deadline)finish(false,'time expired');
    if(now-lastSave>4000){save();lastSave=now;}
    if(now-lastRender>250){render();lastRender=now;}
  }
  function panelHtml(){
    if(A.active){
      const run=runById(A.active.id), val=currentValue(run), tgt=target(run);
      const left=A.active.deadline-performance.now();
      const pct=Math.min(100,Math.round(val/tgt*100));
      return `<div class="skirmish active-run">
        <div class="sk-top"><span class="sk-tag">${run.tag}</span><span class="sk-time num">${fmtTime(left)}</span></div>
        <h4>${run.title}</h4>
        <p>${run.goal}</p>
        <div class="bar sk-bar"><span style="width:${pct}%"></span></div>
        <div class="sk-foot"><span class="num">${Math.min(val,tgt).toLocaleString()} / ${tgt.toLocaleString()}</span><span>+$${run.reward.toLocaleString()}</span></div>
      </div>`;
    }
    return `<div class="sk-summary">
        <span><b class="num">${A.streak}</b> streak</span>
        <span><b class="num">${A.bestStreak}</b> best</span>
        <span><b class="num">$${A.score.toLocaleString()}</b> won</span>
      </div>
      <div class="sk-grade-strip"><span>S ${A.grades.S||0}</span><span>A ${A.grades.A||0}</span><span>B ${A.grades.B||0}</span></div>
      <div class="sk-list">${RUNS.map(r=>`<button class="skirmish" data-run="${r.id}">
        <span class="sk-tag">${r.tag}</span>
        <h4>${r.title}</h4>
        <p>${r.blurb}</p>
        <span class="sk-reward">+$${r.reward.toLocaleString()} · ${Math.round(r.seconds/60)} min</span>
      </button>`).join('')}</div>`;
  }
  function wire(el){
    el.querySelectorAll('[data-run]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.run)));
  }
  function render(){
    const html=panelHtml();
    ['adventurePanel','adventureOffice'].forEach(id=>{
      const el=document.getElementById(id); if(!el)return;
      el.innerHTML=html; wire(el);
    });
  }
  function showResult(result){
    let overlay=document.getElementById('skResult');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='skResult'; overlay.className='sk-result-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML=`<div class="sk-ticket ${result.win?'win':'fail'}">
      <div class="sk-ticket-top"><span>${result.tag}</span><b>${result.win?'Complete':'Failed'}</b></div>
      <div class="sk-stamp">${result.win?result.grade:'X'}</div>
      <h2>${result.run}</h2>
      <p>${result.win?'Shift ticket stamped. Keep the streak hot.':result.reason}</p>
      <div class="sk-ticket-grid">
        <span><b>${result.elapsed}</b> elapsed</span>
        <span><b>${result.left}</b> left</span>
        <span><b>${result.streak}</b> streak</span>
        <span><b>$${result.reward.toLocaleString()}</b> bonus</span>
      </div>
      <button class="promo-btn" id="skResultClose">Back to the floor</button>
    </div>`;
    overlay.classList.add('show');
    document.getElementById('skResultClose').onclick=()=>overlay.classList.remove('show');
  }
  function init(){ load(); render(); }

  window.ADVENTURE={init,tick,render,start,
    get runs(){return RUNS.map(r=>({id:r.id,title:r.title,tag:r.tag,goal:r.goal,reward:r.reward,seconds:r.seconds,target:r.target}));},
    get active(){return A.active;}, get streak(){return A.streak;},
    get bestStreak(){return A.bestStreak;}, get wins(){return A.wins;},
    get grades(){return A.grades;}, get score(){return A.score;}};
})();
