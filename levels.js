/* ===========================================================
   levels.js — Globert career / game-loop layer.
   Objectives -> reward -> promotion (level up) -> next challenge.
   Owns the sidebar "Career" panel + the promotion overlay, and
   persists progress to localStorage (read by the homepage).
   Exposes window.LEVELS.
   =========================================================== */
(function(){
  const KEY='globert_levels_v1';
  const L={ done:[], best:{cash:2500,tpmPeak:0,onTime:100,shipped:0,ordersDone:0} };
  let lastSave=0, overlay=null;

  function load(){
    try{ const d=JSON.parse(localStorage.getItem(KEY));
      if(d){ L.done=d.done||[]; L.best=Object.assign(L.best,d.best||{}); } }catch(e){}
  }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify({v:1,done:L.done,best:L.best})); }catch(e){} }

  /* ---------- metrics ---------- */
  function onTimePct(){ const c=ERP.completed||0; return c?Math.round((ERP.onTime/c)*100):100; }
  function metric(m){
    if(m==='shipped')    return SIM.S.shipped;
    if(m==='ordersDone') return ERP.completed||0;
    if(m==='maxActive')  return ERP.maxActive||0;
    if(m==='tpm')        return SIM.throughput();
    if(m==='onTime')     return onTimePct();
    if(m==='skirmishWins') return window.ADVENTURE?ADVENTURE.wins:0;
    if(m==='skirmishStreak') return window.ADVENTURE?ADVENTURE.bestStreak:0;
    return 0;
  }
  function goalMet(g){
    if(g.metric==='onTime') return (ERP.completed||0)>=4 && onTimePct()>=g.goal;
    return metric(g.metric)>=g.goal;
  }
  function currentIndex(){
    for(let i=0;i<CHAPTERS.length;i++){ if(!L.done.includes(CHAPTERS[i].id)) return i; }
    return CHAPTERS.length;                       // career complete
  }
  function currentRank(){
    const c=currentIndex();
    if(c>=CHAPTERS.length) return CAREER_TOP;
    return c===0 ? 'New Hire' : CHAPTERS[c-1].rank;
  }

  /* ---------- tick ---------- */
  function tick(now){
    // best-run stats
    L.best.cash=Math.round(SIM.S.cash);
    L.best.tpmPeak=Math.max(L.best.tpmPeak||0, SIM.throughput());
    L.best.shipped=SIM.S.shipped;
    L.best.ordersDone=ERP.completed||0;
    L.best.onTime=onTimePct();

    const c=currentIndex();
    if(c<CHAPTERS.length){
      const ch=CHAPTERS[c];
      if(ch.goals.every(goalMet)){
        L.done.push(ch.id);
        SIM.S.cash+=ch.reward;
        if(window.ERP&&ERP.resetDisp)ERP.resetDisp();
        save();
        celebrate(ch);
      }
    }
    if(now-lastSave>3000){ save(); lastSave=now; }
  }

  /* ---------- sidebar Career panel ---------- */
  function renderPanel(){
    const el=document.getElementById('objList'); if(!el)return;
    const pill=document.getElementById('objPill');
    const rankEl=document.getElementById('rankChip');
    const c=currentIndex();
    if(rankEl)rankEl.textContent=currentRank();

    if(c>=CHAPTERS.length){
      if(pill)pill.textContent='Complete';
      el.innerHTML=`<div class="chapter-card done">
          <div class="chapter-top"><span class="chapter-n">★</span>
            <div><div class="chapter-name">Career complete</div>
            <div class="chapter-rank">${CAREER_TOP}</div></div></div>
          <div class="chapter-blurb">You've run the whole floor. Sandbox mode is all yours, boss.</div>
        </div>`;
      return;
    }
    const ch=CHAPTERS[c];
    if(pill)pill.textContent='Ch '+ch.n;
    const goalsHtml=ch.goals.map(g=>{
      const v=metric(g.metric), p=Math.min(1, v/g.goal), met=goalMet(g);
      const shown = g.metric==='onTime' ? v+'%' : Math.min(v,g.goal)+' / '+g.goal;
      return `<div class="goal ${met?'met':''}">
          <span class="goal-check">${met?'✓':''}</span>
          <div class="goal-body">
            <div class="goal-label">${g.label}</div>
            <div class="bar"><span style="width:${Math.round(p*100)}%"></span></div>
          </div>
          <span class="goal-val num">${shown}</span>
        </div>`;
    }).join('');
    el.innerHTML=`<div class="chapter-card">
        <div class="chapter-top">
          <span class="chapter-n">${ch.n}</span>
          <div><div class="chapter-name">${ch.name}</div>
          <div class="chapter-rank">Earn · ${ch.rank}</div></div>
          <span class="chapter-reward num">+$${ch.reward.toLocaleString()}</span>
        </div>
        <div class="chapter-blurb">${ch.blurb}</div>
        <div class="chapter-goals">${goalsHtml}</div>
      </div>`;
  }

  /* ---------- promotion overlay ---------- */
  function celebrate(ch){
    const next=currentIndex();
    const newRank=ch.rank;
    const nextCh=next<CHAPTERS.length?CHAPTERS[next]:null;
    const finale=!nextCh;

    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='promoOverlay'; overlay.className='promo-overlay';
      document.body.appendChild(overlay);
    }
    const confetti=Array.from({length:26},(_,i)=>{
      const cols=['#34a13a','#1f6b27','#c8975c','#6cc472','#f4c54f'];
      const x=Math.random()*100, d=(Math.random()*0.5).toFixed(2),
            r=(Math.random()*360)|0, col=cols[i%cols.length],
            dur=(1.6+Math.random()*1.4).toFixed(2);
      return `<i class="confetti" style="left:${x}%;background:${col};transform:rotate(${r}deg);animation-delay:${d}s;animation-duration:${dur}s"></i>`;
    }).join('');

    overlay.innerHTML=`
      <div class="promo-confetti">${confetti}</div>
      <div class="promo-card">
        <div class="promo-mascot">${window.globertMascot?globertMascot({size:128}):''}</div>
        <div class="promo-eyebrow">${finale?'Career complete':'You\u2019ve been promoted'}</div>
        <h2 class="promo-rank">${finale?CAREER_TOP:newRank}</h2>
        <p class="promo-sub">Chapter ${ch.n} cleared \u00b7 <b>${ch.name}</b></p>
        <div class="promo-reward">Performance bonus <b class="num">+$${ch.reward.toLocaleString()}</b></div>
        ${nextCh?`<div class="promo-next">Next up \u00b7 <b>Ch ${nextCh.n} \u00b7 ${nextCh.name}</b><span>${nextCh.blurb}</span></div>`
                :`<div class="promo-next finale">You simplified the whole shop floor. Mubarak \u2014 the plant is yours.</div>`}
        <button class="promo-btn" id="promoClose">${finale?'Keep building':'Back to the floor'}</button>
      </div>`;
    overlay.classList.add('show');
    if(window.ERP&&ERP.toast)ERP.toast(`Promoted to <b>${finale?CAREER_TOP:newRank}</b>`,'cash');
    document.getElementById('promoClose').onclick=()=>overlay.classList.remove('show');
  }

  /* ---------- init ---------- */
  function init(){ load(); renderPanel(); }

  window.LEVELS={ init, tick, renderPanel,
    get done(){return L.done;}, get best(){return L.best;}, currentIndex, currentRank };
})();
