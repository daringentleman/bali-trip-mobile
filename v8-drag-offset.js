(()=>{
 let touchSession=null,raf=0;
 const stopAuto=()=>{if(raf){cancelAnimationFrame(raf);raf=0}};
 const autoLoop=()=>{
   if(!touchSession||!touchSession.dragging||!drag){raf=0;return}
   const sc=document.getElementById('weekCalendar'),r=sc.getBoundingClientRect();
   let delta=0;
   if(touchSession.lastY<r.top+58)delta=-Math.max(5,Math.min(18,(r.top+58-touchSession.lastY)*.32));
   else if(touchSession.lastY>r.bottom-58)delta=Math.max(5,Math.min(18,(touchSession.lastY-(r.bottom-58))*.32));
   if(delta){const before=sc.scrollTop;sc.scrollTop=Math.max(0,Math.min(sc.scrollHeight-sc.clientHeight,sc.scrollTop+delta));if(sc.scrollTop!==before)updateWeekDrag(touchSession.lastX,touchSession.lastY)}
   raf=requestAnimationFrame(autoLoop)
 };
 const beginDrag=(el,e,x,y,id)=>{
   navigator.vibrate?.(35);el.dataset.dragged='1';el.classList.add('dragging');snapshot('移動行程');
   const rect=el.getBoundingClientRect(),ghost=el.cloneNode(true);ghost.removeAttribute('data-id');ghost.classList.add('dragghost');ghost.classList.remove('dragging');Object.assign(ghost.style,{width:rect.width+'px',height:rect.height+'px',left:rect.left+'px',top:rect.top+'px',right:'auto'});document.body.appendChild(ghost);
   const dateTag=document.createElement('div');dateTag.className='dragdate';document.body.appendChild(dateTag);
   drag={id:e.id,el,ghost,dateTag,dur:duration(e),targetDate:e.date,targetMin:mins(e.start),pointerId:id,ghostW:rect.width,ghostH:rect.height,grabOffsetX:x-rect.left,grabOffsetY:y-rect.top,lastX:x,lastY:y};
   updateWeekDrag(x,y)
 };
 updateWeekDrag=(x,y)=>{
   if(!drag)return;const area=document.getElementById('weekBody'),r=area.getBoundingClientRect();let di=Math.floor((x-r.left)/r.width*7);di=Math.max(0,Math.min(6,di));let topY=y-r.top-drag.grabOffsetY,m=Math.round((topY/PPM)/15)*15;m=Math.max(0,Math.min(1439-drag.dur,m));drag.targetDate=DAYS[di][0];drag.targetMin=m;drag.lastX=x;drag.lastY=y;
   drag.ghost.style.left=Math.max(6,Math.min(innerWidth-drag.ghostW-6,x-drag.grabOffsetX))+'px';drag.ghost.style.top=Math.max(6,Math.min(innerHeight-drag.ghostH-6,y-drag.grabOffsetY))+'px';const t=drag.ghost.querySelector('.et');if(t)t.textContent=timeFromMins(m);drag.dateTag.textContent=`${dayLabel(drag.targetDate)}・${timeFromMins(m)}`
 };
 const finish=()=>{stopAuto();if(!drag)return;const e=events.find(x=>x.id===drag.id);e.date=drag.targetDate;e.start=timeFromMins(drag.targetMin);e.end=timeFromMins(Math.min(1439,drag.targetMin+drag.dur));drag.el.classList.remove('dragging');drag.ghost.remove();drag.dateTag.remove();drag=null;saveEvents();renderAll();showToast('行程已移動')};
 weekDown=ev=>{
   if(ev.pointerType==='touch')return;
   const el=ev.currentTarget,e=events.find(x=>x.id===el.dataset.id);if(!e)return;downPoint={x:ev.clientX,y:ev.clientY,id:e.id,el};longPressTimer=setTimeout(()=>{beginDrag(el,e,ev.clientX,ev.clientY,ev.pointerId);const mv=pe=>{if(!drag||pe.pointerId!==drag.pointerId)return;pe.preventDefault();updateWeekDrag(pe.clientX,pe.clientY)};const up=pe=>{if(!drag||pe.pointerId!==drag.pointerId)return;document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);finish()};document.addEventListener('pointermove',mv,{passive:false});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);downPoint=null},1000);
   const cancel=pe=>{if(!downPoint)return;if(Math.hypot(pe.clientX-downPoint.x,pe.clientY-downPoint.y)>10){clearTimeout(longPressTimer);downPoint=null;el.removeEventListener('pointermove',cancel)}};el.addEventListener('pointermove',cancel);el.addEventListener('pointerup',()=>{clearTimeout(longPressTimer);downPoint=null},{once:true});el.addEventListener('pointercancel',()=>{clearTimeout(longPressTimer);downPoint=null},{once:true})
 };
 const bindTouch=()=>{
   document.querySelectorAll('.eventblock').forEach(el=>{
     if(el.dataset.touchBound)return;el.dataset.touchBound='1';
     el.addEventListener('touchstart',ev=>{if(ev.touches.length!==1)return;const t=ev.touches[0],e=events.find(x=>x.id===el.dataset.id);if(!e)return;touchSession={id:t.identifier,el,e,startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastY:t.clientY,dragging:false,timer:setTimeout(()=>{if(!touchSession)return;touchSession.dragging=true;beginDrag(el,e,touchSession.lastX,touchSession.lastY,'touch');raf=requestAnimationFrame(autoLoop)},1000)}},{passive:true});
   });
 };
 const baseRender=renderWeek;renderWeek=()=>{baseRender();const wb=document.getElementById('weekBody');if(wb){wb.oncontextmenu=e=>e.preventDefault();wb.onselectstart=e=>e.preventDefault()}bindTouch()};
 document.addEventListener('touchmove',ev=>{if(!touchSession)return;const t=[...ev.touches].find(x=>x.identifier===touchSession.id);if(!t)return;touchSession.lastX=t.clientX;touchSession.lastY=t.clientY;if(!touchSession.dragging){if(Math.hypot(t.clientX-touchSession.startX,t.clientY-touchSession.startY)>10){clearTimeout(touchSession.timer);touchSession=null}return}ev.preventDefault();updateWeekDrag(t.clientX,t.clientY)},{passive:false});
 const touchEnd=ev=>{if(!touchSession)return;const ended=[...ev.changedTouches].some(x=>x.identifier===touchSession.id);if(!ended)return;clearTimeout(touchSession.timer);if(touchSession.dragging)finish();touchSession=null};document.addEventListener('touchend',touchEnd);document.addEventListener('touchcancel',touchEnd);
 if(document.getElementById('week')?.classList.contains('active')){renderWeek();bindTouch()}
})();
