(()=>{
  const normCat=c=>({保養:'保養品',鞋子:'衣物／鞋子',衣物:'衣物／鞋子',健康:'藥品',金流:'錢',活動:'活動用品','3C':'3C／攝影',攝影:'3C／攝影'}[c]||c||'自訂');
  const baseRenderPack=window.renderPack;
  if(typeof baseRenderPack!=='function')return;

  function bindEditableLabels(){
    const root=document.getElementById('packList');
    if(!root||!window.pack||!window.packWho)return;
    const arr=pack[packWho]||[];
    root.querySelectorAll('.packgroup').forEach(group=>{
      const cat=group.querySelector('.packgroup-title')?.textContent?.trim()||'';
      const items=arr.filter(x=>normCat(x.cat)===cat);
      group.querySelectorAll('.checkrow').forEach((row,i)=>{
        const item=items[i],label=row.querySelector('label');
        if(!item||!label)return;
        label.classList.add('pack-editable-label');
        label.title='點一下修改文字';
        label.setAttribute('role','button');
        label.setAttribute('tabindex','0');
        const edit=()=>{
          const next=prompt('修改清單項目',item.text||'');
          if(next===null)return;
          const text=next.trim();
          if(!text){alert('項目名稱不能是空白');return}
          item.text=text;
          savePack();
          window.renderPack();
          if(typeof showToast==='function')showToast('清單文字已修改');
        };
        label.onclick=e=>{e.preventDefault();e.stopPropagation();edit()};
        label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();edit()}};
      });
    });
  }

  window.renderPack=function(){
    const out=baseRenderPack();
    requestAnimationFrame(bindEditableLabels);
    return out;
  };

  const style=document.createElement('style');
  style.textContent='.pack-editable-label{cursor:text;position:relative;padding-right:16px!important}.pack-editable-label:after{content:"✎";position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:10px;opacity:.42;font-weight:700}.pack-editable-label:active{opacity:.68}';
  document.head.appendChild(style);
  requestAnimationFrame(bindEditableLabels);
})();
