(()=>{
  const normCat=c=>({保養:'保養品',鞋子:'衣物／鞋子',衣物:'衣物／鞋子',健康:'藥品',金流:'錢',活動:'活動用品','3C':'3C／攝影',攝影:'3C／攝影'}[c]||c||'自訂');
  const catOrder=['證件','錢','3C／攝影','衣物／鞋子','盥洗','保養品','生理用品','藥品','活動用品','其他','自訂'];
  const ICONS={
    home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    daily:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3.5" y="5" width="17" height="15.5" rx="2.8"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17"/><path d="M7.5 13.5h3.5M7.5 17h6.5"/></svg>',
    week:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3.5" y="4.5" width="17" height="16" rx="2.8"/><path d="M7.5 2.8v4M16.5 2.8v4M3.5 9h17M8 9v11.5M13 9v11.5M3.5 14.5h17"/></svg>',
    packing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 4.5M3 12l1.5 1.5L7 10.5M3 18l1.5 1.5L7 16.5"/></svg>',
    money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7.5h15a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h11"/><path d="M16.8 13h4.2M16.8 13a1.1 1.1 0 1 0 0 2.2H21"/></svg>'
  };
  let dailyBound=false,packAddCategory='衣物／鞋子';
  document.querySelectorAll('.navitem').forEach(btn=>{const ico=btn.querySelector('.ico');if(ico&&ICONS[btn.dataset.page])ico.innerHTML=ICONS[btn.dataset.page]});

  function ensureFab(){let f=document.getElementById('moneyFab');if(!f){f=document.createElement('button');f.id='moneyFab';f.className='moneyfab';f.textContent='＋';f.onclick=()=>openExpense();document.body.appendChild(f)}}

  function layers(){return [...document.querySelectorAll('#daily .route-fixed,#daily .addday')]}
  function setX(x,anim){layers().forEach(el=>{el.style.transition=anim?'transform .20s cubic-bezier(.22,.75,.25,1)':'none';el.style.transform=`translate3d(${x}px,0,0)`})}
  function clearX(){layers().forEach(el=>{el.style.transition='';el.style.transform=''})}
  const baseRenderDaily=window.renderDaily;
  function switchDay(dir){
    const i=DAYS.findIndex(d=>d[0]===selectedDay),ni=Math.max(0,Math.min(6,i+dir));
    if(ni===i){setX(0,true);setTimeout(clearX,210);return}
    const w=document.getElementById('daily').clientWidth;
    setX(dir>0?-w:w,true);
    setTimeout(()=>{
      selectedDay=DAYS[ni][0];
      baseRenderDaily();
      setX(dir>0?w:-w,false);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{setX(0,true);setTimeout(clearX,210)}));
    },190)
  }
  function bindDaily(){
    if(dailyBound)return;
    const p=document.getElementById('daily');let sx=0,sy=0,lx=0,on=false,h=false;
    p.addEventListener('touchstart',e=>{if(!p.classList.contains('active'))return;const t=e.touches[0];sx=t.clientX;sy=t.clientY;lx=sx;on=true;h=false;clearX()},{passive:true});
    p.addEventListener('touchmove',e=>{if(!on)return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;lx=t.clientX;if(!h&&Math.abs(dx)>8)h=Math.abs(dx)>Math.abs(dy)*1.15;if(h){e.preventDefault();setX(dx*.86,false)}},{passive:false});
    p.addEventListener('touchend',()=>{if(!on)return;on=false;const dx=lx-sx;if(h&&Math.abs(dx)>52)switchDay(dx<0?1:-1);else{setX(0,true);setTimeout(clearX,210)}},{passive:true});
    p.addEventListener('touchcancel',()=>{on=false;setX(0,true);setTimeout(clearX,210)},{passive:true});
    dailyBound=true
  }
  window.renderDaily=function(){baseRenderDaily();bindDaily()};

  function ensureWheel(){
    const add=document.querySelector('#packing .addpack');if(!add||document.getElementById('packCategoryPicker'))return;
    const box=document.createElement('div');box.id='packCategoryPicker';box.className='pack-category-picker';
    box.innerHTML=`<div class="picker-label">新增到哪個類別</div><div class="catwheel-wrap"><div class="catwheel-focus"></div><div class="catwheel" id="packCatWheel">${catOrder.filter(x=>x!=='自訂').map(c=>`<div class="catwheel-item" data-cat="${c}">${c}</div>`).join('')}</div></div>`;
    add.parentNode.insertBefore(box,add);
    const wheel=box.querySelector('#packCatWheel'),items=[...wheel.querySelectorAll('.catwheel-item')];
    const sync=()=>{const idx=Math.max(0,Math.min(items.length-1,Math.round(wheel.scrollTop/36)));packAddCategory=items[idx].dataset.cat;items.forEach((it,i)=>it.classList.toggle('active',i===idx))};
    wheel.addEventListener('scroll',sync,{passive:true});
    items.forEach((it,i)=>it.addEventListener('click',()=>wheel.scrollTo({top:i*36,behavior:'smooth'})));
    const start=Math.max(0,items.findIndex(x=>x.dataset.cat===packAddCategory));wheel.scrollTop=start*36;sync()
  }
  window.renderPack=function(){
    document.getElementById('pack0Tab').classList.toggle('active',packWho==='zero');
    document.getElementById('pack1Tab').classList.toggle('active',packWho==='ting');
    const arr=pack[packWho],done=arr.filter(x=>x.done).length,pct=arr.length?done/arr.length*100:0;
    document.getElementById('packCount').textContent=`${done} / ${arr.length} 已完成`;
    document.getElementById('packProgress').style.width=pct+'%';
    const groups={};arr.forEach(x=>{const c=normCat(x.cat);(groups[c]||(groups[c]=[])).push(x)});
    const keys=[...new Set([...catOrder,...Object.keys(groups)])].filter(k=>groups[k]);
    document.getElementById('packList').innerHTML=keys.map(cat=>`<div class="packgroup"><div class="packgroup-title">${esc(cat)}</div>${groups[cat].map(x=>`<div class="checkrow"><input type="checkbox" ${x.done?'checked':''} onchange="togglePack('${x.id}',this.checked)"><label>${esc(x.text)}</label><button class="xbtn" onclick="delPack('${x.id}')">✕</button></div>`).join('')}</div>`).join('');
    ensureWheel()
  };
  window.addPack=function(){const el=document.getElementById('newPack'),t=el.value.trim();if(!t)return;pack[packWho].push({id:packWho+'c'+Date.now(),cat:packAddCategory,text:t,done:false});el.value='';savePack();renderPack()};

  const baseShow=window.showPage;
  window.showPage=function(id){
    ensureFab();
    document.body.classList.toggle('daily-lock',id==='daily');
    document.body.classList.toggle('week-lock',id==='week');
    document.body.classList.toggle('money-page',id==='money');
    const r=baseShow(id);
    const f=document.getElementById('moneyFab');if(f)f.style.display=id==='money'?'flex':'none';
    if(id==='packing')requestAnimationFrame(ensureWheel);
    return r
  };
  ensureFab();renderPack();renderDaily();showPage(document.querySelector('.page.active')?.id||'home');
})();