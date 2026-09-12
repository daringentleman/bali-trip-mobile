(()=>{
  const normCat=c=>({保養:'保養品',鞋子:'衣物／鞋子',衣物:'衣物／鞋子',健康:'藥品',金流:'錢',活動:'活動用品','3C':'3C／攝影',攝影:'3C／攝影'}[c]||c||'自訂');
  const catOrder=['證件','錢','3C／攝影','衣物／鞋子','盥洗','保養品','生理用品','藥品','活動用品','其他','自訂'];
  let dailySwipeBound=false;
  function ensureMoneyFab(){
    if(document.getElementById('moneyFab')) return;
    const fab=document.createElement('button');
    fab.id='moneyFab'; fab.className='moneyfab'; fab.textContent='＋';
    fab.setAttribute('aria-label','新增支出'); fab.onclick=()=>openExpense();
    document.body.appendChild(fab);
  }
  function initDailySwipe(){
    if(dailySwipeBound) return;
    const page=document.getElementById('daily'); if(!page) return;
    let sx=0,sy=0,tracking=false;
    page.addEventListener('touchstart',e=>{if(!page.classList.contains('active'))return;const t=e.touches[0];sx=t.clientX;sy=t.clientY;tracking=true},{passive:true});
    page.addEventListener('touchmove',e=>{if(!tracking)return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>8)e.preventDefault()},{passive:false});
    page.addEventListener('touchend',e=>{if(!tracking)return;tracking=false;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.35){const i=DAYS.findIndex(d=>d[0]===selectedDay),ni=Math.max(0,Math.min(DAYS.length-1,i+(dx<0?1:-1)));if(ni!==i){selectedDay=DAYS[ni][0];renderDaily();showToast(`切到 ${dayLabel(selectedDay)}`)}}},{passive:true});
    dailySwipeBound=true;
  }
  const oldRenderDaily=window.renderDaily;
  window.renderDaily=function(){oldRenderDaily();initDailySwipe()};
  window.renderPack=function(){
    document.getElementById('pack0Tab').classList.toggle('active',packWho==='zero');
    document.getElementById('pack1Tab').classList.toggle('active',packWho==='ting');
    const arr=pack[packWho],done=arr.filter(x=>x.done).length,pct=arr.length?done/arr.length*100:0;
    document.getElementById('packCount').textContent=`${done} / ${arr.length} 已完成`;
    document.getElementById('packProgress').style.width=pct+'%';
    const groups={};arr.forEach(x=>{const c=normCat(x.cat);(groups[c]||(groups[c]=[])).push(x)});
    const keys=[...new Set([...catOrder,...Object.keys(groups)])].filter(k=>groups[k]);
    document.getElementById('packList').innerHTML=keys.map(cat=>`<div class="packgroup"><div class="packgroup-title">${esc(cat)}</div>${groups[cat].map(x=>`<div class="checkrow"><input type="checkbox" ${x.done?'checked':''} onchange="togglePack('${x.id}',this.checked)"><label>${esc(x.text)}</label><button class="xbtn" onclick="delPack('${x.id}')">✕</button></div>`).join('')}</div>`).join('');
  };
  const origShowPage=window.showPage;
  window.showPage=function(id){
    ensureMoneyFab();
    document.body.classList.toggle('screen-lock',id==='daily'||id==='week');
    document.body.classList.toggle('daily-lock',id==='daily');
    document.body.classList.toggle('week-lock',id==='week');
    document.body.classList.toggle('money-page',id==='money');
    const res=origShowPage(id);const fab=document.getElementById('moneyFab');if(fab)fab.style.display=id==='money'?'flex':'none';return res;
  };
  ensureMoneyFab();renderPack();renderDaily();window.showPage(document.querySelector('.page.active')?.id||'home');
})();
