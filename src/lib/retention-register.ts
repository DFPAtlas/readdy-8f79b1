import type { RetentionData, RetentionRecord } from '@/services/retention.service';
export function retentionStageCap(record: Pick<RetentionRecord, 'withheld_pence' | 'pc_share_bps'>, stage: string): number {
    const pc = Math.round(record.withheld_pence * (record.pc_share_bps ?? 0) / 10000);
    return stage === 'pc' ? pc : record.withheld_pence - pc;
}
export function retentionTotals(records: RetentionRecord[]) {
    const totals = new Map<string, {
        currency: string;
        direction: string;
        withheld: number;
        released: number;
        outstanding: number;
    }>();
    for (const record of records) {
        if (record.voided_at || record.status === 'written_off')
            continue;
        const currency = record.currency || 'Unconfirmed';
        const direction = record.retention_type;
        const key = `${currency}:${direction}`;
        const total = totals.get(key) || { currency, direction, withheld: 0, released: 0, outstanding: 0 };
        total.withheld += record.withheld_pence;
        total.released += record.released_pence;
        total.outstanding += record.withheld_pence - record.released_pence;
        totals.set(key, total);
    }
    return [...totals.values()];
}
// Small self-contained text PDF. ASCII-normalisation makes byte offsets deterministic;
// parentheses, backslashes and line breaks in user-entered text cannot inject PDF commands.
export function retentionRegisterPdf(data: RetentionData, company: string, jobs: Map<string, string>, now = new Date()): Uint8Array {
    const money = (n: number, c: string | null) => `${c || 'Unconfirmed currency'} ${(n / 100).toFixed(2)}`;
    const lines = [`${company} - Retention register`, `Generated ${now.toISOString()}`, 'Recorded balances; not a certificate or bank instruction.', ''];
    for (const t of retentionTotals(data.records))
        lines.push(`${t.direction === 'client_held' ? 'Client-held receivable' : 'Subcontractor-held payable'} | ${t.currency} | Outstanding ${(t.outstanding / 100).toFixed(2)}`);
    if (!data.records.length)
        lines.push('No retention records.');
    for (const r of data.records) {
        lines.push('', `${r.reference || 'Unconfigured'} | ${jobs.get(r.job_id) || r.job_id} | ${r.counterparty || 'Unconfirmed'}`, `${r.retention_type} | ${r.voided_at ? 'VOID' : r.status} | Contract ${r.percentage}%`, `Withheld ${money(r.withheld_pence, r.currency)} | Released ${money(r.released_pence, r.currency)}`);
        for (const stage of ['pc', 'defects'])
            lines.push(`${stage}: cap ${r.pc_share_bps === null ? 'Unconfigured' : money(retentionStageCap(r, stage), r.currency)}; due ${stage === 'pc' ? r.pc_due_date || 'Not set' : r.defects_due_date || 'Not set'}; achieved ${stage === 'pc' ? r.pc_completed_date || 'Not recorded' : r.defects_completed_date || 'Not recorded'}`);
        for (const q of data.releases.filter(q => q.retention_id === r.id))
            lines.push(`Release ${q.stage} ${q.status}: ${money(q.amount_pence, r.currency)}; settled ${money(q.settled_pence, r.currency)}`);
        for (const h of data.history.filter(h => h.retention_id === r.id))
            lines.push(`${h.created_at.slice(0, 10)} ${h.action} ${h.amount_pence === null ? '' : money(h.amount_pence, r.currency)} ${h.payment_reference || ''} ${h.reason}`);
    }
    const clean = (s: string) => s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '?');
    const wrapped = lines.flatMap(line => { const text = clean(line); return text.match(/.{1,95}/g) || ['']; });
    const pages: string[][] = [];
    for (let i = 0; i < wrapped.length; i += 48)
        pages.push(wrapped.slice(i, i + 48));
    const objects: string[] = ['', '<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    const kids: number[] = [];
    pages.forEach((page, i) => { const id = objects.length; kids.push(id); const escaped = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); const stream = `BT /F1 9 Tf 40 800 Td 15 TL ${page.map((line, j) => `${j ? 'T* ' : ''}(${escaped(line)}) Tj`).join('\n')}\nT* (Page ${i + 1} of ${pages.length}) Tj ET`; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`); });
    objects[2] = `<< /Type /Pages /Kids [${kids.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
    let output = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 1; i < objects.length; i++) {
        offsets[i] = output.length;
        output += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = output.length;
    output += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(output);
}
