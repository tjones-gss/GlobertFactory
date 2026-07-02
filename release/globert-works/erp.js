/* ===========================================================
   erp.js — Globert ERP layer
   Work orders, inventory, KPIs, throughput charts, office dashboard,
   recipe popover, toasts. Exposes window.ERP.
   =========================================================== */
(function(){
  const {S,RES,RECIPES,UNIT_PRICE}=SIM;
  const $=s=>document.querySelector(s);

  const CUSTOMERS=['Arclight Mfg','Northbay Tooling','Cedar & Volt','Meridian Works',
    'Halewood Industrial','Bright Forge Co','Ostrander Parts','Vantage Assembly',
    'Kepler Machining','Riverside Fab'];

  const ERP={
    orders:[], nextId:1042, completed:0, onTime:0,
    history:[],            // samples {t, v(tpm), cash}
    lastSample:0, lastOrder:0,
    overstock:0, maxActive:0,
  };
  const disp={cash:2500, tpm:0};   // eased display values

  // milestones
  const OBJ=[
    {id:'first',  label:'Ship your first Widget', reward:200,  done:false, prog:()=>S.shipped,           goal:1},
    {id:'ship25', label:'Ship 25 Widgets',        reward:500,  done:false, prog:()=>S.shipped,           goal:25},
    {id:'ord3',   label:'Deliver 3 work orders',  reward:750,  done:false, prog:()=>ERP.completed,        goal:3},
    {id:'mach5',  label:'Run 5 machines at once',  reward:400,  done:false, prog:()=>ERP.maxActive,        goal:5},
    {id:'ship100',label:'Ship 100 Widgets',       reward:1500, done:false, prog:()=>S.shipped,           goal:100},
  ];
  function checkObjectives(){
    if(window.LEVELS)return;            // chapter system owns progression when present
    OBJ.forEach(o=>{
      if(!o.done && o.prog()>=o.goal){
        o.done=true; S.cash+=o.reward;
        toast(`Milestone · ${o.label} · +$${o.reward.toLocaleString()}`,'cash');
      }
    });
  }

  /* ---------- icon canvases ---------- */
  function iconCanvas(type,px){
    const c=document.createElement('canvas');
    const d=Math.min(window.devicePixelRatio||1,2);
    c.width=px*d;c.height=px*d;c.style.width=px+'px';c.style.height=px+'px';
    const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);
    FLOOR.drawResource(g,type,px/2,px/2,px*0.82);
    return c;
  }

  /* ---------- orders ---------- */
  function createOrder(qty,deadlineMs,cust,label,now){
    now=now||performance.now();
    const o={
      id:ERP.nextId++, cust:cust||CUSTOMERS[Math.floor(Math.random()*CUSTOMERS.length)],
      qty, fulfilled:0, price:qty*UNIT_PRICE,
      placed:now, deadline:now+(deadlineMs||(qty*6500+22000)), done:false, late:false,
      label:label||''
    };
    ERP.orders.unshift(o);
    toast(`${label?label+' · ':'New work order '}<b>#${o.id}</b> · ${qty} Widgets`,'');
    return o;
  }
  function spawnOrder(now){
    const qty=3+Math.floor(Math.random()*7);
    createOrder(qty,null,null,'',now);
  }
  function onShip(){
    // allocate to oldest open order
    let target=null;
    for(let i=ERP.orders.length-1;i>=0;i--){const o=ERP.orders[i];if(!o.done&&o.fulfilled<o.qty){target=o;break;}}
    if(target){
      target.fulfilled++;
      if(target.fulfilled>=target.qty){
        target.done=true;
        const now=performance.now();
        target.late=now>target.deadline;
        ERP.completed++; if(!target.late)ERP.onTime++;
        toast(`Order <b>#${target.id}</b> complete · +$${target.price.toLocaleString()}`,'cash');
      }
    } else { ERP.overstock++; }
  }
  SIM.S.onWidgetShipped=onShip;

  function tickOrders(now){
    // spawn cadence
    const open=ERP.orders.filter(o=>!o.done).length;
    if(now-ERP.lastOrder> (open<2?9000:16000) && open<5){ spawnOrder(now); ERP.lastOrder=now; }
    // retire old done orders (keep recent few)
    const done=ERP.orders.filter(o=>o.done);
    if(done.length>4){ const oldest=done[done.length-1]; const i=ERP.orders.indexOf(oldest); if(i>=0)ERP.orders.splice(i,1); }
  }

  /* ---------- sampling ---------- */
  function sample(now){
    if(now-ERP.lastSample>1500){
      ERP.history.push({t:now,v:SIM.throughput(),cash:S.cash});
      if(ERP.history.length>80)ERP.history.shift();
      ERP.lastSample=now;
    }
  }
  // sample from ~60s ago (or earliest available) for rate deltas
  function past(now){
    const h=ERP.history; if(!h.length)return{cash:S.cash,v:SIM.throughput()};
    const cut=now-60000;
    for(let i=0;i<h.length;i++){if(h[i].t>=cut)return h[i];}
    return h[0];
  }

  /* ---------- toasts ---------- */
  function toast(html,cls){
    const wrap=$('#toasts');if(!wrap)return;
    const el=document.createElement('div');el.className='toast '+(cls||'');el.innerHTML=html;
    wrap.appendChild(el);
    setTimeout(()=>{el.style.transition='opacity .4s, transform .4s';el.style.opacity='0';el.style.transform='translateY(-8px)';},2600);
    setTimeout(()=>el.remove(),3100);
  }

  /* ---------- helpers ---------- */
  function fmtTime(ms){if(ms<=0)return'overdue';const s=Math.ceil(ms/1000);return s>=60?`${Math.floor(s/60)}m ${s%60}s`:`${s}s`;}
  function onTimePct(){return ERP.completed?Math.round(ERP.onTime/ERP.completed*100):100;}

  /* ---------- sidebar render ---------- */
  let invChips={};
  function buildInv(){
    const list=$('#invList');list.innerHTML='';
    ['ore','plate','gear','widget'].forEach(t=>{
      const row=document.createElement('div');row.className='inv-row';
      const chip=document.createElement('div');chip.className='inv-chip';chip.style.background=getCss('--panel-2');
      const ic=iconCanvas(t,20);chip.appendChild(ic);
      const nm=document.createElement('div');
      nm.innerHTML=`<div class="inv-name">${RES[t].name}</div><div class="inv-sub">${RES[t].sub}</div>`;
      const cnt=document.createElement('div');cnt.className='inv-count';
      cnt.innerHTML=`<div class="n" data-c="${t}">0</div><div class="rate" data-p="${t}">0 made</div>`;
      row.append(chip,nm,cnt);list.appendChild(row);
    });
  }
  function getCss(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}

  function renderSidebar(now){
    // milestones
    checkObjectives();
    renderObjectives();
    // eased topbar cash
    disp.cash += (S.cash-disp.cash)*0.2;
    if(Math.abs(S.cash-disp.cash)<1)disp.cash=S.cash;
    $('#kCash').textContent='$'+Math.round(disp.cash).toLocaleString();
    $('#kTPM').innerHTML=SIM.throughput()+'<small> /min</small>';
    $('#kOnTime').innerHTML=onTimePct()+'<small>%</small>';

    // inventory counts
    const c=SIM.counts();
    document.querySelectorAll('#invList .n').forEach(e=>{e.textContent=c[e.dataset.c];});
    document.querySelectorAll('#invList .rate').forEach(e=>{e.textContent=S.produced[e.dataset.p].toLocaleString()+' made';});

    // open count pill
    const open=ERP.orders.filter(o=>!o.done).length;
    $('#ordersPill').textContent=open+' open';
    $('#ordersPill').className='pill'+(open>=5?' warn':'');

    renderOrders(now);
    drawSpark($('#sparkSide'),false);
    $('#sparkRate').textContent=SIM.throughput()+' widgets/min';
    $('#sparkWip').textContent=SIM.wip()+' WIP';
  }

  function renderObjectives(){
    if(window.LEVELS){window.LEVELS.renderPanel();return;}
    const el=$('#objList'); if(!el)return;
    const doneN=OBJ.filter(o=>o.done).length;
    $('#objPill').textContent=doneN+'/'+OBJ.length;
    // show all completed + the next 2 active
    const active=OBJ.filter(o=>!o.done).slice(0,2);
    const showDone=OBJ.filter(o=>o.done).slice(-1);
    const show=[...active,...showDone];
    el.innerHTML=show.map(o=>{
      const p=Math.min(1,o.prog()/o.goal);
      return `<div class="obj ${o.done?'done':''}">
        <span class="obj-check">${o.done?'✓':''}</span>
        <div class="obj-body">
          <div class="obj-label">${o.label}</div>
          <div class="bar"><span style="width:${Math.round(p*100)}%"></span></div>
        </div>
        <span class="obj-reward">+$${o.reward.toLocaleString()}</span>
      </div>`;
    }).join('');
  }

  function renderOrders(now){
    const list=$('#ordersList');
    const open=ERP.orders.filter(o=>!o.done);
    const done=ERP.orders.filter(o=>o.done);
    const show=[...open,...done];
    if(!show.length){list.innerHTML='<div class="empty-note">No active work orders.<br>New orders arrive as you ship.</div>';return;}
    list.innerHTML='';
    show.forEach(o=>{
      const left=o.deadline-now;
      const urgent=!o.done&&left<12000;
      const el=document.createElement('div');
      el.className='order'+(o.done?' done':'')+(urgent?' late':'');
      const pct=Math.min(100,Math.round(o.fulfilled/o.qty*100));
      el.innerHTML=`
        <div class="order-top">
          <span class="order-id">#${o.id}${o.label?` · ${o.label}`:''}</span>
          <span class="order-cust">${o.cust}</span>
          <span class="order-price">$${o.price.toLocaleString()}</span>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div class="order-meta">
          <span>${o.fulfilled}/${o.qty} Widgets</span>
          <span class="order-due ${urgent?'urgent':''}">${o.done?(o.late?'shipped late':'on time ✓'):'⏱ '+fmtTime(left)}</span>
        </div>`;
      list.appendChild(el);
    });
  }

  /* ---------- spark / charts ---------- */
  function drawSpark(canvas,big){
    if(!canvas)return;
    const d=Math.min(window.devicePixelRatio||1,2);
    const w=canvas.clientWidth||canvas.parentElement.clientWidth,h=canvas.clientHeight||(big?200:54);
    canvas.width=w*d;canvas.height=h*d;const g=canvas.getContext('2d');g.setTransform(d,0,0,d,0,0);
    g.clearRect(0,0,w,h);
    const data=ERP.history;
    if(data.length<2)return;
    const max=Math.max(4,...data.map(p=>p.v))*1.15;
    const pad=big?24:4;
    const x=i=>pad+i/(data.length-1)*(w-pad*2);
    const y=v=>h-pad-(v/max)*(h-pad*(big?2:1.4));
    const green=getCss('--green'),deep=getCss('--green-deep');
    if(big){
      g.strokeStyle=getCss('--line-2');g.lineWidth=1;
      for(let i=0;i<=4;i++){const gy=pad+i/4*(h-pad*2);g.beginPath();g.moveTo(pad,gy);g.lineTo(w-pad,gy);g.stroke();
        g.fillStyle=getCss('--ink-3');g.font='10px Inter';g.textAlign='right';
        g.fillText(Math.round(max-(i/4)*max),pad-6,gy+3);}
    }
    // area
    g.beginPath();g.moveTo(x(0),y(data[0].v));
    data.forEach((p,i)=>g.lineTo(x(i),y(p.v)));
    g.lineTo(x(data.length-1),h-pad);g.lineTo(x(0),h-pad);g.closePath();
    const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,hexA(green,0.28));grad.addColorStop(1,hexA(green,0));
    g.fillStyle=grad;g.fill();
    // line
    g.beginPath();data.forEach((p,i)=>i?g.lineTo(x(i),y(p.v)):g.moveTo(x(i),y(p.v)));
    g.strokeStyle=deep;g.lineWidth=big?2.5:2;g.lineJoin='round';g.stroke();
    // last dot
    const last=data.length-1;g.beginPath();g.arc(x(last),y(data[last].v),big?4:3,0,7);g.fillStyle=deep;g.fill();
    g.strokeStyle='#fff';g.lineWidth=2;g.stroke();
  }
  function hexA(hex,a){const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}

  /* ---------- office dashboard ---------- */
  let officeBuilt=false;
  function buildOfficeStatic(){
    if(officeBuilt)return;officeBuilt=true;
    // BOM cards
    const bom=$('#bomCards');bom.innerHTML='';
    [['assemble','Widget'],['press','Gear'],['smelt','Plate']].forEach(([rk])=>{
      const rc=RECIPES[rk];
      const card=document.createElement('div');card.className='bom-recipe';
      card.style.cssText='display:flex;align-items:center;gap:14px;padding:13px 4px;border-bottom:1px solid var(--line-2);';
      const outWrap=document.createElement('div');outWrap.style.cssText='display:flex;align-items:center;gap:9px;min-width:128px;';
      outWrap.appendChild(iconCanvas(rc.out,30));
      outWrap.insertAdjacentHTML('beforeend',`<div><div class="bn">${RES[rc.out].name}</div><div class="bq">${rc.short} · ${rc.time}s</div></div>`);
      const arrow=document.createElement('div');arrow.textContent='⟵';arrow.style.cssText='color:var(--ink-3);font-size:18px;';
      const ins=document.createElement('div');ins.style.cssText='display:flex;gap:14px;align-items:center;';
      Object.entries(rc.in).forEach(([k,q])=>{
        const it=document.createElement('div');it.style.cssText='display:flex;align-items:center;gap:7px;';
        it.appendChild(iconCanvas(k,24));
        it.insertAdjacentHTML('beforeend',`<span style="font-size:12.5px;font-weight:600">${q}× ${RES[k].name}</span>`);
        ins.appendChild(it);
      });
      card.append(outWrap,arrow,ins);bom.appendChild(card);
    });
    bom.lastChild.style.borderBottom='none';
  }

  function renderOffice(now){
    buildOfficeStatic();
    const tpm=SIM.throughput();
    const p=past(now);
    const dC=Math.round(S.cash-p.cash), dT=tpm-p.v;
    disp.cash += (S.cash-disp.cash)*0.2; if(Math.abs(S.cash-disp.cash)<1)disp.cash=S.cash;
    $('#oCash').textContent='$'+Math.round(disp.cash).toLocaleString();
    $('#oCashD').textContent=(dC>=0?'▲ +$':'▼ -$')+Math.abs(dC).toLocaleString()+' / min';
    $('#oCashD').className='delta '+(dC>=0?'up':'dn');
    $('#oTPM').textContent=tpm;
    $('#oTPMD').textContent=(dT>=0?'▲ +':'▼ ')+dT+' vs last min';
    $('#oTPMD').className='delta '+(dT>=0?'up':'dn');
    $('#oOnTime').textContent=onTimePct()+'%';
    $('#oOnTimeD').textContent=ERP.completed+' orders shipped';
    $('#oWip').textContent=SIM.wip();
    $('#oWipD').textContent=SIM.shipped?(S.shipped+' total units'):'building up';

    drawSpark($('#chartBig'),true);

    // work order table
    const tb=$('#woBody');
    const rows=[...ERP.orders].slice(0,9);
    if(!rows.length){tb.innerHTML='<tr><td colspan="5" class="empty-note">No work orders yet.</td></tr>';}
    else{
      tb.innerHTML=rows.map(o=>{
        const pct=Math.round(o.fulfilled/o.qty*100);
        const left=o.deadline-now;
        let st,sc;
        if(o.done){st=o.late?'Late':'Shipped';sc=o.late?'late':'done';}
        else if(o.fulfilled>0){st='In progress';sc='prog';}
        else {st='Open';sc='open';}
        return `<tr>
          <td><b class="num">#${o.id}</b></td>
          <td>${o.cust}</td>
          <td><span class="num">${o.fulfilled}</span> / ${o.qty}
              <span class="minibar"><span style="width:${pct}%"></span></span></td>
          <td><span class="status ${sc}"><span class="dot"></span>${st}</span></td>
          <td class="num">${o.done?'$'+o.price.toLocaleString():fmtTime(left)}</td>
        </tr>`;
      }).join('');
    }

    // inventory bars
    const c=SIM.counts();const maxv=Math.max(8,c.ore,c.plate,c.gear,c.widget);
    const bcol={ore:getCss('--ore'),plate:getCss('--plate'),gear:getCss('--gear'),widget:getCss('--green')};
    $('#invBars').innerHTML=['ore','plate','gear','widget'].map(t=>`
      <div class="invbar-row">
        <span class="lab">${RES[t].name}</span>
        <span class="track"><span style="width:${Math.round(c[t]/maxv*100)}%;background:${bcol[t]}"></span></span>
        <span class="qv">${c[t]}</span>
      </div>`).join('');

    // utilization / building stats
    const bs=SIM.buildingStats();
    const util=bs.asm?Math.round(bs.asmActive/bs.asm*100):0;
    $('#utilList').innerHTML=`
      <div class="util-line"><span>Machine utilization</span><span class="v">${util}%</span></div>
      <div class="util-line"><span>Active machines</span><span class="v">${bs.asmActive} / ${bs.asm}</span></div>
      <div class="util-line"><span>Extractors</span><span class="v">${bs.ext}</span></div>
      <div class="util-line"><span>Conveyor tiles</span><span class="v">${bs.belt}</span></div>
      <div class="util-line"><span>Shipping docks</span><span class="v">${bs.ship}</span></div>
      <div class="util-line"><span>Finished &amp; shipped</span><span class="v">${S.shipped}</span></div>`;
  }

  /* ---------- recipe popover ---------- */
  function openRecipePopover(x,y,sx,sy){
    closePopover();
    const c=SIM.cellAt(x,y);if(!c||c.kind!=='assembler')return;
    const pop=document.createElement('div');pop.className='popover';pop.id='recipePop';
    pop.innerHTML='<h5>Select recipe</h5>';
    SIM.RECIPE_ORDER.forEach(rk=>{
      const rc=RECIPES[rk];
      const opt=document.createElement('div');opt.className='recipe-opt'+(c.recipe===rk?' sel':'');
      const inStr=Object.entries(rc.in).map(([k,q])=>`${q} ${RES[k].name}`).join(' + ');
      opt.appendChild(iconCanvas(rc.out,22));
      opt.insertAdjacentHTML('beforeend',`<div><div class="rt">${RES[rc.out].name}</div><div class="rf">${inStr} · ${rc.time}s</div></div>`);
      opt.onclick=()=>{SIM.setRecipe(x,y,rk);closePopover();};
      pop.appendChild(opt);
    });
    document.body.appendChild(pop);
    const pw=pop.offsetWidth,ph=pop.offsetHeight;
    pop.style.left=Math.min(sx+6,window.innerWidth-pw-10)+'px';
    pop.style.top=Math.min(sy,window.innerHeight-ph-10)+'px';
    setTimeout(()=>document.addEventListener('pointerdown',outside),0);
  }
  function outside(e){if(!e.target.closest('#recipePop'))closePopover();}
  function closePopover(){const p=$('#recipePop');if(p)p.remove();document.removeEventListener('pointerdown',outside);}
  window.openRecipePopover=openRecipePopover;

  /* ---------- main tick ---------- */
  function tick(now){
    tickOrders(now); sample(now);
    const bs=SIM.buildingStats(); if(bs.asmActive>ERP.maxActive)ERP.maxActive=bs.asmActive;
  }

  /* ---------- persistence of ERP-side state ---------- */
  function dump(){
    return {nextId:ERP.nextId, completed:ERP.completed, onTime:ERP.onTime,
            maxActive:ERP.maxActive, obj:OBJ.map(o=>o.done?1:0)};
  }
  function restore(d){
    if(!d)return;
    ERP.nextId=d.nextId||1042; ERP.completed=d.completed||0;
    ERP.onTime=d.onTime||0; ERP.maxActive=d.maxActive||0;
    if(d.obj)d.obj.forEach((v,i)=>{if(OBJ[i])OBJ[i].done=!!v;});
    disp.cash=S.cash;
  }

  ERP.tick=tick; ERP.renderSidebar=renderSidebar; ERP.renderOffice=renderOffice;
  ERP.buildInv=buildInv; ERP.toast=toast; ERP.iconCanvas=iconCanvas;
  ERP.enqueueOrder=(qty,deadlineMs,cust,label)=>createOrder(qty,deadlineMs,cust,label);
  ERP.dump=dump; ERP.restore=restore; ERP.resetDisp=()=>{disp.cash=S.cash;};
  window.ERP=ERP;
})();
