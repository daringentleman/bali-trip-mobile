(()=>{
  const SUPABASE_URL='https://ntnwbecchicbbhrqrdhg.supabase.co';
  const SUPABASE_KEY='sb_publishable_dFRl3bsOd6TvVZqOCIBzpA_BWPnUWSv';
  const SYNC_CODE_KEY='bali_sync_code_v1';
  const DEVICE_KEY='bali_sync_device_v1';
  let routePlan=null;

  const htmlEscape=s=>esc(s||'');
  const ceil5=m=>Math.ceil(m/5)*5;
  const getCode=()=>localStorage.getItem(SYNC_CODE_KEY)||'';
  const getDevice=()=>localStorage.getItem(DEVICE_KEY)||'';

  function ensureEditorFields(){
    const form=document.querySelector('#editModal .form');
    if(!form)return;
    if(!document.getElementById('editNote')){
      const activity=document.getElementById('editActivity')?.closest('label');
      const label=document.createElement('label');
      label.innerHTML='<div class="flabel">備註</div><textarea class="field v17-note-input" id="editNote" rows="2" placeholder="例如：記得帶訂位截圖、靠窗座位、不要太辣"></textarea>';
      activity?.insertAdjacentElement('afterend',label);
    }
    if(!document.getElementById('v17RoutePlanner')){
      const map=document.getElementById('editMap')?.closest('label');
      const box=document.createElement('div');
      box.id='v17RoutePlanner';box.className='v17-route-planner';
      box.innerHTML=`
        <div class="v17-route-title">交通估算</div>
        <div class="v17-route-sub">選上一站，再輸入餐廳／景點名稱或 Google Maps 連結。</div>
        <select class="field" id="v17RouteFrom"></select>
        <button type="button" class="btn secondary v17-route-calc" id="v17RouteCalc">計算路程＋建議開始時間</button>
        <div class="v17-route-result" id="v17RouteResult"></div>
        <button type="button" class="btn v17-route-apply" id="v17RouteApply" style="display:none">套用時間＋加入交通行程</button>`;
      map?.insertAdjacentElement('afterend',box);
      document.getElementById('v17RouteCalc').onclick=estimateRoute;
      document.getElementById('v17RouteApply').onclick=applyRoutePlan;
    }
  }

  function dayEvents(day,excludeId=null){
    return events.filter(e=>e.date===day&&e.id!==excludeId).sort((a,b)=>mins(a.start)-mins(b.start));
  }
  function endMin(e){return mins(e.end||e.start)}

  function fillRouteSources(){
    ensureEditorFields();
    const sel=document.getElementById('v17RouteFrom');if(!sel)return;
    const list=dayEvents(editDate,editId);
    sel.innerHTML=list.map(e=>`<option value="${htmlEscape(e.id)}">${htmlEscape(e.end||e.start)}｜${htmlEscape(shortTitle(e.activity))}</option>`).join('');
    if(!list.length){sel.innerHTML='<option value="">這天還沒有上一個行程</option>';return}
    const start=document.getElementById('editStart')?.value||'';
    let chosen=list[list.length-1];
    if(start){const before=list.filter(e=>endMin(e)<=mins(start));if(before.length)chosen=before[before.length-1]}
    sel.value=chosen.id;
  }

  function decorateRoute(root,day){
    if(!root)return;
    const list=events.filter(e=>e.date===day).sort((a,b)=>mins(a.start)-mins(b.start));
    [...root.querySelectorAll('.route-list .stop')].forEach((stop,i)=>{
      const e=list[i];if(!e)return;
      const t=stop.querySelector('.t');if(!t)return;
      let note=t.querySelector('.v17-note-pill');
      if(!note){note=document.createElement('span');note.className='v17-note-pill';t.appendChild(note)}
      note.textContent=e.note?`備註・${e.note}`:'備註';
      note.classList.toggle('empty',!e.note);
    });
  }

  const baseRenderDaily=window.renderDaily;
  window.renderDaily=function(){
    const r=baseRenderDaily();
    requestAnimationFrame(()=>decorateRoute(document.querySelector('#daily .route-fixed'),selectedDay));
    return r;
  };

  const daily=document.getElementById('daily');
  if(daily){
    const obs=new MutationObserver(()=>{
      document.querySelectorAll('#daily .daily-route-preview').forEach(p=>decorateRoute(p,p.dataset.day));
      decorateRoute(document.querySelector('#daily .route-fixed'),selectedDay);
    });
    obs.observe(daily,{childList:true,subtree:true});
  }

  const baseOpenEditor=window.openEditor;
  window.openEditor=function(id){
    ensureEditorFields();
    const r=baseOpenEditor(id);
    const e=events.find(x=>x.id===id);
    document.getElementById('editNote').value=e?.note||'';
    routePlan=null;resetRouteResult();fillRouteSources();
    return r;
  };

  window.openEditorForDay=function(){
    ensureEditorFields();
    editId=null;editDate=selectedDay;routePlan=null;
    document.getElementById('editHeading').textContent=`新增 ${dayLabel(selectedDay)} 行程`;
    document.getElementById('editStart').value='';
    document.getElementById('editEnd').value='';
    document.getElementById('editActivity').value='';
    document.getElementById('editMap').value='';
    document.getElementById('editNote').value='';
    document.getElementById('deleteBtn').style.display='none';
    resetRouteResult();fillRouteSources();openModal('editModal');
  };

  function resetRouteResult(){
    const res=document.getElementById('v17RouteResult'),apply=document.getElementById('v17RouteApply');
    if(res)res.innerHTML='';if(apply)apply.style.display='none';
  }

  async function estimateRoute(){
    const sourceId=document.getElementById('v17RouteFrom')?.value;
    const source=events.find(e=>e.id===sourceId);
    const act=document.getElementById('editActivity')?.value.trim()||'';
    const map=document.getElementById('editMap')?.value.trim()||'';
    const res=document.getElementById('v17RouteResult'),btn=document.getElementById('v17RouteCalc');
    if(!source){res.textContent='先選擇上一個行程。';return}
    if(!act&&!map){res.textContent='先輸入餐廳／景點名稱，或貼 Google Maps 連結。';return}
    const code=getCode();if(!code){res.textContent='先完成兩人共享同步連線。';return}
    const origin=source.map||source.place||source.activity;
    const destination=map||act;
    btn.disabled=true;btn.textContent='計算中…';res.textContent='正在估算開車／Grab 路程…';
    try{
      const r=await fetch(`${SUPABASE_URL}/functions/v1/bali-route-estimate`,{method:'POST',headers:{'content-type':'application/json','x-bali-key':code},body:JSON.stringify({origin,destination})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'route');
      const leave=endMin(source),arrival=leave+j.duration_min,suggest=ceil5(arrival);
      if(suggest>=24*60)throw new Error('這段路程會跨日，請手動安排。');
      routePlan={sourceId:source.id,duration:j.duration_min,distance:j.distance_km,arrival,suggest,source,destination:act||j.destination?.label||'下一站',map,applied:false};
      res.innerHTML=`<b>約 ${j.duration_min} 分・${j.distance_km} km</b><span>${source.end||source.start} 出發 → 最早 ${timeFromMins(arrival)} 抵達；建議 <strong>${timeFromMins(suggest)}</strong> 開始。</span><small>估算來源：OpenStreetMap / OSRM；實際路況仍以當下 Google Maps / Grab 為準。</small>`;
      document.getElementById('v17RouteApply').style.display='block';
    }catch(e){routePlan=null;res.textContent=`目前無法估算：${String(e.message||e)}`;document.getElementById('v17RouteApply').style.display='none'}
    finally{btn.disabled=false;btn.textContent='計算路程＋建議開始時間'}
  }

  function applyRoutePlan(){
    if(!routePlan)return;
    routePlan.applied=true;
    document.getElementById('editStart').value=timeFromMins(routePlan.suggest);
    if(!document.getElementById('editEnd').value)document.getElementById('editEnd').value=timeFromMins(Math.min(1439,routePlan.suggest+60));
    const res=document.getElementById('v17RouteResult');
    res.insertAdjacentHTML('beforeend','<em>已套用；儲存時會自動加入一段交通行程。</em>');
  }

  window.saveEditor=function(){
    ensureEditorFields();
    const start=document.getElementById('editStart').value,act=document.getElementById('editActivity').value.trim();
    if(!start||!act)return alert('請填開始時間和要做什麼');
    let end=document.getElementById('editEnd').value;if(!end)end=timeFromMins((mins(start)+60)%1440);
    const map=document.getElementById('editMap').value.trim(),note=document.getElementById('editNote').value.trim();
    snapshot('編輯行程');
    if(routePlan?.applied){
      const src=events.find(x=>x.id===routePlan.sourceId);
      const travelStart=src?.end||src?.start;
      if(src&&travelStart){
        const travelEnd=timeFromMins(Math.min(1439,mins(travelStart)+routePlan.duration));
        const existing=events.find(x=>x.autoRouteFor===editId&&x.sourceEventId===src.id);
        const travel={date:editDate,start:travelStart,end:travelEnd,activity:`前往 ${act}`,kind:'transport',major:false,status:'none',map,place:`${src.activity} → ${act}`,travel:`約 ${routePlan.duration} 分・${routePlan.distance} km`,note:'自動估算交通',sourceEventId:src.id,autoRouteFor:editId||'pending'};
        if(existing)Object.assign(existing,travel);else events.push({id:'route'+Date.now(),...travel});
      }
    }
    if(editId){const e=events.find(x=>x.id===editId);Object.assign(e,{start,end,activity:act,map,note})}
    else{
      const id='c'+Date.now();events.push({id,date:editDate,start,end,activity:act,kind:'activity',major:false,status:'todo',map,place:act,travel:'',note});
      events.forEach(x=>{if(x.autoRouteFor==='pending'&&x.date===editDate&&x.activity===`前往 ${act}`)x.autoRouteFor=id});
    }
    saveEvents();routePlan=null;closeModal('editModal');renderAll();showToast('行程已更新');
  };

  function overlapLayout(){
    const col=100/7;
    for(const [di,d] of DAYS.entries()){
      const list=events.filter(e=>e.date===d[0]).sort((a,b)=>mins(a.start)-mins(b.start));
      let group=[],groupEnd=-1;
      const flush=()=>{
        if(!group.length)return;
        const laneEnds=[],assigned=[];
        for(const e of group){
          const s=mins(e.start),en=s+duration(e);let lane=laneEnds.findIndex(v=>v<=s);if(lane<0)lane=laneEnds.length;laneEnds[lane]=en;assigned.push({e,lane})
        }
        const lanes=Math.max(1,laneEnds.length),laneW=col/lanes;
        for(const a of assigned){
          const el=document.querySelector(`#weekBody .eventblock[data-id="${CSS.escape(String(a.e.id))}"]`);if(!el)continue;
          el.style.left=`calc(${di*col+a.lane*laneW}% + 2px)`;
          el.style.width=`calc(${laneW}% - 4px)`;
          el.classList.toggle('v17-overlap',lanes>1);
        }
        group=[];groupEnd=-1;
      };
      for(const e of list){const s=mins(e.start),en=s+duration(e);if(group.length&&s>=groupEnd)flush();group.push(e);groupEnd=Math.max(groupEnd,en)}flush();
    }
  }
  const baseRenderWeek=window.renderWeek;
  window.renderWeek=function(){const r=baseRenderWeek();requestAnimationFrame(overlapLayout);return r};

  function ensureReminderUI(){
    if(document.getElementById('v17Reminder'))return;
    const anchor=document.getElementById('v15WeatherHome')||document.querySelector('#home .nextbox');if(!anchor)return;
    const box=document.createElement('div');box.id='v17Reminder';box.className='v17-reminder';
    box.innerHTML='<div><b>20 分鐘前提醒</b><span id="v17ReminderStatus">檢查中…</span></div><button class="btn secondary small" id="v17ReminderBtn">開啟</button>';
    anchor.insertAdjacentElement('afterend',box);
    document.getElementById('v17ReminderBtn').onclick=toggleReminder;
    refreshReminderState();
  }

  function urlBase64ToUint8Array(base64String){
    const padding='='.repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }
  async function getSub(){try{const reg=await navigator.serviceWorker.ready;return await reg.pushManager.getSubscription()}catch{return null}}
  async function refreshReminderState(){
    const status=document.getElementById('v17ReminderStatus'),btn=document.getElementById('v17ReminderBtn');if(!status||!btn)return;
    if(!('Notification'in window)||!('PushManager'in window)){status.textContent='這個裝置不支援通知';btn.disabled=true;return}
    const sub=await getSub();
    if(Notification.permission==='granted'&&sub){status.textContent='已開啟・每一步 20 分鐘前';btn.textContent='關閉';btn.dataset.on='1'}
    else{status.textContent='未開啟';btn.textContent='開啟';btn.dataset.on='0'}
  }

  async function registerPush(sub){
    const j=sub.toJSON(),code=getCode();if(!code)throw new Error('請先完成共享同步');
    const body={endpoint:j.endpoint,p256dh:j.keys?.p256dh,auth:j.keys?.auth,device_id:getDevice(),enabled:true,last_error:null};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/bali_push_subscriptions?on_conflict=endpoint`,{method:'POST',headers:{apikey:SUPABASE_KEY,'x-bali-key':code,'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('通知註冊失敗');
  }
  async function disablePush(sub){
    const code=getCode();if(!code)return;
    await fetch(`${SUPABASE_URL}/rest/v1/bali_push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,{method:'PATCH',headers:{apikey:SUPABASE_KEY,'x-bali-key':code,'content-type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({enabled:false})}).catch(()=>{});
    await sub.unsubscribe().catch(()=>{});
  }

  async function toggleReminder(){
    const btn=document.getElementById('v17ReminderBtn'),status=document.getElementById('v17ReminderStatus');
    btn.disabled=true;
    try{
      const existing=await getSub();
      if(existing&&btn.dataset.on==='1'){await disablePush(existing);status.textContent='已關閉';return}
      if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('這個瀏覽器不支援背景通知');
      const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
      if(isIOS&&!standalone)throw new Error('iPhone 要先「加入主畫面」，再從主畫面的 App 開啟提醒');
      const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('需要允許通知權限');
      const code=getCode();if(!code)throw new Error('請先完成兩人共享同步');
      status.textContent='正在註冊提醒…';
      const kr=await fetch(`${SUPABASE_URL}/functions/v1/bali-reminders`,{headers:{'x-bali-key':code}}),kj=await kr.json();if(!kr.ok||!kj.publicKey)throw new Error('無法取得通知金鑰');
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(kj.publicKey)});
      await registerPush(sub);status.textContent='已開啟・每一步 20 分鐘前';if(typeof showToast==='function')showToast('20 分鐘提醒已開啟');
    }catch(e){status.textContent=String(e.message||e);if(typeof showToast==='function')showToast(String(e.message||e))}
    finally{btn.disabled=false;refreshReminderState()}
  }

  const baseShow=window.showPage;
  window.showPage=function(id){const r=baseShow(id);setTimeout(()=>{ensureReminderUI();if(id==='daily')decorateRoute(document.querySelector('#daily .route-fixed'),selectedDay);if(id==='week')overlapLayout()},0);return r};

  ensureEditorFields();ensureReminderUI();
  setTimeout(()=>{decorateRoute(document.querySelector('#daily .route-fixed'),selectedDay);if(document.getElementById('week')?.classList.contains('active'))overlapLayout()},300);
})();
