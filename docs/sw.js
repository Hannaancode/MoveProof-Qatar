/* Cache app code and icons, never users' inspection data or recorded videos. */
'use strict';
const CACHE='moveproof-ios-shell-2026-11-01-v1';
const SHELL=['./','./index.html','./styles.css','./app.js','./pwa-media.js','./pwa-init.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-180.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('moveproof-ios-shell-')&&name!==CACHE).map(name=>caches.delete(name)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  const html=req.mode==='navigate';
  event.respondWith((html?fetch(req).catch(()=>caches.match('./index.html')):caches.match(req).then(cached=>cached||fetch(req).then(response=>{
    if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(req,copy))}
    return response;
  }))).then(response=>response||Response.error()));
});
