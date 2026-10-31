import {createContext,useContext} from 'react';
import type {LocalSnapshotList} from '@/services/offline-job-snapshot.service';
export type SnapshotSyncState={userId:string|null;status:'idle'|'refreshing'|'ready'|'error';result:LocalSnapshotList|null;completedAt:string|null;error:string};
export type SnapshotSyncValue=SnapshotSyncState&{refresh:()=>Promise<void>};
export const OfflineSnapshotSyncContext=createContext<SnapshotSyncValue|undefined>(undefined);
export function useOfflineSnapshotSync(){const context=useContext(OfflineSnapshotSyncContext);if(!context)throw new Error('Snapshot refresh provider unavailable');return context;}
