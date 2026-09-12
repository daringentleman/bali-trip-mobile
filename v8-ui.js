(()=>{
 const I={home:'<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.7V21h13V9.7"/><path d="M9.5 21v-6h5v6"/></svg>',daily:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M8 14h3M8 17h6"/></svg>',week:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18M8 9v12M13 9v12M3 14h18"/></svg>',packing:'<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 4.5M3 12l1.5 1.5L7 10.5M3 18l1.5 1.5L7 16.5"/></svg>',money:'<svg viewBox="0 0 24 24"><path d="M4 7.5h15a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h11"/><path d="M17 13h4M17 13a1 1 0 1 0 0 2h4"/></svg>'};
 document.querySelectorAll('.navitem').forEach(b=>{const e=b.querySelector('.ico');if(e&&I[b.dataset.page])e.innerHTML=I[b.dataset.page]});
 const baseShow=showPage;
 showPage=id=>{document.body.classList.toggle('v9-daily',id==='daily');baseShow(id)};
 if(document.getElementById('daily')?.classList.contains('active'))document.body.classList.add('v9-daily');
})();
