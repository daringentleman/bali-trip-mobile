(()=>{
  const SUPABASE_URL='https://ntnwbecchicbbhrqrdhg.supabase.co';
  const SUPABASE_KEY='sb_publishable_dFRl3bsOd6TvVZqOCIBzpA_BWPnUWSv';
  const CODE_KEY='bali_sync_code_v1';
  const DEVICE_KEY='bali_sync_device_v1';
  const SHADOW_KEY='bali_sync_shadow_v1';
  const MIGRATED_KEY='bali_sync_migrated_v1';
  const BUCKETS=['events','pack_zero','pack_ting','expenses','buys'];
  const POLL_MS=2800;

  let syncCode=localStorage.getItem(CODE_KEY)||'';
  let deviceId=localStorage.getItem(DEVICE_KEY)||'';
  let syncing=false,suppress=false,syncTimer=null,pollTimer=null,started=false;
  if(!deviceId){deviceId='dev_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);localStorage.setItem(DEVICE_KEY,deviceId)}

  const rawSaveEvents=saveEvents,rawSavePack=savePack,rawSaveExpenses=saveExpenses,rawSaveBuys=saveBuys;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const rowKey=r=>`${r.bucket}:${r.item_id}`;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const headers=()=>({'apikey':SUPABASE_KEY,'x-bali-key':syncCode,'content-type':'application/json'});

  function localBuckets(){
    return {
      events:clone(events||[]),
      pack_zero:clone(pack?.zero||[]),
      pack_ting:clone(pack?.ting||[]),
      expenses:clone(expenses||[]),
      buys:clone(buys||[])
    };
  }
  function currentRows(){
    const b=localBuckets(),rows=[];
    for(const bucket of BUCKETS) for(const item of b[bucket]) if(item&&item.id!=null) rows.push({bucket,item_id:String(item.id),payload:item,deleted:false,device_id:deviceId});
    return rows;
  }
  function readShadow(){try{return JSON.parse(localStorage.getItem(SHADOW_KEY)||'[]')}catch(e){return[]}}
  function writeShadow(rows){localStorage.setItem(SHADOW_KEY,JSON.stringify(rows))}

  async function verifyCode(){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/bali_has_access`,{method:'POST',headers:headers(),body:'{}',cache:'no-store'});
    if(!r.ok)return false;
    return (await r.json())===true;
  }
  async function fetchRows(){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/bali_sync_items?select=bucket,item_id,payload,deleted,updated_at,device_id&order=updated_at.asc`,{headers:headers(),cache:'no-store'});
    if(!r.ok)throw new Error('pull '+r.status);
    return await r.json();
  }
  async function upsertRows(rows){
    if(!rows.length)return;
    const body=rows.map(r=>({bucket:r.bucket,item_id:String(r.item_id),payload:r.payload||{},deleted:!!r.deleted,device_id:deviceId}));
    const r=await fetch(`${SUPABASE_URL}/rest/v1/bali_sync_items?on_conflict=bucket,item_id`,{method:'POST',headers:{...headers(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('push '+r.status+' '+(await r.text()));
  }

  function mergeInitial(bucket,remote,local){
    if(bucket==='pack_zero'||bucket==='pack_ting'||bucket==='buys') return {...remote,...local,done:!!(remote?.done||local?.done)};
    if(bucket==='events'){
      const out={...remote};
      const rank={none:0,todo:1,pending:2,booked:3};
      if((rank[local?.status]??0)>(rank[remote?.status]??0))out.status=local.status;
      if(!eq(remote,local)){
        try{
          const key='bali_sync_conflicts_v1';
          const arr=JSON.parse(localStorage.getItem(key)||'[]');
          if(!arr.some(x=>x.bucket===bucket&&x.id===String(local.id)&&eq(x.local,local)&&eq(x.remote,remote))){arr.push({bucket,id:String(local.id),local:clone(local),remote:clone(remote),savedAt:Date.now()});localStorage.setItem(key,JSON.stringify(arr.slice(-50)))}
        }catch(e){}
      }
      return out;
    }
    return remote||local;
  }

  async function firstMerge(remoteRows){
    const backup={savedAt:Date.now(),deviceId,data:localBuckets()};
    try{localStorage.setItem('bali_sync_backup_v1_'+backup.savedAt,JSON.stringify(backup))}catch(e){}
    const map=new Map(remoteRows.filter(r=>BUCKETS.includes(r.bucket)).map(r=>[rowKey(r),r]));
    for(const lr of currentRows()){
      const k=rowKey(lr),rr=map.get(k);
      if(!rr||rr.deleted){map.set(k,lr);continue}
      map.set(k,{...rr,payload:mergeInitial(lr.bucket,rr.payload,lr.payload),deleted:false,device_id:deviceId});
    }
    await upsertRows([...map.values()].filter(r=>!r.deleted));
    localStorage.setItem(MIGRATED_KEY,'1');
  }

  function localDiff(shadowRows){
    const shadow=new Map(shadowRows.filter(r=>BUCKETS.includes(r.bucket)).map(r=>[rowKey(r),r]));
    const cur=new Map(currentRows().map(r=>[rowKey(r),r]));
    const changes=[];
    for(const [k,r] of cur){const s=shadow.get(k);if(!s||s.deleted||!eq(s.payload,r.payload))changes.push(r)}
    for(const [k,s] of shadow){if(!s.deleted&&!cur.has(k))changes.push({bucket:s.bucket,item_id:s.item_id,payload:s.payload||{},deleted:true,device_id:deviceId})}
    return changes;
  }

  function applyRemote(rows){
    const active={events:[],pack_zero:[],pack_ting:[],expenses:[],buys:[]};
    for(const r of rows)if(BUCKETS.includes(r.bucket)&&!r.deleted&&r.payload)active[r.bucket].push(r.payload);
    suppress=true;
    try{
      events=active.events;
      pack={...pack,zero:active.pack_zero,ting:active.pack_ting};
      expenses=active.expenses;
      buys=active.buys;
      rawSaveEvents();rawSavePack();rawSaveExpenses();rawSaveBuys();
      renderAll();
    }finally{suppress=false}
  }

  async function syncNow(){
    if(syncing||!syncCode||!navigator.onLine)return;
    syncing=true;
    try{
      let remote=await fetchRows();
      if(localStorage.getItem(MIGRATED_KEY)!=='1'){
        await firstMerge(remote);
        remote=await fetchRows();
      }else{
        const changes=localDiff(readShadow());
        if(changes.length){await upsertRows(changes);remote=await fetchRows()}
      }
      applyRemote(remote);
      writeShadow(remote);
      setStatus('ok');
    }catch(e){console.warn('[Bali sync]',e);setStatus('offline')}
    finally{syncing=false}
  }
  function scheduleSync(){if(suppress||!syncCode)return;clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,100)}

  saveEvents=function(){rawSaveEvents();scheduleSync()};
  savePack=function(){rawSavePack();scheduleSync()};
  saveExpenses=function(){rawSaveExpenses();scheduleSync()};
  saveBuys=function(){rawSaveBuys();scheduleSync()};

  function ensureUI(){
    if(document.getElementById('baliSyncModal'))return;
    const style=document.createElement('style');style.textContent=`
      #baliSyncModal{position:fixed;inset:0;z-index:20000;background:rgba(35,31,38,.52);display:none;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      #baliSyncModal.show{display:flex}#baliSyncModal .syncbox{width:min(360px,100%);border:1px solid rgba(255,255,255,.58);background:rgba(248,244,240,.88);box-shadow:0 22px 60px rgba(35,29,40,.24);border-radius:26px;padding:20px;color:#211d25}
      #baliSyncModal h3{margin:0 0 8px;font-size:20px}#baliSyncModal p{font-size:12px;line-height:1.5;color:#706a73;margin:0 0 14px}
      #baliSyncModal input{width:100%;border:1px solid rgba(120,110,130,.22);background:rgba(255,255,255,.78);border-radius:15px;padding:14px;text-align:center;font-size:22px;letter-spacing:.18em;margin-bottom:10px;outline:none}
      #baliSyncModal button{width:100%;border:0;border-radius:15px;padding:12px 14px;font-weight:900;background:linear-gradient(135deg,#8d6bff,#78dfe6);color:#241a3b}
      #baliSyncError{min-height:18px;font-size:11px;color:#b54b55;text-align:center;margin-top:8px}
      #baliSyncBadge{position:fixed;right:10px;top:calc(env(safe-area-inset-top) + 8px);z-index:95;width:8px;height:8px;border-radius:50%;background:#a7a2aa;box-shadow:0 0 0 3px rgba(255,255,255,.55);pointer-events:none;opacity:.75}
      #baliSyncBadge.ok{background:#45b785}#baliSyncBadge.offline{background:#d49d4e}
    `;document.head.appendChild(style);
    const modal=document.createElement('div');modal.id='baliSyncModal';modal.innerHTML=`<div class="syncbox"><h3>連接兩人共享行程</h3><p>第一次只需要輸入一次共享同步碼。這支手機目前的行程、清單、記帳與待買資料會先備份，再和另一支手機合併，不會先清除。</p><input id="baliSyncInput" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="8 位同步碼"><button id="baliSyncConnect">開始共享同步</button><div id="baliSyncError"></div></div>`;document.body.appendChild(modal);
    const badge=document.createElement('div');badge.id='baliSyncBadge';document.body.appendChild(badge);
    document.getElementById('baliSyncConnect').onclick=connectFromModal;
    document.getElementById('baliSyncInput').addEventListener('keydown',e=>{if(e.key==='Enter')connectFromModal()});
  }
  function setStatus(s){const b=document.getElementById('baliSyncBadge');if(b)b.className=s||''}
  async function connectFromModal(){
    const input=document.getElementById('baliSyncInput'),err=document.getElementById('baliSyncError'),btn=document.getElementById('baliSyncConnect');
    const v=(input.value||'').replace(/\D/g,'');if(v.length!==8){err.textContent='請輸入 8 位同步碼';return}
    syncCode=v;btn.disabled=true;btn.textContent='連線中…';err.textContent='';
    try{
      if(!await verifyCode()){throw new Error('bad code')}
      localStorage.setItem(CODE_KEY,syncCode);document.getElementById('baliSyncModal').classList.remove('show');
      await syncNow();startPolling();
      if(typeof showToast==='function')showToast('兩人共享同步已連線');
    }catch(e){syncCode='';err.textContent='同步碼不正確，請再試一次';setStatus('offline')}
    finally{btn.disabled=false;btn.textContent='開始共享同步'}
  }
  function startPolling(){if(pollTimer)return;pollTimer=setInterval(syncNow,POLL_MS);window.addEventListener('online',syncNow)}
  async function boot(){
    ensureUI();
    if(!syncCode){document.getElementById('baliSyncModal').classList.add('show');return}
    try{
      if(!await verifyCode()){localStorage.removeItem(CODE_KEY);syncCode='';document.getElementById('baliSyncModal').classList.add('show');return}
      await syncNow();startPolling();
    }catch(e){setStatus('offline');startPolling()}
  }
  setTimeout(boot,250);
})();
