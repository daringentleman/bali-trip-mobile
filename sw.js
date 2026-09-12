const C='bali-v31-1',A=['./manifest.webmanifest','./icon-192.png','./icon-512.png','./v8-theme.css','./v11-fixes.css','./v13-scroll.css','./v12-ui.js','./v13-drag.js','./v14-ui.js','./v15-weather.css','./v15-itinerary.js','./v15-weather.js','./v20-sync-bridge.js','./v16-sync.js','./v18-safe.css','./v18-safe.js','./v18-route-hotfix.js','./v18-pack-edit.js','./v19-wishlist.css','./v19-wishlist.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin===self.location.origin&&(u.pathname==='/iphone-v31.html'||u.pathname==='/bali-touch-v31-180.png'))return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(async r=>{
      let t=await r.text();
      t=t.replace('</head>','<link rel="apple-touch-icon" sizes="180x180" href="/bali-touch-v31-180.png"><link rel="stylesheet" href="/v8-theme.css?v=31.1"><link rel="stylesheet" href="/v11-fixes.css?v=31.1"><link rel="stylesheet" href="/v13-scroll.css?v=31.1"><link rel="stylesheet" href="/v15-weather.css?v=31.1"><link rel="stylesheet" href="/v18-safe.css?v=31.1"><link rel="stylesheet" href="/v19-wishlist.css?v=31.1"></head>').replace('</body>','<script src="/v12-ui.js?v=31.1"></script><script src="/v13-drag.js?v=31.1"></script><script src="/v14-ui.js?v=31.1"></script><script src="/v15-itinerary.js?v=31.1"></script><script src="/v15-weather.js?v=31.1"></script><script src="/v20-sync-bridge.js?v=31.1"></script><script src="/v16-sync.js?v=31.1"></script><script src="/v18-safe.js?v=31.1"></script><script src="/v18-route-hotfix.js?v=31.1"></script><script src="/v18-pack-edit.js?v=31.1"></script><script src="/v19-wishlist.js?v=31.1"></script></body>');
      return new Response(t,{status:r.status,statusText:r.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})
    }).catch(()=>caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))
});
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch{d={body:e.data?.text()||''}};const title=d.title||'峇里島行程提醒';e.waitUntil(self.registration.showNotification(title,{body:d.body||'接下來有新的行程。',tag:d.tag||'bali-trip-reminder',icon:'/bali-touch-v31-180.png',badge:'/bali-touch-v31-180.png',data:d.data||{url:'/'},renotify:true}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||'/';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const w of ws){if('focus'in w)return w.focus()}return clients.openWindow?clients.openWindow(url):undefined}))});
