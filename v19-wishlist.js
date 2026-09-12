(()=>{
  const SUPABASE_URL='https://ntnwbecchicbbhrqrdhg.supabase.co';
  const SUPABASE_KEY='sb_publishable_dFRl3bsOd6TvVZqOCIBzpA_BWPnUWSv';
  const SYNC_CODE_KEY='bali_sync_code_v1';
  const DEVICE_KEY='bali_sync_device_v1';
  const STORAGE_KEY='bali_wishlist_v1';
  const MODE_KEY='bali_list_mode_v1';
  const BUCKET='wishlist';
  const WEEK_PPM=.55;
  let listMode=localStorage.getItem(MODE_KEY)||'pack';
  let wishlist=loadWishlist();
  let syncing=false,placingWishId=null,pollTimer=null;

  const code=()=>localStorage.getItem(SYNC_CODE_KEY)||'';
  const device=()=>localStorage.getItem(DEVICE_KEY)||'';
  const apiHeaders=()=>({apikey:SUPABASE_KEY,'x-bali-key':code(),'content-type':'application/json'});
  const now=()=>Date.now();
  const safe=s=>typeof esc==='function'?esc(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function loadWishlist(){
    try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(a)?a:[]}catch{return[]}
  }
  function saveWishlist(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(wishlist));
    renderWishlist();
  }
  function activeWishlist(){return wishlist.filter(x=>x&&!x.deleted).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))}
  function getWish(id){return wishlist.find(x=>String(x.id)===String(id))}

  function renamePackingPage(){
    const nav=document.querySelector('.navitem[data-page="packing"]');
    if(nav){const spans=nav.querySelectorAll('span');if(spans.length)spans[spans.length-1].textContent='清單'}
    const h=document.querySelector('#packing .topbar h1');if(h)h.textContent='清單';
    const p=document.querySelector('#packing .topbar p');if(p)p.textContent='出發清單＋願望清單';
  }

  function ensureListUI(){
    const page=document.getElementById('packing');if(!page)return false;
    renamePackingPage();
    if(document.getElementById('v19ListSwitch'))return true;
    const topbar=page.querySelector('.topbar');if(!topbar)return false;
    const sw=document.createElement('div');sw.id='v19ListSwitch';sw.className='v19-list-switch';
    sw.innerHTML='<button data-mode="pack">出發清單</button><button data-mode="wish">願望清單</button>';
    topbar.insertAdjacentElement('afterend',sw);

    const old=[...page.children].filter(n=>n!==topbar&&n!==sw);
    const packWrap=document.createElement('div');packWrap.id='v19PackPanel';
    old.forEach(n=>packWrap.appendChild(n));
    page.appendChild(packWrap);

    const wish=document.createElement('div');wish.id='v19WishPanel';wish.className='v19-wish-panel';
    wish.innerHTML=`
      <div class="section-head v19-wish-head"><div><h3>願望清單</h3><span>還沒決定哪一天的餐廳／景點先放這裡</span></div></div>
      <div class="card v19-wish-addcard">
        <label><div class="flabel">名稱（可留白）</div><input class="field" id="v19WishName" placeholder="例如：Made's Warung"></label>
        <label><div class="flabel">Google Maps 連結</div><input class="field" id="v19WishUrl" inputmode="url" placeholder="貼上 maps.app.goo.gl 或 Google Maps 連結"></label>
        <label><div class="flabel">類型</div><select class="field" id="v19WishType"><option value="restaurant">餐廳</option><option value="attraction">景點</option><option value="cafe">咖啡廳</option><option value="other">其他</option></select></label>
        <button class="btn" id="v19WishAdd">加入願望清單</button>
        <div class="v19-wish-addstatus" id="v19WishAddStatus"></div>
      </div>
      <div id="v19WishList" class="v19-wish-list"></div>`;
    page.appendChild(wish);

    sw.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setListMode(b.dataset.mode||'pack')));
    document.getElementById('v19WishAdd').addEventListener('click',addWishlistItem);
    setListMode(listMode,false);
    renderWishlist();
    return true;
  }

  function setListMode(mode,persist=true){
    listMode=mode==='wish'?'wish':'pack';
    if(persist)localStorage.setItem(MODE_KEY,listMode);
    const packPanel=document.getElementById('v19PackPanel'),wishPanel=document.getElementById('v19WishPanel');
    if(packPanel)packPanel.style.display=listMode==='pack'?'block':'none';
    if(wishPanel)wishPanel.style.display=listMode==='wish'?'block':'none';
    document.querySelectorAll('#v19ListSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.mode===listMode));
  }

  function typeLabel(t){return t==='restaurant'?'餐廳':t==='attraction'?'景點':t==='cafe'?'咖啡廳':'其他'}
  function eventForWish(id){return events.find(e=>String(e.wishlistId||'')===String(id))}
  function dayShort(date){const d=DAYS.find(x=>x[0]===date);return d?`${d[1]} ${d[2]}`:date.slice(5)}

  function renderWishlist(){
    const root=document.getElementById('v19WishList');if(!root)return;
    const arr=activeWishlist();
    if(!arr.length){root.innerHTML='<div class="card v19-wish-empty">先把還沒決定日期的餐廳／景點丟進來。之後按「排進行程」，直接到總覽點空白時間就能放進去。</div>';return}
    root.innerHTML=arr.map(item=>{
      const scheduled=eventForWish(item.id);
      return `<div class="card v19-wish-item" data-id="${safe(item.id)}">
        <div class="v19-wish-main">
          <div class="v19-wish-type">${safe(typeLabel(item.type))}</div>
          <b>${safe(item.name||'Google Maps 地點')}</b>
          <span>${scheduled?`已排｜${safe(dayShort(scheduled.date))} ${safe(scheduled.start)}`:'尚未排行程'}</span>
        </div>
        <div class="v19-wish-actions">
          ${item.url?`<button class="btn secondary small" data-act="map">地圖</button>`:''}
          <button class="btn secondary small" data-act="edit">編輯</button>
          <button class="btn small" data-act="place">${scheduled?'再排一次':'排進行程'}</button>
          <button class="xbtn" data-act="delete" aria-label="刪除">✕</button>
        </div>
      </div>`
    }).join('');
    root.querySelectorAll('.v19-wish-item').forEach(card=>{
      const id=card.dataset.id;
      card.querySelector('[data-act="map"]')?.addEventListener('click',()=>openWishMap(id));
      card.querySelector('[data-act="edit"]')?.addEventListener('click',()=>editWish(id));
      card.querySelector('[data-act="place"]')?.addEventListener('click',()=>beginWishPlacement(id));
      card.querySelector('[data-act="delete"]')?.addEventListener('click',()=>deleteWish(id));
    });
  }

  function fallbackNameFromUrl(raw){
    try{
      const u=new URL(raw);const q=u.searchParams.get('query')||u.searchParams.get('q');if(q)return decodeURIComponent(q.replace(/\+/g,' '));
      const m=u.pathname.match(/\/place\/([^/]+)/i);if(m?.[1])return decodeURIComponent(m[1]).replace(/\+/g,' ')
    }catch{}
    return '';
  }

  async function resolvePlace(raw){
    if(!raw)return {name:'',url:''};
    if(!code())return {name:fallbackNameFromUrl(raw),url:raw};
    try{
      const r=await fetch(`${SUPABASE_URL}/functions/v1/bali-place-resolve`,{method:'POST',headers:{'content-type':'application/json','x-bali-key':code()},body:JSON.stringify({url:raw})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'resolve');return j;
    }catch{return {name:fallbackNameFromUrl(raw),url:raw}}
  }

  async function addWishlistItem(){
    const nameEl=document.getElementById('v19WishName'),urlEl=document.getElementById('v19WishUrl'),typeEl=document.getElementById('v19WishType'),status=document.getElementById('v19WishAddStatus'),btn=document.getElementById('v19WishAdd');
    const typed=(nameEl.value||'').trim(),rawUrl=(urlEl.value||'').trim();
    if(!typed&&!rawUrl){status.textContent='至少輸入名稱或貼一個 Google Maps 連結。';return}
    btn.disabled=true;btn.textContent='加入中…';status.textContent=rawUrl?'正在讀取 Google Maps 地點…':'';
    const resolved=rawUrl?await resolvePlace(rawUrl):{name:'',url:''};
    const item={id:`wish_${device()||'local'}_${Date.now().toString(36)}`,name:typed||resolved.name||'Google Maps 地點',url:resolved.url||rawUrl,type:typeEl.value||'other',updatedAt:now(),createdAt:now(),deleted:false};
    wishlist.push(item);saveWishlist();await pushWish(item).catch(()=>{});
    nameEl.value='';urlEl.value='';status.textContent='已加入願望清單';btn.disabled=false;btn.textContent='加入願望清單';
    setTimeout(()=>{if(status.textContent==='已加入願望清單')status.textContent=''},1400);
  }

  function openWishMap(id){const item=getWish(id);if(item?.url)window.open(item.url,'_blank','noopener')}
  function editWish(id){
    const item=getWish(id);if(!item)return;
    const name=prompt('名稱',item.name||'');if(name===null)return;
    const url=prompt('Google Maps 連結',item.url||'');if(url===null)return;
    item.name=name.trim()||item.name||'Google Maps 地點';item.url=url.trim();item.updatedAt=now();
    saveWishlist();pushWish(item).catch(()=>{});
  }
  function deleteWish(id){
    const item=getWish(id);if(!item)return;if(!confirm(`刪除「${item.name||'這個地點'}」？`))return;
    item.deleted=true;item.updatedAt=now();saveWishlist();pushWish(item).catch(()=>{});
  }

  async function fetchRemoteWishlist(){
    if(!code()||!navigator.onLine)return [];
    const r=await fetch(`${SUPABASE_URL}/rest/v1/bali_sync_items?bucket=eq.${BUCKET}&select=item_id,payload,deleted,updated_at&order=updated_at.asc`,{headers:apiHeaders(),cache:'no-store'});
    if(!r.ok)throw new Error('wishlist pull '+r.status);return await r.json();
  }
  async function pushWish(item){
    if(!code()||!navigator.onLine)return;
    const body={bucket:BUCKET,item_id:String(item.id),payload:item,deleted:!!item.deleted,device_id:device()||'wishlist'};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/bali_sync_items?on_conflict=bucket,item_id`,{method:'POST',headers:{...apiHeaders(),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('wishlist push '+r.status);
  }
  async function syncWishlist(){
    if(syncing||!code()||!navigator.onLine)return;syncing=true;
    try{
      const remote=await fetchRemoteWishlist();
      const rm=new Map(remote.map(r=>[String(r.item_id),r]));
      const lm=new Map(wishlist.map(i=>[String(i.id),i]));
      const ids=new Set([...rm.keys(),...lm.keys()]);const merged=[];const toPush=[];
      ids.forEach(id=>{
        const l=lm.get(id),r=rm.get(id),rp=r?.payload||null;
        if(l&&!r){merged.push(l);toPush.push(l);return}
        if(!l&&r){merged.push({...rp,deleted:!!r.deleted});return}
        if(!l||!r)return;
        const lt=Number(l.updatedAt||0),rt=Number(rp?.updatedAt||0);
        if(lt>rt){merged.push(l);toPush.push(l)}else merged.push({...rp,deleted:!!r.deleted});
      });
      wishlist=merged;saveWishlist();
      for(const item of toPush)await pushWish(item);
    }catch(e){console.warn('[Wishlist sync]',e)}finally{syncing=false}
  }

  function ensurePlacementBanner(){
    let b=document.getElementById('v19PlaceBanner');if(b)return b;
    b=document.createElement('div');b.id='v19PlaceBanner';b.className='v19-place-banner';
    b.innerHTML='<div><b id="v19PlaceTitle"></b><span>在總覽直接點空白時間；會吸附到 15 分鐘。</span></div><button class="btn secondary small" id="v19PlaceCancel">取消</button>';
    document.body.appendChild(b);document.getElementById('v19PlaceCancel').addEventListener('click',stopWishPlacement);return b;
  }
  function bindWeekPlacement(){
    const wb=document.getElementById('weekBody');if(!wb||wb.dataset.v19WishBound==='1')return;
    wb.dataset.v19WishBound='1';wb.addEventListener('click',handleWeekPlacement,true);
  }
  function beginWishPlacement(id){
    const item=getWish(id);if(!item)return;placingWishId=String(id);
    showPage('week');
    setTimeout(()=>{
      bindWeekPlacement();const b=ensurePlacementBanner();document.getElementById('v19PlaceTitle').textContent=`正在安排｜${item.name||'願望清單地點'}`;b.classList.add('show');document.body.classList.add('v19-wish-place-mode');
      if(typeof renderWeek==='function')renderWeek();
      const sc=document.getElementById('weekCalendar');if(sc){const first=Math.max(8*60,Math.min(...events.map(e=>e.date?mins(e.start):8*60)));sc.scrollTop=Math.max(0,(first-60)*WEEK_PPM)}
    },60);
  }
  function stopWishPlacement(){placingWishId=null;document.body.classList.remove('v19-wish-place-mode');document.getElementById('v19PlaceBanner')?.classList.remove('show')}
  function defaultDuration(item){return item?.type==='restaurant'?90:item?.type==='cafe'?75:item?.type==='attraction'?90:60}
  function handleWeekPlacement(ev){
    if(!placingWishId)return;
    ev.preventDefault();ev.stopPropagation();
    if(ev.target.closest('.eventblock')){showToast('這裡已有行程，請點旁邊的空白時間。');return}
    const wb=document.getElementById('weekBody'),item=getWish(placingWishId);if(!wb||!item)return;
    const r=wb.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;if(x<0||x>r.width||y<0)return;
    let di=Math.floor(x/r.width*7);di=Math.max(0,Math.min(6,di));
    let start=Math.round((y/WEEK_PPM)/15)*15;start=Math.max(0,Math.min(1425,start));
    const dur=defaultDuration(item),end=Math.min(1439,start+dur),date=DAYS[di][0];
    const conflict=events.some(e=>e.date===date&&mins(e.start)<end&&mins(e.end||e.start)>start);
    if(conflict){showToast('這個時間已有行程，請點另一個空白時段。');return}
    if(typeof snapshot==='function')snapshot('願望清單加入行程');
    const id='wishEvent'+Date.now();
    events.push({id,date,start:timeFromMins(start),end:timeFromMins(end),activity:item.name||'願望清單地點',kind:(item.type==='restaurant'||item.type==='cafe')?'food':'activity',major:false,status:'todo',map:item.url||'',place:item.name||'',travel:'',note:'從願望清單加入',wishlistId:item.id});
    events.sort((a,b)=>typeof whenMs==='function'?whenMs(a)-whenMs(b):0);saveEvents();renderAll();stopWishPlacement();
    setTimeout(()=>{const el=document.querySelector(`#weekBody .eventblock[data-id="${CSS.escape(id)}"]`);if(el){el.classList.add('v19-just-added');setTimeout(()=>el.classList.remove('v19-just-added'),1200)}},80);
    showToast(`已加入 ${dayShort(date)} ${timeFromMins(start)}`);renderWishlist();
  }

  const previousShow=window.showPage;
  window.showPage=function(id){const out=previousShow(id);if(id==='packing')requestAnimationFrame(()=>{ensureListUI();setListMode(listMode,false);renderWishlist()});if(id==='week')requestAnimationFrame(bindWeekPlacement);return out};

  function boot(){
    if(!ensureListUI())return setTimeout(boot,200);
    bindWeekPlacement();syncWishlist();if(!pollTimer)pollTimer=setInterval(syncWishlist,4000);window.addEventListener('online',syncWishlist);
  }
  setTimeout(boot,250);
})();
