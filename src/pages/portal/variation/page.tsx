import { useParams } from 'react-router-dom';
import { useClientPortal } from '@/hooks/useClientPortal';
import { PortalShell, PortalState } from '../components/LivePortal';
import { formatPence } from '@/lib/money';
export default function ClientVariationDetail() {
    const { accessToken, variationId } = useParams<{
        accessToken: string;
        variationId: string;
    }>();
    const { data, error, loading, reload } = useClientPortal(accessToken);
    const variation = data?.variations.find(v => v.id === variationId);
    return <PortalShell token={accessToken} name={data?.client_name}>{loading || error || !data ? <PortalState loading={loading} error={error} reload={reload}/> : !variation ? <p role="alert" className="bg-white border rounded-xl p-6">This variation is unavailable through your project link. It may have been withdrawn or access may have changed.</p> : <article className="bg-white border rounded-xl p-6 space-y-4"><h1 className="text-2xl font-semibold">{variation.reference} · {variation.title}</h1><p className="capitalize">{variation.status.replaceAll('_', ' ')} · Version {variation.current_version}</p><p>{data.projects.find(p => p.id === variation.job_id)?.project_name}</p>{[['Description', variation.description], ['Included work', variation.included_work], ['Excluded work', variation.excluded_work], ['Assumptions', variation.assumptions]].map(([label, value]) => value && <section key={label}><h2 className="font-semibold">{label}</h2><p className="whitespace-pre-wrap text-sm">{value}</p></section>)}<dl className="grid sm:grid-cols-3 gap-4"><div><dt>Net price</dt><dd>{formatPence(variation.client_price_pence, data.currency)}</dd></div><div><dt>VAT</dt><dd>{formatPence(variation.vat_pence, data.currency)}</dd></div><div><dt>Total</dt><dd>{formatPence(variation.total_pence, data.currency)}</dd></div></dl><p className="text-sm">Programme impact: {variation.programme_days ?? 'Not recorded'} days · Revised completion: {variation.revised_completion ?? 'Not recorded'} · Response deadline: {variation.approval_deadline ?? 'Not recorded'}</p><p className="rounded-lg bg-blue-50 p-4 text-sm">Contact your contractor to discuss or respond to this variation.</p></article>}</PortalShell>;
}
