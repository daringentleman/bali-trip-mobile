(()=>{
  const OLD_ORIGIN='https://ntnwbecchicbbhrqrdhg.supabase.co';
  const NEW_ORIGIN='https://qblautsduswdhwdcqsre.supabase.co';
  const NEW_KEY='sb_publishable_ed4Xtm51Jqwa2e7fUL-uTA_ncvJ8_rR';
  const SYNC_CODE='U76OT1O4TT5I';
  const PREP_KEY='bali_backend_qblautsduswdhwdcqsre_prepared_v1';
  const CODE_KEY='bali_sync_code_v1';
  const MIGRATED_KEY='bali_sync_migrated_v1';
  const SHADOW_KEY='bali_sync_shadow_v1';

  // One-time backend migration on each phone: preserve local state first,
  // then force v16 to perform its safe first-merge against the new database.
  if(localStorage.getItem(PREP_KEY)!=='1'){
    try{
      const keep={};
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k && (k.startsWith('bali_') || k.startsWith('homepack_'))) keep[k]=localStorage.getItem(k);
      }
      localStorage.setItem('bali_presync_backend_switch_'+Date.now(),JSON.stringify({savedAt:Date.now(),from:OLD_ORIGIN,to:NEW_ORIGIN,data:keep}));
    }catch(e){console.warn('[Bali bridge] backup skipped',e)}
    localStorage.removeItem(MIGRATED_KEY);
    localStorage.removeItem(SHADOW_KEY);
    localStorage.setItem(PREP_KEY,'1');
  }

  // Both phones use the same trip key automatically; no re-entry required.
  localStorage.setItem(CODE_KEY,SYNC_CODE);

  // Existing modules still contain the previous Supabase URL/key. Redirect all
  // Bali API traffic to the new dedicated project without touching local data.
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init={}){
    let req=input;
    let url=typeof input==='string'?input:(input?.url||'');
    if(url.startsWith(OLD_ORIGIN)){
      const next=NEW_ORIGIN+url.slice(OLD_ORIGIN.length);
      if(typeof input==='string') req=next;
      else req=new Request(next,input);
      const h=new Headers(init.headers || (typeof input!=='string'?input.headers:undefined) || {});
      if(h.has('apikey')) h.set('apikey',NEW_KEY);
      init={...init,headers:h};
    }
    return nativeFetch(req,init);
  };

  window.BALI_SYNC_BACKEND={url:NEW_ORIGIN,key:NEW_KEY,code:SYNC_CODE};
})();
