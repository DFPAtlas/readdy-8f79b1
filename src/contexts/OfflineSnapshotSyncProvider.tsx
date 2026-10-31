import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {useAuth} from './AuthContext';import {useConnectivity} from './ConnectivityContext';
import {OfflineSnapshotSyncContext,type SnapshotSyncState} from './OfflineSnapshotSyncContext';
import {getAllJobPacks} from '@/services/offline-store.service';
import {prepareOfflineReader} from '@/services/offline-reader-shell';
import {offlineSnapshots} from '@/services/offline-job-snapshot.service';
const empty=(userId:string|null):SnapshotSyncState=>({userId,status:'idle',result:null,completedAt:null,error:''});
export function OfflineSnapshotSyncProvider({children}:{children:ReactNode}){
 const {user}=useAuth();const {isOnline}=useConnectivity();const userId=user?.id??null;
 const [state,setState]=useState<SnapshotSyncState>(empty(null));
 const active=useRef<{user:string;controller:AbortController;promise:Promise<void>}|null>(null);
 const refresh=useCallback(()=>{
  if(!userId||!isOnline)return Promise.resolve();
  if(active.current?.user===userId)return active.current.promise;
  active.current?.controller.abort();const controller=new AbortController();
  setState({...empty(userId),status:'refreshing'});
  const timer=setTimeout(()=>{if(active.current?.controller===controller){controller.abort(new DOMException('Refresh timed out','TimeoutError'));active.current=null;setState({...empty(userId),status:'error',error:'Saved-copy refresh timed out. The last valid local copies are retained.'});}},30000);
  const promise=(async()=>{
   const packs=await getAllJobPacks();controller.signal.throwIfAborted();
   if(packs.some(p=>p.userId===userId&&p.data?.kind==='bn_offline_job_v1'))await prepareOfflineReader(controller.signal);
   return offlineSnapshots.load(userId,true,controller.signal);
  })().then(result=>{
   if(active.current?.controller===controller&&!controller.signal.aborted)setState({userId,status:'ready',result,completedAt:new Date().toISOString(),error:''});
  }).catch(()=>{
   if(active.current?.controller===controller&&!controller.signal.aborted)setState({...empty(userId),status:'error',error:'Saved-copy refresh did not complete. The last valid local copies are retained.'});
  }).finally(()=>{clearTimeout(timer);if(active.current?.controller===controller)active.current=null;});
  active.current={user:userId,controller,promise};return promise;
 },[userId,isOnline]);
 useEffect(()=>{if(isOnline)void refresh();return()=>{if(active.current?.user===userId){active.current.controller.abort();active.current=null;}};},[userId,isOnline,refresh]);
 const current=state.userId===userId?state:empty(userId);
 return <OfflineSnapshotSyncContext.Provider value={{...current,refresh}}>{children}</OfflineSnapshotSyncContext.Provider>;
}
