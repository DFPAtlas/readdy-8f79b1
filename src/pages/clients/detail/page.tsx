import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LiveClientScope from '../LiveClientScope';
import { clientName, loadClient, loadContacts, type Client, type Contact } from '@/services/live-clients.service';

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  if (!clientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) return <p className="p-6">Client not found.</p>;
  return <LiveClientScope>{({ userId, orgId }) => <ClientRecord key={userId + ':' + orgId + ':' + clientId} orgId={orgId} clientId={clientId} />}</LiveClientScope>;
}
function ClientRecord({ orgId, clientId }: { orgId: string; clientId: string }) {
  const [refresh, setRefresh] = useState(0);
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState<{ client: Client | null; contacts: Contact[]; total: number; loading: boolean; error: string | null }>({ client: null, contacts: [], total: 0, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ client: null, contacts: [], total: 0, loading: true, error: null });
    void (async () => {
      const client = await loadClient(orgId, clientId, controller.signal);
      if (!client) return { client: null, contacts: [], total: 0 };
      const contacts = await loadContacts(orgId, clientId, offset, controller.signal);
      return { client, contacts: contacts.items, total: contacts.total };
    })().then(result => {
      if (!controller.signal.aborted) setState({ ...result, loading: false, error: null });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ client: null, contacts: [], total: 0, loading: false, error: 'Client details could not be loaded. Please retry.' });
    });
    return () => controller.abort();
  }, [orgId, clientId, offset, refresh]);
  const client = state.client;
  return <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
    <Link className="underline text-sm" to="/clients">Back to clients</Link>
    {state.loading ? <p role="status">Loading client details…</p> : state.error ? <div role="alert"><p>{state.error}</p><button className="underline" onClick={() => setRefresh(v => v + 1)}>Retry</button></div> : !client ? <p>Client not found in your selected company.</p> : <>
      <h1 className="text-2xl font-semibold text-main">{clientName(client)}</h1>
      <p className="text-sm text-muted">{client.client_type} · {client.account_status}</p>
      <section className="rounded-xl border bg-white p-5 space-y-2"><h2 className="font-semibold">Contact details</h2><p>{client.email || 'No email recorded'}</p><p>{client.phone || 'No phone recorded'}</p><p className="text-sm">Preferred contact: {client.preferred_contact || 'Not recorded'}</p></section>
      <section className="rounded-xl border bg-white p-5 space-y-2"><h2 className="font-semibold">Billing address</h2><p>{[client.billing_address_line1, client.billing_address_line2, client.billing_town_city, client.billing_county, client.billing_postcode].filter(Boolean).join(', ') || 'No billing address recorded'}</p></section>
      <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-semibold">Contacts ({state.total})</h2>
        {!state.contacts.length ? <p>No contacts on this page.</p> : state.contacts.map(c => <article key={c.id} className="border-t pt-3"><p className="font-medium">{c.full_name}{c.is_primary ? ' · Primary' : ''}</p>{c.email && <p className="break-all">{c.email}</p>}{c.phone && <p>{c.phone}</p>}</article>)}
        <div className="flex gap-3"><button className="rounded-lg border px-3 py-2 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(v => Math.max(0, v - 25))}>Previous contacts</button><button className="rounded-lg border px-3 py-2 disabled:opacity-50" disabled={offset + 25 >= state.total} onClick={() => setOffset(v => v + 25)}>Next contacts</button></div>
      </section>
    </>}
  </div>;
}
