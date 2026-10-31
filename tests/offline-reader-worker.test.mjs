import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function fixture(missing=false){const listeners={},cache=new Map(),fetched=[];let offline=false;const origin='https://example.invalid';
 const self={location:{origin},addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn)};
 const context=vm.createContext({self,URL,console,fetch:async(input)=>{const u=new URL(input,origin);fetched.push(u.href);if(offline)throw new Error('offline');if(u.pathname==='/')return new Response('<html><script src="/assets/app.js"></script><link href="/assets/app.css"><script src="/rest/v1/private.js"></script><script src="https://other.invalid/asset.js"></script></html>',{headers:{'content-type':'text/html'}});return new Response('static',{status:missing&&u.pathname.endsWith('.css')?404:200});},caches:{open:async()=>({put:async(key,res)=>cache.set(new URL(key,origin).href,res.clone())}),match:async key=>cache.get(new URL(typeof key==='string'?key:key.url,origin).href)?.clone()}});
 vm.runInContext(source,context);
 return {listeners,cache,fetched,offline(){offline=true;},async warm(){let pending;let result;for(const fn of listeners.message)fn({data:{type:'CACHE_OFFLINE_READER'},ports:[{postMessage:r=>{result=r;}}],waitUntil:p=>{pending=p;}});await pending;return result;}};
}
test('offline preparation caches only the public shell and same-origin build assets; reader can use the shell offline',async()=>{
 const f=fixture();assert.equal((await f.warm()).ready,true);assert.deepEqual(f.fetched.sort(),['https://example.invalid/','https://example.invalid/assets/app.css','https://example.invalid/assets/app.js']);
 f.offline();let response;f.listeners.fetch[0]({request:{url:'https://example.invalid/mobile/offline-jobs',method:'GET',destination:'document',mode:'navigate'},respondWith:p=>{response=p;}});assert.match(await (await response).text(),/assets\/app.js/);
 let intercepted=false;f.listeners.fetch[0]({request:{url:'https://example.invalid/rest/v1/private',method:'GET'},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
});
test('missing assets do not report the reader prepared or replace the cached root',async()=>{const f=fixture(true);assert.equal((await f.warm()).ready,false);assert.equal(f.cache.has('https://example.invalid/'),false);});
