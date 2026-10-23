import { useEffect, useRef, useState } from 'react';
import { loadPlatformUsers, loadUserMemberships, type PlatformUser, type UserMembership } from '@/services/platform-users.service';

const states = { email_confirmed: 'Email confirmed', email_unconfirmed: 'Email unconfirmed', banned: 'Sign-in blocked', anonymous: 'Anonymous account' };
const label = (value: string) => value.replaceAll('_', ' ');
const date = (value: string | null) => !value ? 'Not recorded' : value === 'infinity' ? 'Until further notice' : new Date(value).toLocaleString('en-GB');
const buttonClass = 'border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 disabled:opacity-40';

function UserDetails({ user, close }: { user: PlatformUser; close: () => void }) {
  const [rows, setRows] = useState<UserMembership[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows([]);
    loadUserMemberships(user.id, offset)
      .then(data => { if (active) { setRows(data.items); setTotal(data.total); } })
      .catch(e => { if (active) { setTotal(0); setError(e instanceof Error ? e.message : 'Could not load memberships.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, offset, retry]);
  return <section aria-label="User details" className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
    <div className="flex justify-between gap-3 items-start">
      <div><h2 ref={heading} tabIndex={-1} className="text-white font-semibold">{user.full_name ?? 'Name not recorded'}</h2><p className="text-sm text-slate-400">Read-only account details</p></div>
      <button onClick={close} className={buttonClass}>Close details</button>
    </div>
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
      <div><dt className="text-slate-500">User ID</dt><dd className="break-all">{user.id}</dd></div>
      <div><dt className="text-slate-500">Account email</dt><dd className="break-all">{user.email ?? 'No email recorded'}</dd></div>
      <div><dt className="text-slate-500">Account state</dt><dd>{states[user.account_state]}</dd></div>
      <div><dt className="text-slate-500">Registered</dt><dd>{date(user.created_at)}</dd></div>
      <div><dt className="text-slate-500">Email confirmed</dt><dd>{date(user.email_confirmed_at)}</dd></div>
      <div><dt className="text-slate-500">Last recorded sign-in</dt><dd>{date(user.last_sign_in_at)}</dd></div>
      <div><dt className="text-slate-500">MFA</dt><dd>{user.has_verified_mfa ? 'Verified factor enrolled' : 'No verified factor enrolled'}</dd></div>
      {user.account_state === 'banned' && <div><dt className="text-slate-500">Sign-in blocked until</dt><dd>{date(user.banned_until)}</dd></div>}
    </dl>
    <h3 className="text-white font-medium">Organisation memberships</h3>
    {loading && <p role="status" className="text-slate-400 text-sm">Loading memberships…</p>}
    {error && <p role="alert" className="text-red-300">{error} <button className="underline" onClick={() => setRetry(r => r + 1)}>Retry</button></p>}
    {!loading && !error && !rows.length && <p className="text-sm text-slate-400">No memberships on this page.</p>}
    <div className="space-y-2">{rows.map(row => <div key={row.id} className="border border-slate-800 rounded-lg p-3 text-sm text-slate-300">
      <p className="text-white font-medium">{row.organisation_name}{row.organisation_archived ? ' · Archived organisation' : ''}</p>
      <p>Role: {label(row.role)} · Membership: {label(row.status)}</p>
      <p className="text-xs text-slate-500">Joined: {date(row.joined_at)} · Organisation ID: {row.organisation_id}</p>
    </div>)}</div>
    <div className="flex justify-between items-center gap-3 text-sm text-slate-400">
      <span>{loading ? 'Loading…' : `${total} memberships`}</span>
      <div className="flex gap-2"><button className={buttonClass} disabled={loading || offset === 0} onClick={() => setOffset(o => Math.max(0, o - 25))}>Previous memberships</button><button className={buttonClass} disabled={loading || offset + 25 >= total} onClick={() => setOffset(o => o + 25)}>Next memberships</button></div>
    </div>
  </section>;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<PlatformUser | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows([]); setSelected(null);
    const timer = setTimeout(() => {
      loadPlatformUsers(search, state, offset)
        .then(data => { if (active) { setRows(data.items); setTotal(data.total); } })
        .catch(e => { if (active) { setTotal(0); setError(e instanceof Error ? e.message : 'Could not load users.'); } })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, state, offset, revision]);
  return <div className="p-4 lg:p-6 space-y-6">
    <div className="flex justify-between items-start gap-3">
      <div><h1 className="text-xl font-bold text-white">Users</h1><p className="text-slate-400 text-sm mt-1">{loading ? 'Loading' : total} registered accounts matching these filters.</p></div>
      <button className={buttonClass} disabled={loading} onClick={() => setRevision(r => r + 1)}>Refresh</button>
    </div>
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-sm text-slate-400 flex-1 min-w-48">Search accounts<input type="search" maxLength={200} value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} placeholder="Name, email or organisation" className="block w-full px-3 py-2.5 mt-1 bg-slate-900 border border-slate-800 rounded-xl text-white" /></label>
      <label className="text-sm text-slate-400">Account state<select value={state} onChange={e => { setState(e.target.value); setOffset(0); }} className="block bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 mt-1 text-white"><option value="all">All accounts</option>{Object.entries(states).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
    </div>
    {error && <div role="alert" className="text-red-300 border border-red-800 rounded-xl p-4">{error} <button className="underline" onClick={() => setRevision(r => r + 1)}>Retry</button></div>}
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
      <table className="w-full text-sm text-left"><thead><tr className="border-b border-slate-800 text-slate-400">
        {['User', 'Account state', 'Memberships', 'MFA enrolment', 'Last recorded sign-in', 'Details'].map(title => <th key={title} className="px-4 py-3 font-medium text-xs">{title}</th>)}
      </tr></thead><tbody className="divide-y divide-slate-800">
        {(loading || (!error && !rows.length)) && <tr><td colSpan={6} className="p-6 text-slate-400">{loading ? 'Loading users…' : 'No users match these filters.'}</td></tr>}
        {rows.map(user => <tr key={user.id} className="text-slate-300 hover:bg-slate-800/50">
          <td className="px-4 py-3"><p className="font-medium text-white">{user.full_name ?? 'Name not recorded'}</p><p className="text-xs text-slate-500 break-all">{user.email ?? 'No email recorded'}</p></td>
          <td className="px-4 py-3">{states[user.account_state]}</td>
          <td className="px-4 py-3">{user.membership_count} total<p className="text-xs text-slate-500">{user.active_membership_count} active in current organisations</p></td>
          <td className="px-4 py-3">{user.has_verified_mfa ? 'Verified factor' : 'None verified'}</td>
          <td className="px-4 py-3 text-xs">{date(user.last_sign_in_at)}</td>
          <td className="px-4 py-3"><button className={buttonClass} onClick={() => setSelected(user)}>View</button></td>
        </tr>)}
      </tbody></table>
    </div>
    <div className="flex justify-between items-center text-sm text-slate-400 gap-3"><span>{loading ? 'Loading…' : `${total} accounts`}</span><div className="flex gap-2"><button className={buttonClass} disabled={loading || offset === 0} onClick={() => setOffset(o => Math.max(0, o - 50))}>Previous</button><button className={buttonClass} disabled={loading || offset + 50 >= total} onClick={() => setOffset(o => o + 50)}>Next</button></div></div>
    {selected && <UserDetails key={selected.id} user={selected} close={() => setSelected(null)} />}
  </div>;
}
