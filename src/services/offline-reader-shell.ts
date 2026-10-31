/** Cache only the public app shell/static assets before confirming an offline download. */
export function prepareOfflineReader(signal:AbortSignal):Promise<void>{
 signal.throwIfAborted();
 if(!('serviceWorker' in navigator)||typeof MessageChannel==='undefined')return Promise.reject(new Error('This browser cannot prepare the offline reader.'));
 return new Promise((resolve,reject)=>{
  let settled=false;const channel=new MessageChannel();
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);channel.port1.close();if(error)reject(error);else resolve();};
  const abort=()=>finish(new DOMException('Cancelled','AbortError'));
  const timer=setTimeout(()=>finish(new Error('Offline page preparation timed out. Refresh the app and try again.')),20000);
  signal.addEventListener('abort',abort,{once:true});
  channel.port1.onmessage=event=>{if(event.data?.ready===true)finish();else finish(new Error('The offline page could not be prepared. Reconnect and retry.'));};
  navigator.serviceWorker.ready.then(registration=>{if(settled)return;if(!registration.active)throw new Error('Offline page worker unavailable');registration.active.postMessage({type:'CACHE_OFFLINE_READER'},[channel.port2]);}).catch(()=>finish(new Error('The offline page could not be prepared. Refresh and retry.')));
 });
}
