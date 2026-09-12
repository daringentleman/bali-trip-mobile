(()=>{
  /* Remove the old daily swipe listener by replacing the section node once. */
  const oldDaily=document.getElementById('daily');
  if(!oldDaily)return;
  const freshDaily=oldDaily.cloneNode(true);
  oldDaily.replaceWith(freshDaily);

  const baseRenderDaily=window.renderDaily;
  let gesture=null,preview=null,animating=false;

  function routeMarkup(day){
    const list=events.filter(e=>e.date===day).sort((a,b)=>mins(a.start)-mins(b.start));
    return list.map(e=>`<div class="stop"><i class="dot"></i><div class="t">${esc(e.start)}${e.end?`–${esc(e.end)}`:''}</div><h4>${esc(e.activity)}</h4><div class="desc">${esc(e.place||'')}</div>${e.map?`<span class="navlink">地圖</span>`:''}</div>`).join('') || `<div class="muted">這一天還沒有行程。</div>`;
  }

  function cleanupPreview(){
    const current=document.querySelector('#daily .route-fixed');
    if(current){
      current.classList.remove('daily-swipe-current');
      current.style.transition='';
      current.style.transform='';
    }
    preview?.remove();
    preview=null;
    gesture=null;
    animating=false;
  }

  function neighbor(dir){
    const i=DAYS.findIndex(d=>d[0]===selectedDay),ni=i+dir;
    return ni>=0&&ni<DAYS.length?DAYS[ni][0]:null;
  }

  function framePreview(current,p){
    /* The preview must occupy exactly the same rectangle as the current
       itinerary card. Using inset:0 made it size itself to the whole daily
       page, which is why the next day could appear vertically shifted/cropped. */
    p.style.setProperty('top',current.offsetTop+'px','important');
    p.style.setProperty('left',current.offsetLeft+'px','important');
    p.style.setProperty('right','auto','important');
    p.style.setProperty('bottom','auto','important');
    p.style.setProperty('width',current.offsetWidth+'px','important');
    p.style.setProperty('height',current.offsetHeight+'px','important');
    p.style.setProperty('min-height','0','important');
    p.style.setProperty('max-height','none','important');
  }

  function ensurePreview(dir){
    const day=neighbor(dir);if(!day)return null;
    const current=document.querySelector('#daily .route-fixed');if(!current)return null;
    if(preview&&preview.dataset.day===day){framePreview(current,preview);return preview}
    preview?.remove();
    preview=current.cloneNode(true);
    preview.classList.add('daily-route-preview');
    preview.classList.remove('daily-swipe-current');
    preview.dataset.day=day;
    preview.style.transition='none';
    preview.style.transform='none';
    const list=preview.querySelector('.route-list');
    if(list)list.innerHTML=routeMarkup(day);
    current.parentNode.insertBefore(preview,current.nextSibling);
    framePreview(current,preview);
    return preview;
  }

  function position(dx,withAnim=false){
    const current=document.querySelector('#daily .route-fixed');
    if(!current||!gesture)return;
    const w=current.offsetWidth,dir=gesture.dir;
    const p=ensurePreview(dir);if(!p)return;
    framePreview(current,p);
    const tr=withAnim?'transform 220ms cubic-bezier(.22,.75,.25,1)':'none';
    current.style.transition=tr;
    p.style.transition=tr;
    current.style.transform=`translate3d(${dx}px,0,0)`;
    p.style.transform=`translate3d(${dir>0?w+dx:-w+dx}px,0,0)`;
  }

  function commit(dir){
    if(animating)return;
    animating=true;
    const current=document.querySelector('#daily .route-fixed'),day=neighbor(dir);
    if(!current||!day){cleanupPreview();return}
    const w=current.offsetWidth;
    position(dir>0?-w:w,true);
    setTimeout(()=>{
      selectedDay=day;
      cleanupPreview();
      baseRenderDaily();
      bindDaily();
    },225);
  }

  function cancel(){
    if(animating)return;
    animating=true;
    position(0,true);
    setTimeout(cleanupPreview,225);
  }

  function bindDaily(){
    const page=document.getElementById('daily');
    if(!page||page.dataset.v14Swipe==='1')return;
    page.dataset.v14Swipe='1';

    page.addEventListener('touchstart',e=>{
      if(animating||!page.classList.contains('active')||e.touches.length!==1)return;
      const t=e.touches[0];
      gesture={sx:t.clientX,sy:t.clientY,x:t.clientX,dir:0,horizontal:false};
      document.querySelector('#daily .route-fixed')?.classList.add('daily-swipe-current');
    },{passive:true});

    page.addEventListener('touchmove',e=>{
      if(!gesture||animating)return;
      const t=e.touches[0],dx=t.clientX-gesture.sx,dy=t.clientY-gesture.sy;
      gesture.x=t.clientX;
      if(!gesture.horizontal){
        if(Math.abs(dx)<7)return;
        if(Math.abs(dx)<=Math.abs(dy)*1.12){gesture=null;return}
        gesture.horizontal=true;
      }
      e.preventDefault();
      const dir=dx<0?1:-1;
      gesture.dir=dir;
      if(!neighbor(dir)){position(dx*.22,false);return}
      /* Follow the finger 1:1 so both full cards stay edge-to-edge. */
      position(dx,false);
    },{passive:false});

    page.addEventListener('touchend',()=>{
      if(!gesture||animating)return;
      if(!gesture.horizontal){cleanupPreview();return}
      const dx=gesture.x-gesture.sx,dir=gesture.dir;
      if(neighbor(dir)&&Math.abs(dx)>55)commit(dir);else cancel();
    },{passive:true});

    page.addEventListener('touchcancel',()=>{
      if(gesture&&!animating)cancel();
    },{passive:true});
  }

  window.renderDaily=function(){
    cleanupPreview();
    baseRenderDaily();
    bindDaily();
  };

  bindDaily();
})();
