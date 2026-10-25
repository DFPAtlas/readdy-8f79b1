import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LiveClientScope from '@/pages/clients/LiveClientScope';
import { variationDetail, variationMoney } from '@/services/live-variations.service';
type Detail = Awaited<ReturnType<typeof variationDetail>>;
export default function VariationDetail() {
  const { variationId } = useParams<{ variationId: string }>();
  if (!variationId || !/^[0-9a-f-]{36}$/i.test(variationId)) return <p className="p-6">Variation not found.</p>;
  return <LiveClientScope>{({ userId, orgId }) => <Record key={userId + ':' + orgId + ':' + variationId} orgId={orgId} id={variationId} />}</LiveClientScope>;
}
function Record({ orgId, id }: { orgId: string; id: string }) {
  const [retry, setRetry] = useState(0); const [state, setState] = useState<{ value: Detail; loading: boolean; error: boolean }>({ value: null, loading: true, error: false });
  useEffect(() => { const controller = new AbortController(); setState({ value: null, loading: true, error: false });
    void variationDetail(orgId, id, controller.signal).then(value => { if (!controller.signal.aborted) setState({ value, loading: false, error: false }); }).catch(() => { if (!controller.signal.aborted) setState({ value: null, loading: false, error: true }); }); return () => controller.abort();
  }, [orgId, id, retry]);
  const v = state.value?.variation;
  return <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5"><Link to="/variations" className="underline">Back to variations</Link>
    {state.loading ? <p role="status">Loading variation…</p> : state.error ? <p role="alert">Could not load this variation. <button className="underline" onClick={() => setRetry(n => n + 1)}>Retry</button></p> : !v ? <p>Variation not found in your company.</p> : <>
      <header className="bg-white border rounded-xl p-5"><p className="text-sm">{v.reference} · {v.status.replace(/_/g, ' ')} · version {v.current_version}</p><h1 className="text-2xl font-semibold">{v.title}</h1>{state.value?.job && <Link className="underline" to={'/jobs/' + state.value.job.id}>{state.value.job.reference} · {state.value.job.project_name}</Link>}</header>
      <section className="bg-white border rounded-xl p-5 space-y-2"><h2 className="font-semibold">Commercial details</h2><p>Price excluding VAT: {variationMoney(v.client_price_pence, v.currency)}</p><p>VAT: {variationMoney(v.vat_pence, v.currency)}</p><p>Total: {variationMoney(v.total_pence, v.currency)}</p>{v.approval_deadline && <p>Approval deadline: {v.approval_deadline}</p>}{v.programme_days !== null && <p>Programme change: {v.programme_days} days</p>}</section>
      {[['Reason', v.reason], ['Description', v.description], ['Included work', v.included_work], ['Excluded work', v.excluded_work], ['Assumptions', v.assumptions]].filter(([, value]) => value).map(([label, value]) => <section key={label} className="bg-white border rounded-xl p-5"><h2 className="font-semibold">{label}</h2><p className="whitespace-pre-wrap">{value}</p></section>)}
    </>}
  </div>;
}
