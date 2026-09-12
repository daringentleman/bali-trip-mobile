(()=>{
  const WEEK_PPM=.55;
  let hold=null,dragState=null,edgeRaf=0;

  function renderBlock(e,di,col){
    const top=mins(e.start)*WEEK_PPM,ht=Math.max(30,duration(e)*WEEK_PPM);
    const cls=`eventblock ${e.major?'major':''}`;
    return `<div class="${cls}" data-id="${e.id}" style="top:${top}px;height:${ht}px;left:calc(${di*col}% + 2px);width:calc(${col}% - 4px)"><div class="et">${esc(e.start)}</div><div class="en">${esc(shortTitle(e.activity))}</div></div>`
  }

  window.renderWeek=function(){
    document.getElementById('weekHead').innerHTML=`<div class="blank"></div>`+DAYS.map(d=>`<div class="week-day"><b>${d[1]}</b><span>${d[2]}</span></div>`).join('');
    let html=`<div class="weekcols">${DAYS.map(()=>'<div class="weekcol"></div>').join('')}</div>`;
    for(let h=0;h<24;h+=2)html+=`<span class="hourlabel" style="top:${h*60*WEEK_PPM}px">${String(h).padStart(2,'0')}</span>`;
    const col=100/7;
    for(const e of [...events].sort((a,b)=>whenMs(a)-whenMs(b))){const di=DAYS.findIndex(d=>d[0]===e.date);if(di>=0)html+=renderBlock(e,di,col)}
    const wb=document.getElementById('weekBody');wb.style.height=(24*60*WEEK_PPM+240)+'px';wb.innerHTML=html;
    wb.oncontextmenu=e=>e.preventDefault();wb.onselectstart=e=>e.preventDefault();
    document.querySelectorAll('.eventblock').forEach(el=>{
      el.addEventListener('touchstart',touchStart,{passive:false});
      el.addEventListener('mousedown',mouseStart);
      el.addEventListener('click',()=>{if(el.dataset.dragged==='1'){el.dataset.dragged='0';return}openEditor(el.dataset.id)})
    })
  };

  function findTouch(list,id){for(const t of list)if(t.identifier===id)return t;return null}

  function touchStart(ev){
    if(ev.touches.length!==1)return;
    const el=ev.currentTarget,e=events.find(x=>x.id===el.dataset.id);if(!e)return;
    const t=ev.touches[0],sc=document.getElementById('weekCalendar');
    hold={type:'touch',el,e,id:t.identifier,sx:t.clientX,sy:t.clientY,lastX:t.clientX,lastY:t.clientY,startScroll:sc.scrollTop,phase:'holding'};
    hold.timer=setTimeout(()=>beginDrag(el,e,t.clientX,t.clientY),500);
    document.addEventListener('touchmove',touchMove,{passive:false});
    document.addEventListener('touchend',touchEnd,{passive:false});
    document.addEventListener('touchcancel',touchEnd,{passive:false})
  }

  function touchMove(ev){
    if(!hold)return;
    const t=findTouch(ev.touches,hold.id);if(!t)return;
    hold.lastX=t.clientX;hold.lastY=t.clientY;
    const dx=t.clientX-hold.sx,dy=t.clientY-hold.sy;
    if(hold.phase==='holding'&&Math.hypot(dx,dy)>7){clearTimeout(hold.timer);hold.phase='scrolling'}
    if(hold.phase==='scrolling'){
      ev.preventDefault();
      const sc=document.getElementById('weekCalendar');
      sc.scrollTop=Math.max(0,hold.startScroll-dy);
      return
    }
    if(hold.phase==='dragging'&&dragState){
      ev.preventDefault();
      dragState.lastX=t.clientX;dragState.lastY=t.clientY;
      moveGhost(t.clientX,t.clientY);
      previewTarget(t.clientX,t.clientY);
      edgeScroll()
    }
  }

  function touchEnd(ev){
    if(!hold)return;
    if(hold.phase==='dragging'&&dragState){ev.preventDefault();finishDrag()}
    clearTimeout(hold.timer);cleanupTouch();hold=null
  }
  function cleanupTouch(){document.removeEventListener('touchmove',touchMove);document.removeEventListener('touchend',touchEnd);document.removeEventListener('touchcancel',touchEnd)}

  function mouseStart(ev){
    if(ev.button!==0)return;
    const el=ev.currentTarget,e=events.find(x=>x.id===el.dataset.id);if(!e)return;
    hold={type:'mouse',el,e,sx:ev.clientX,sy:ev.clientY,lastX:ev.clientX,lastY:ev.clientY,phase:'holding'};
    hold.timer=setTimeout(()=>beginDrag(el,e,ev.clientX,ev.clientY),500);
    const move=me=>{if(!hold)return;hold.lastX=me.clientX;hold.lastY=me.clientY;if(hold.phase==='holding'&&Math.hypot(me.clientX-hold.sx,me.clientY-hold.sy)>7){clearTimeout(hold.timer);hold.phase='cancelled'}if(hold.phase==='dragging'&&dragState){moveGhost(me.clientX,me.clientY);previewTarget(me.clientX,me.clientY);edgeScroll()}};
    const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);if(hold?.phase==='dragging'&&dragState)finishDrag();clearTimeout(hold?.timer);hold=null};
    document.addEventListener('mousemove',move);document.addEventListener('mouseup',up,{once:true})
  }

  function beginDrag(el,e,x,y){
    if(!hold||hold.phase!=='holding')return;
    navigator.vibrate?.(20);hold.phase='dragging';el.classList.add('dragging');el.dataset.dragged='1';
    const rect=el.getBoundingClientRect(),g=el.cloneNode(true);g.classList.add('dragghost');g.classList.remove('dragging');
    g.style.left=rect.left+'px';g.style.top=rect.top+'px';g.style.width=rect.width+'px';g.style.height=rect.height+'px';document.body.appendChild(g);
    const tag=document.createElement('div');tag.className='dragdate';document.body.appendChild(tag);
    dragState={id:e.id,el,ghost:g,dateTag:tag,dur:duration(e),grabOffsetX:x-rect.left,grabOffsetY:y-rect.top,ghostW:rect.width,ghostH:rect.height,lastX:x,lastY:y,previewDate:e.date,previewMin:mins(e.start)};
    moveGhost(x,y);previewTarget(x,y)
  }

  function moveGhost(x,y){
    if(!dragState)return;
    const left=x-dragState.grabOffsetX,top=y-dragState.grabOffsetY;
    dragState.ghost.style.left=left+'px';dragState.ghost.style.top=top+'px'
  }

  function computeTarget(x,y){
    const area=document.getElementById('weekBody'),r=area.getBoundingClientRect();
    const ghostLeft=x-dragState.grabOffsetX,ghostTop=y-dragState.grabOffsetY;
    const centerX=ghostLeft+dragState.ghostW/2;
    let di=Math.floor((centerX-r.left)/r.width*7);di=Math.max(0,Math.min(6,di));
    let m=(ghostTop-r.top)/WEEK_PPM;m=Math.round(m/15)*15;m=Math.max(0,Math.min(1439-dragState.dur,m));
    return {date:DAYS[di][0],min:m}
  }

  function previewTarget(x,y){
    if(!dragState)return;
    const t=computeTarget(x,y);dragState.previewDate=t.date;dragState.previewMin=t.min;
    const timeEl=dragState.ghost.querySelector('.et');if(timeEl)timeEl.textContent=timeFromMins(t.min);
    dragState.dateTag.textContent=`${dayLabel(t.date)}・${timeFromMins(t.min)}`
  }

  function edgeScroll(){
    if(edgeRaf||!dragState)return;
    const step=()=>{
      edgeRaf=0;if(!dragState)return;
      const sc=document.getElementById('weekCalendar'),r=sc.getBoundingClientRect(),y=dragState.lastY;let delta=0;
      if(y<r.top+52)delta=-14;else if(y>r.bottom-52)delta=14;
      if(delta){sc.scrollTop=Math.max(0,sc.scrollTop+delta);previewTarget(dragState.lastX,dragState.lastY);edgeRaf=requestAnimationFrame(step)}
    };
    edgeRaf=requestAnimationFrame(step)
  }

  function finishDrag(){
    if(edgeRaf){cancelAnimationFrame(edgeRaf);edgeRaf=0}
    const e=events.find(x=>x.id===dragState.id),t=computeTarget(dragState.lastX,dragState.lastY);
    e.date=t.date;e.start=timeFromMins(t.min);e.end=timeFromMins(Math.min(1439,t.min+dragState.dur));
    dragState.el.classList.remove('dragging');dragState.ghost.remove();dragState.dateTag.remove();dragState=null;saveEvents();renderAll()
  }

  window.scrollWeekUseful=function(){
    const sc=document.getElementById('weekCalendar'),all=[...events].sort((a,b)=>mins(a.start)-mins(b.start));
    const h=all.length?Math.max(0,Math.floor(mins(all[0].start)/60)-1):7;sc.scrollTop=h*60*WEEK_PPM
  };
})();