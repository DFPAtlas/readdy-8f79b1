import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import { loadPlatformRegister, platformRegisters, type PlatformRegister as RegisterKind } from '@/services/platform-records.service';
import LoadState from './LoadState';
export default function PlatformRegister({ kind }: { kind: RegisterKind }) {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const state = useScopedResource(user ? `${user.id}:${kind}:${offset}` : null, () => loadPlatformRegister(kind, offset));
  const config = platformRegisters[kind];
  return <section className="p-4 lg:p-6 space-y-4 text-slate-200"><h1 className="text-xl font-bold">{config.title}</h1><p>{config.note}</p><button onClick={state.retry} className="border rounded px-3 py-2">Refresh</button><LoadState {...state}/>{state.data && <><p>{state.data.total} saved records</p>{state.data.rows.length === 0 ? <p>No records on this page.</p> : <div className="overflow-auto"><table className="w-full text-sm"><thead><tr>{config.columns.map(column => <th className="p-3 text-left" key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{state.data.rows.map(row => <tr key={String(row.id)}>{config.columns.map(column => <td className="border-t border-slate-700 p-3" key={column}>{row[column] === null || row[column] === undefined ? 'Not recorded' : typeof row[column] === 'boolean' ? row[column] ? 'Yes' : 'No' : String(row[column])}</td>)}</tr>)}</tbody></table></div>}<div className="flex gap-4"><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button><button disabled={offset + 50 >= state.data.total} onClick={() => setOffset(offset + 50)}>Next</button></div></>}</section>;
}
