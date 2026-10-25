import { useEffect, useState } from 'react';
import ContractorDocuments from '../ContractorDocuments';
import { useParams } from 'react-router-dom';
import { workforceInvitationRequest } from '@/services/workforce-invitations.service';
export default function AcceptWorkforceInvitation() {
 const { token: pathToken } = useParams();
 const hashToken = new URLSearchParams(window.location.hash.slice(1)).get('token');
 const token = hashToken || pathToken || '';
 return <InvitationAcceptance key={token} token={token}/>;
}
function InvitationAcceptance({ token }: { token: string }) {
 const [preview, setPreview] = useState<{ company: string; status: string } | null>(null); const [error, setError] = useState(''); const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false);
 useEffect(() => { let active = true; if (!token) { setError('This invitation link is incomplete. Ask the company for a new invitation.'); return; }
 workforceInvitationRequest<{ company: string; status: string }>('preview', { token }).then(data => { if (active) setPreview(data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Invitation unavailable.'); }); return () => { active = false; }; }, [token]);
 async function accept() { if (!confirmed || busy) return; setBusy(true); setError(''); try { setPreview(await workforceInvitationRequest('accept', { token, confirm: true })); } catch (e) { setError(e instanceof Error ? e.message : 'Could not accept invitation.'); } finally { setBusy(false); } }
 return <main className="mx-auto max-w-xl p-8 space-y-5"><h1 className="text-2xl font-bold">Your workforce invitation</h1>{error && <p role="alert">{error}</p>}{preview ? <><p>Invitation from {preview.company}</p>{preview.status === 'accepted' ? <><p role="status">Your acceptance has been recorded. Acceptance does not approve you for site work or grant company workspace access.</p><ContractorDocuments token={token}/></> : <><p>Confirm that this invitation was intended for you. This records your acceptance for the company; it does not create staff access or approve you for site work.</p><label className="flex gap-3"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy}/>I am the intended recipient and accept this workforce invitation.</label><button className="rounded border px-4 py-3" disabled={!confirmed || busy} onClick={accept}>{busy ? 'Recording acceptance…' : 'Accept invitation'}</button></>}</> : !error && <p role="status">Checking invitation…</p>}</main>;
}
