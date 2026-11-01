/* IndexedDB media store: records keep references, large videos stay as binary Blobs.
   No data is uploaded. Removing the browser site's storage can remove these clips. */
'use strict';
const MoveProofMedia = (() => {
  const DB_NAME='moveproof-ios-evidence-v1';
  const TABLE='videos';
  let opening=null;
  function open(){
    if(opening)return opening;
    opening=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window))return reject(Error('IndexedDB unavailable'));
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(TABLE))db.createObjectStore(TABLE,{keyPath:'id'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error('Could not open local video store'));
      req.onblocked=()=>reject(Error('Video storage blocked by another tab'));
    }).catch(error=>{opening=null;throw error});
    return opening;
  }
  async function save(file){
    if(!(file instanceof Blob)||!file.size)throw Error('No valid video');
    const db=await open();
    const id='pwa-video:'+(crypto.randomUUID?.()||('vid-'+Date.now()+'-'+Math.floor(Math.random()*1e9)));
    const mime=file.type||(/\.mov$/i.test(file.name||'')?'video/quicktime':'video/mp4');
    // Store Blob directly; encoding large files as Base64 would exhaust browser localStorage.
    const item={id,blob:file.slice(0,file.size,mime),mime,name:file.name||'MoveProof video',size:file.size,createdAt:new Date().toISOString()};
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(TABLE,'readwrite');
      tx.objectStore(TABLE).put(item);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||Error('Video storage failed'));
      tx.onabort=()=>reject(tx.error||Error('Video storage was aborted'));
    });
    const stored=await read(id);
    if(!stored||stored.size!==file.size)throw Error('Unable to verify stored video');
    return id;
  }
  async function read(id){
    if(typeof id!=='string'||!/^pwa-video:[\w-]+$/.test(id))return null;
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(TABLE,'readonly');
      const req=tx.objectStore(TABLE).get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||Error('Could not read local video'));
    });
  }
  async function remove(id){
    if(typeof id!=='string'||!/^pwa-video:[\w-]+$/.test(id))return;
    const db=await open();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(TABLE,'readwrite');
      tx.objectStore(TABLE).delete(id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||Error('Failed to delete video'));
      tx.onabort=()=>reject(tx.error||Error('Deletion aborted'));
    });
  }
  async function count(){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const req=db.transaction(TABLE,'readonly').objectStore(TABLE).count();
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }
  return Object.freeze({save,read,remove,count});
})();
