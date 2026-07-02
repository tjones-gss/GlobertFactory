/* ===========================================================
   release.js — player-facing save utilities.
   Export/import/restart helpers for public builds.
   Exposes window.RELEASE.
   =========================================================== */
(function(){
  const KEYS=['globert_save_v1','globert_levels_v1','globert_adventure_v1','globert_prefs_v1','globert_tutorial_v1'];
  function collect(){
    const data={v:1,exportedAt:new Date().toISOString(),keys:{}};
    KEYS.forEach(k=>{try{data.keys[k]=localStorage.getItem(k);}catch(e){}});
    return data;
  }
  function download(){
    const blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='globert-save.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    if(window.ERP)ERP.toast('Save exported','cash');
  }
  function importText(text){
    const d=JSON.parse(text);
    if(!d||!d.keys)throw new Error('Invalid save file');
    KEYS.forEach(k=>{
      if(Object.prototype.hasOwnProperty.call(d.keys,k)){
        if(d.keys[k]==null)localStorage.removeItem(k);
        else localStorage.setItem(k,d.keys[k]);
      }
    });
  }
  function restart(){
    KEYS.forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
    location.reload();
  }
  function wire(){
    const exportBtn=document.getElementById('saveExport');
    const importBtn=document.getElementById('saveImport');
    const importFile=document.getElementById('saveFile');
    const restartBtn=document.getElementById('saveRestart');
    const tutorialBtn=document.getElementById('tutorialReset');
    if(exportBtn)exportBtn.onclick=download;
    if(importBtn&&importFile)importBtn.onclick=()=>importFile.click();
    if(importFile)importFile.onchange=()=>{
      const f=importFile.files&&importFile.files[0]; if(!f)return;
      const r=new FileReader();
      r.onload=()=>{
        try{importText(String(r.result)); if(window.ERP)ERP.toast('Save imported. Reloading.','cash'); setTimeout(()=>location.reload(),500);}
        catch(e){if(window.ERP)ERP.toast('Import failed · invalid save','');}
      };
      r.readAsText(f);
    };
    if(restartBtn)restartBtn.onclick=()=>{
      if(confirm('Restart your factory, career, skirmishes, preferences, and tutorial?'))restart();
    };
    if(tutorialBtn)tutorialBtn.onclick=()=>{ if(window.TUTORIAL)TUTORIAL.reset(); };
  }
  window.RELEASE={wire,collect,importText,restart};
})();
