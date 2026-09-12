(()=>{
  const WEEK_PPM=.55;
  window.renderWeek=function(){
    const today=currentDay();
    document.getElementById('weekHead').innerHTML=`<div class="blank"></div>`+DAYS.map(d=>`<div class="week-day ${d[0]===today?'today':''}"><b>${d[1]}</b><span>${d[2]}</span></div>`).join('');
    let html=`<div class="weekcols">${DAYS.map(()=>'<div class="weekcol"></div>').join('')}</div>`;
    for(let h=0;h<24;h+=2)html+=`<span class="hourlabel" style="top:${h*60*WEEK_PPM}px">${String(h).padStart(2,'0')}</span>`;
    const col=100/7;
    for(const e of [...events].sort((a,b)=>whenMs(a)-whenMs(b))){
      const di=DAYS.findIndex(d=>d[0]===e.date);if(di<0)continue;
      const top=mins(e.start)*WEEK_PPM,ht=Math.max(34,duration(e)*WEEK_PPM);
      html+=`<div class="eventblock ${esc(e.kind||'activity')}" data-id="${e.id}" style="top:${top}px;height:${ht}px;left:calc(${di*col}% + 2px);width:calc(${col}% - 4px)"><div class="et">${esc(e.start)}</div><div class="en">${esc(shortTitle(e.activity))}</div></div>`;
    }
    const wb=document.getElementById('weekBody');wb.style.height=(24*60*WEEK_PPM)+'px';wb.innerHTML=html;
    document.querySelectorAll('.eventblock').forEach(el=>{el.addEventListener('pointerdown',weekDown);el.addEventListener('click',()=>{if(el.dataset.dragged==='1'){el.dataset.dragged='0';return}openEditor(el.dataset.id)})});
    wb.oncontextmenu=e=>e.preventDefault();wb.onselectstart=e=>e.preventDefault();
  };
  window.weekDown=function(ev){
    const el=ev.currentTarget,e=events.find(x=>x.id===el.dataset.id);if(!e)return;
    ev.preventDefault();downPoint={x:ev.clientX,y:ev.clientY,id:e.id,el};
    longPressTimer=setTimeout(()=>startWeekDrag(ev,el,e),1000);
    const move=pe=>{if(!downPoint)return;if(Math.hypot(pe.clientX-downPoint.x,pe.clientY-downPoint.y)>10){clearTimeout(longPressTimer);cleanup()}};
    const cleanup=()=>{clearTimeout(longPressTimer);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',cleanup);el.removeEventListener('pointercancel',cleanup);downPoint=null};
    el.addEventListener('pointermove',move);el.addEventListener('pointerup',cleanup,{once:true});el.addEventListener('pointercancel',cleanup,{once:true});
  };
  window.startWeekDrag=function(ev,el,e){
    const rect=el.getBoundingClientRect(),g=el.cloneNode(true);g.classList.add('dragghost');g.style.left=rect.left+'px';g.style.top=rect.top+'px';g.style.width=rect.width+'px';g.style.height=rect.height+'px';document.body.appendChild(g);
    const tag=document.createElement('div');tag.className='dragdate';document.body.appendChild(tag);el.classList.add('dragging');el.dataset.dragged='1';
    drag={id:e.id,el,ghost:g,dateTag:tag,targetDate:e.date,targetMin:mins(e.start),dur:duration(e),grabOffsetX:ev.clientX-rect.left,grabOffsetY:ev.clientY-rect.top,ghostW:rect.width,ghostH:rect.height,lastX:ev.clientX,lastY:ev.clientY};
    updateWeekDrag(ev.clientX,ev.clientY);
    const mv=pe=>{if(!drag)return;drag.lastX=pe.clientX;drag.lastY=pe.clientY;updateWeekDrag(pe.clientX,pe.clientY);edgeAutoScroll()};
    const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);if(drag)finishWeekDrag()};
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up,{once:true});document.addEventListener('pointercancel',up,{once:true});
  };
  window.updateWeekDrag=function(x,y){
    const area=document.getElementById('weekBody'),r=area.getBoundingClientRect();let di=Math.floor((x-r.left)/r.width*7);di=Math.max(0,Math.min(6,di));
    let m=(y-r.top-drag.grabOffsetY)/WEEK_PPM;m=Math.round(m/15)*15;m=Math.max(0,Math.min(1439-drag.dur,m));drag.targetDate=DAYS[di][0];drag.targetMin=m;
    drag.ghost.style.left=Math.max(6,Math.min(innerWidth-drag.ghostW-6,x-drag.grabOffsetX))+'px';drag.ghost.style.top=Math.max(6,Math.min(innerHeight-drag.ghostH-6,y-drag.grabOffsetY))+'px';
    const t=drag.ghost.querySelector('.et');if(t)t.textContent=timeFromMins(m);drag.dateTag.textContent=`${dayLabel(drag.targetDate)}・${timeFromMins(m)}`;
  };
  window.edgeAutoScroll=function(){
    const sc=document.getElementById('weekCalendar'),r=sc.getBoundingClientRect(),y=drag.lastY;let moved=false;
    if(y<r.top+56){sc.scrollTop-=20;moved=true}else if(y>r.bottom-56){sc.scrollTop+=20;moved=true}if(moved&&drag)updateWeekDrag(drag.lastX,drag.lastY);
  };
  window.finishWeekDrag=function(){
    const e=events.find(x=>x.id===drag.id);e.date=drag.targetDate;e.start=timeFromMins(drag.targetMin);e.end=timeFromMins(Math.min(1439,drag.targetMin+drag.dur));drag.el.classList.remove('dragging');drag.ghost.remove();drag.dateTag.remove();drag=null;saveEvents();renderAll();showToast('行程已移動');
  };
  window.scrollWeekUseful=function(){const sc=document.getElementById('weekCalendar'),all=[...events].sort((a,b)=>mins(a.start)-mins(b.start));let h=all.length?Math.max(0,Math.floor(mins(all[0].start)/60)-1):7;sc.scrollTop=h*60*WEEK_PPM};
})();
