/* ===========================================================
   tutorial.js — first-run guided onboarding.
   Small contextual prompts, no blocking manual.
   Exposes window.TUTORIAL.
   =========================================================== */
(function(){
  const KEY='globert_tutorial_v1';
  const steps=[
    {id:'welcome', title:'First shift', body:'Your line is already moving. Watch ore become parts, then ship Widgets for cash.', cta:'Show me'},
    {id:'tools', title:'Build tools', body:'Use the left rail to place machines. Shortcuts: E extractor, B belt, A assembler, D dock.', cta:'Next'},
    {id:'recipes', title:'Recipes matter', body:'Select an assembler to choose what it makes. Plate feeds gear. Plate plus gear makes Widget.', cta:'Got it'},
    {id:'skirmish', title:'Shift Skirmish', body:'When the floor feels steady, start a timed skirmish for grades, streaks, and bigger bonuses.', cta:'Clock in'}
  ];
  let i=0,done=false,el=null;
  function load(){
    try{done=localStorage.getItem(KEY)==='done';}catch(e){}
  }
  function save(){
    try{localStorage.setItem(KEY,'done');}catch(e){}
  }
  function render(){
    if(done)return;
    if(!el){
      el=document.createElement('div');
      el.className='coach';
      document.body.appendChild(el);
    }
    const s=steps[i];
    el.innerHTML=`<div class="coach-card">
      <div class="coach-top"><span>Training ${i+1}/${steps.length}</span><button id="coachSkip">Skip</button></div>
      <h3>${s.title}</h3>
      <p>${s.body}</p>
      <button class="coach-next" id="coachNext">${s.cta}</button>
    </div>`;
    el.classList.add('show');
    document.getElementById('coachSkip').onclick=complete;
    document.getElementById('coachNext').onclick=()=>{
      if(i<steps.length-1){i++;render();}
      else complete();
    };
  }
  function complete(){
    done=true; save();
    if(el)el.classList.remove('show');
  }
  function reset(){
    done=false;i=0;
    try{localStorage.removeItem(KEY);}catch(e){}
    render();
  }
  function init(){
    load();
    if(!done)setTimeout(render,700);
  }
  window.TUTORIAL={init,reset,complete};
})();
