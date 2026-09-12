(()=>{
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    try{
      const url=typeof input==='string'?input:(input?.url||'');
      if(url.includes('/functions/v1/bali-route-estimate')&&init?.body){
        const body=JSON.parse(init.body);
        const sourceId=document.getElementById('v18RouteFrom')?.value||'';
        const source=(window.events||events||[]).find(e=>String(e.id)===sourceId);
        const act=document.getElementById('editActivity')?.value?.trim()||'';
        const map=document.getElementById('editMap')?.value?.trim()||'';
        const originCandidates=source?[source.activity,source.place,source.map].filter(Boolean):[];
        const destinationCandidates=[act,map].filter(Boolean);
        body.origin=originCandidates[0]||body.origin;
        body.destination=act||map||body.destination;
        body.origin_candidates=originCandidates;
        body.destination_candidates=destinationCandidates;
        init={...init,body:JSON.stringify(body)};
      }
    }catch(e){console.warn('[route hotfix]',e)}
    return nativeFetch(input,init);
  };
})();
