/* Register offline shell caching only on secure website origins (and localhost). */
'use strict';
if('serviceWorker' in navigator && window.isSecureContext){
  addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('Offline mode unavailable',e));
  });
}
// Prompting is not necessary for this small local prototype; storage is best effort.
