'use strict';
// Pair only with the local Monday app, never a Google page or remote site.
(async()=>{try{const r=await fetch('/api/google-flow/pairing',{method:'POST'});if(!r.ok)return;const d=await r.json();if(/^[a-f0-9]{64}$/.test(d.key))await chrome.runtime.sendMessage({type:'localPair',key:d.key})}catch{}})();
