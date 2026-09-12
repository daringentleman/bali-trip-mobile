(()=>{
  const SUPABASE_URL='https://ntnwbecchicbbhrqrdhg.supabase.co';
  const SUPABASE_KEY='sb_publishable_dFRl3bsOd6TvVZqOCIBzpA_BWPnUWSv';
  const SYNC_CODE_KEY='bali_sync_code_v1';
  const DEVICE_KEY='bali_sync_device_v1';
  let routePlan=null;

  const getCode=()=>localStorage.getItem(SYNC_CODE_KEY)||'';
  const getDevice=()=>localStorage.getItem(DEVICE_KEY)||'';
  const ceil5=m=>Math.ceil(m/5)*5;
  const endMin=e=>mins(e.end||e.start);

  function ensureEditorFields(){
    const form=document.querySelector('#editModal .form');
    if(!form)return;
    if(!document.getElementById('editNote')){
      const activity=document.getElementById('editActivity')?.closest('label');
      const label=document.createElement('label');
      label.innerHTML='<div class="flabel">備註</div><textarea class="field v18-note-input" id="editNote" rows="2" placeholder="例如：靠窗、記得帶訂位截圖、不要太辣"></textarea>';
      activity?.insertAdjacentElement('afterend',label);
    }
    if(!document.getElementById('v18RoutePlanner')){
      const mapLabel=document.getElementById('editMap')?.closest('label');
      const box=document.createElement('div');
      box.id='v18RoutePlanner';box.className='v18-route-planner';
      box.innerHTML=`<div class="v18-route-title">幫我排交通時間</div>
        <div class="v18-route-sub">選「上一站」，再輸入這一站的餐廳／景點名稱或 Google Maps 連結。</div>
        <select class="field" id="v18RouteFrom"></select>
        <button type="button" class="btn secondary v18-route-calc" id="v18RouteCalc">計算距離＋最適合開始時間</button>
        <div class="v18-route-result" id="v18RouteResult"></div>
        <button type="button" class="btn v18-route-apply" id="v18RouteApply" style="display:none">套用建議時間＋加入交通行程</button>`;
      mapLabel?.insertAdjacentElement('afterend',box);
      document.getElementById('v18RouteCalc').onclick=estimateRoute;
      document.getElementById('v18RouteApply').onclick=applyRoutePlan;
    }
  }

  function dayEvents(day,excludeId=null){
    return events.filter(e=>e.date===day&&e.id!==excludeId).sort((a,b)=>mins(a.start)-mins(b.start));
  }

  function fillRouteSources(){
    ensureEditorFields();
    const sel=document.getElementById('v18RouteFrom');if(!sel)return;
    const list=dayEvents(editDate,editId);
    if(!list.length){sel.innerHTML='<option value="">這一天還沒有上一站</option>';return}
    sel.innerHTML=list.map(e=>`<option value="${esc(String(e.id))}">${esc(e.end||e.start)}｜${esc(shortTitle(e.activity))}</option>`).join('');
    const start=document.getElementById('editStart')?.value||'';
    let chosen=list[list.length-1];
    if(start){const before=list.filter(e=>endMin(e)<=mins(start));if(before.length)chosen=before[before.length-1]}
    sel.value=String(chosen.id);
  }

  function resetRouteResult(){
    routePlan=null;
    const r=document.getElementById('v18RouteResult'),a=document.getElementById('v18RouteApply');
    if(r)r.innerHTML='';if(a)a.style.display='none';
  }

  function decorateDaily(){
    const root=document.querySelector('#daily .route-list');if(!root)return;
    const list=events.filter(e=>e.date===selectedDay).sort((a,b)=>mins(a.start)-mins(b.start));
    [...root.querySelectorAll('.stop')].forEach((stop,i)=>{
      const e=list[i],t=stop.querySelector('.t');if(!e||!t)return;
      let pill=t.querySelector('.v18-note-pill');
      if(!pill){pill=document.createElement('span');pill.className='v18-note-pill';t.appendChild(pill)}
      pill.textContent=e.note?`備註・${e.note}`:'備註＋';
      pill.classList.toggle('empty',!e.note);
    });
  }

  const baseRenderDaily=window.renderDaily;
  window.renderDaily=function(){
    const out=baseRenderDaily();
    requestAnimationFrame(decorateDaily);
    return out;
  };

  const baseOpenEditor=window.openEditor;
  window.openEditor=function(id){
    ensureEditorFields();
    const out=baseOpenEditor(id);
    const e=events.find(x=>x.id===id);
    document.getElementById('editNote').value=e?.note||'';
    resetRouteResult();fillRouteSources();
    return out;
  };

  window.openEditorForDay=function(){
    ensureEditorFields();
    editId=null;editDate=selectedDay;
    document.getElementById('editHeading').textContent=`新增 ${dayLabel(selectedDay)} 行程`;
    document.getElementById('editStart').value='';
    document.getElementById('editEnd').value='';
    document.getElementById('editActivity').value='';
    document.getElementById('editMap').value='';
    document.getElementById('editNote').value='';
    document.getElementById('deleteBtn').style.display='none';
    resetRouteResult();fillRouteSources();openModal('editModal');
  };

  async function estimateRoute(){
    const sourceId=document.getElementById('v18RouteFrom')?.value||'';
    const source=events.find(e=>String(e.id)===sourceId);
    const act=document.getElementById('editActivity')?.value.trim()||'';
    const map=document.getElementById('editMap')?.value.trim()||'';
    const res=document.getElementById('v18RouteResult'),btn=document.getElementById('v18RouteCalc');
    if(!source){res.textContent='先選擇上一站。';return}
    if(!act&&!map){res.textContent='先輸入餐廳／景點名稱，或貼 Google Maps 連結。';return}
    const code=getCode();if(!code){res.textContent='共享同步尚未連線，請先重新連上共享資料。';return}
    const origin=source.map||source.place||source.activity;
    const destination=map||act;
    btn.disabled=true;btn.textContent='計算中…';res.textContent='正在估算開車／Grab 距離…';
    try{
      const r=await fetch(`${SUPABASE_URL}/functions/v1/bali-route-estimate`,{method:'POST',headers:{'content-type':'application/json','x-bali-key':code},body:JSON.stringify({origin,destination})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'目前無法估算');
      const leave=endMin(source),arrival=leave+Number(j.duration_min||0),suggest=ceil5(arrival+8);
      if(suggest>=1440)throw new Error('這段行程會跨日，請手動安排。');
      routePlan={sourceId:String(source.id),duration:Number(j.duration_min),distance:Number(j.distance_km),leave,arrival,suggest,map,destination:act||j.destination?.label||'下一站'};
      res.innerHTML=`<b>${source.end||source.start} 出發｜約 ${routePlan.duration} 分・${routePlan.distance} km</b><span>最早 ${timeFromMins(arrival)} 抵達；含下車／找店緩衝，建議 <strong>${timeFromMins(suggest)}</strong> 開始。</span><small>基準路程：OpenStreetMap / OSRM。實際塞車仍以當下 Google Maps / Grab 為準。</small>`;
      document.getElementById('v18RouteApply').style.display='block';
    }catch(e){routePlan=null;res.textContent=`目前無法估算：${String(e.message||e)}`;document.getElementById('v18RouteApply').style.display='none'}
    finally{btn.disabled=false;btn.textContent='計算距離＋最適合開始時間'}
  }

  function applyRoutePlan(){
    if(!routePlan)return;
    routePlan.applied=true;
    document.getElementById('editStart').value=timeFromMins(routePlan.suggest);
    if(!document.getElementById('editEnd').value)document.getElementById('editEnd').value=timeFromMins(Math.min(1439,routePlan.suggest+60));
    const res=document.getElementById('v18RouteResult');
    if(res&&!res.querySelector('em'))res.insertAdjacentHTML('beforeend','<em>已套用。儲存後會另外加入一格「交通」行程。</em>');
  }

  window.saveEditor=function(){
    ensureEditorFields();
    const start=document.getElementById('editStart').value,act=document.getElementById('editActivity').value.trim();
    if(!start||!act)return alert('請填開始時間和要做什麼');
    let end=document.getElementById('editEnd').value;if(!end)end=timeFromMins(Math.min(1439,mins(start)+60));
    const map=document.getElementById('editMap').value.trim(),note=document.getElementById('editNote').value.trim();
    snapshot('編輯行程');
    let targetId=editId;
    if(editId){const e=events.find(x=>x.id===editId);if(e)Object.assign(e,{start,end,activity:act,map,note})}
    else{targetId='c'+Date.now();events.push({id:targetId,date:editDate,start,end,activity:act,kind:'activity',major:false,status:'todo',map,place:act,travel:'',note})}

    if(routePlan?.applied){
      const src=events.find(x=>String(x.id)===routePlan.sourceId);
      if(src){
        const travelStart=src.end||src.start;
        const travelEnd=timeFromMins(Math.min(1439,mins(travelStart)+routePlan.duration));
        const existing=events.find(x=>x.autoRouteFor===targetId&&String(x.sourceEventId)===String(src.id));
        const travel={date:editDate,start:travelStart,end:travelEnd,activity:`前往 ${act}`,kind:'transport',major:false,status:'none',map,place:`${src.activity} → ${act}`,travel:`約 ${routePlan.duration} 分・${routePlan.distance} km`,note:'自動估算交通',sourceEventId:src.id,autoRouteFor:targetId};
        if(existing)Object.assign(existing,travel);else events.push({id:'route'+Date.now(),...travel});
      }
    }

    events.sort((a,b)=>whenMs(a)-whenMs(b));
    saveEvents();resetRouteResult();closeModal('editModal');renderAll();showToast('行程已更新');
  };

  function layoutWeekOverlaps(){
    const blocks=new Map([...document.querySelectorAll('#weekBody .eventblock')].map(el=>[String(el.dataset.id),el]));
    const col=100/7;
    DAYS.forEach((d,di)=>{
      const list=events.filter(e=>e.date===d[0]).sort((a,b)=>mins(a.start)-mins(b.start));
      let group=[],groupEnd=-1;
      const flush=()=>{
        if(!group.length)return;
        const laneEnds=[],assign=[];
        group.forEach(e=>{
          const s=mins(e.start),en=s+duration(e);let lane=laneEnds.findIndex(v=>v<=s);if(lane<0)lane=laneEnds.length;laneEnds[lane]=en;assign.push({e,lane});
        });
        const lanes=Math.max(1,laneEnds.length),laneW=col/lanes;
        assign.forEach(({e,lane})=>{
          const el=blocks.get(String(e.id));if(!el)return;
          el.style.left=`calc(${di*col+lane*laneW}% + 2px)`;
          el.style.width=`calc(${laneW}% - 4px)`;
          el.classList.toggle('v18-overlap',lanes>1);
        });
        group=[];groupEnd=-1;
      };
      list.forEach(e=>{const s=mins(e.start),en=s+duration(e);if(group.length&&s>=groupEnd)flush();group.push(e);groupEnd=Math.max(groupEnd,en)});flush();
    });
  }

  const baseRenderWeek=window.renderWeek;
  window.renderWeek=function(){const out=baseRenderWeek();requestAnimationFrame(layoutWeekOverlaps);return out};

  function urlBase64ToUint8Array(s){
    const padding='='.repeat((4-s.length%4)%4),b=(s+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b);
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }
  async function currentPushSub(){try{const reg=await navigator.serviceWorker.ready;return await reg.pushManager.getSubscription()}catch{return null}}

  function ensureReminderUI(){
    if(document.getElementById('v18Reminder'))return true;
    const anchor=document.getElementById('v15WeatherHome')||document.querySelector('#home .nextbox');if(!anchor)return false;
    const box=document.createElement('div');box.id='v18Reminder';box.className='v18-reminder';
    box.innerHTML='<div><b>20 分鐘前提醒</b><span id="v18ReminderStatus">未開啟</span></div><button class="btn secondary small" id="v18ReminderBtn">開啟</button>';
    anchor.insertAdjacentElement('afterend',box);
    document.getElementById('v18ReminderBtn').onclick=toggleReminder;
    refreshReminderState();return true;
  }

  async function refreshReminderState(){
    const status=document.getElementById('v18ReminderStatus'),btn=document.getElementById('v18ReminderBtn');if(!status||!btn)return;
    if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator)){status.textContent='此裝置不支援背景通知';btn.disabled=true;return}
    const sub=await currentPushSub();
    const on=Notification.permission==='granted'&&!!sub;
    status.textContent=on?'已開啟・每一步開始前約 20 分鐘':'未開啟';btn.textContent=on?'關閉':'開啟';btn.dataset.on=on?'1':'0';
  }

  async function savePushSubscription(sub){
    const j=sub.toJSON(),code=getCode();if(!code)throw new Error('請先完成兩人共享同步');
    const body={endpoint:j.endpoint,p256dh:j.keys?.p256dh,auth:j.keys?.auth,device_id:getDevice(),enabled:true,last_error:null};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/bali_push_subscriptions?on_conflict=endpoint`,{method:'POST',headers:{apikey:SUPABASE_KEY,'x-bali-key':code,'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('通知註冊失敗');
  }

  async function disablePush(sub){
    const code=getCode();
    if(code)await fetch(`${SUPABASE_URL}/rest/v1/bali_push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,{method:'PATCH',headers:{apikey:SUPABASE_KEY,'x-bali-key':code,'content-type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({enabled:false})}).catch(()=>{});
    await sub.unsubscribe().catch(()=>{});
  }

  async function toggleReminder(){
    const btn=document.getElementById('v18ReminderBtn'),status=document.getElementById('v18ReminderStatus');if(!btn||!status)return;
    btn.disabled=true;
    try{
      const existing=await currentPushSub();
      if(existing&&btn.dataset.on==='1'){await disablePush(existing);showToast('20 分鐘提醒已關閉');return}
      const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
      if(isIOS&&!standalone)throw new Error('iPhone 請先「加入主畫面」，再從主畫面 App 開啟通知');
      const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('需要允許通知權限');
      const code=getCode();if(!code)throw new Error('請先完成兩人共享同步');
      status.textContent='正在開啟…';
      const kr=await fetch(`${SUPABASE_URL}/functions/v1/bali-reminders`,{headers:{'x-bali-key':code}}),kj=await kr.json();
      if(!kr.ok||!kj.publicKey)throw new Error('無法取得通知金鑰');
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(kj.publicKey)});
      await savePushSubscription(sub);showToast('20 分鐘提醒已開啟');
    }catch(e){showToast(String(e.message||e));status.textContent=String(e.message||e)}
    finally{btn.disabled=false;refreshReminderState()}
  }

  const baseShow=window.showPage;
  window.showPage=function(id){
    const out=baseShow(id);
    setTimeout(()=>{if(id==='daily')decorateDaily();if(id==='week')layoutWeekOverlaps();if(id==='home')ensureReminderUI()},0);
    return out;
  };

  ensureEditorFields();
  requestAnimationFrame(decorateDaily);
  [100,500,1500].forEach(ms=>setTimeout(ensureReminderUI,ms));
})();
