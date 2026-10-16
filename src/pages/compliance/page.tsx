import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { cisService, type CisPersonSummary, type CisRecordWithPerson } from '@/services/cis.service';

type ManualStatus = '' | '20' | '30' | '0';

function personName(person: CisPersonSummary | null): string {
  if (!person) return 'Workforce record unavailable';
  return person.trading_name?.trim() || `${person.first_name} ${person.last_name}`.trim();
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(record: CisRecordWithPerson): string {
  if (record.gross_payment_status === true) return 'Gross status recorded · 0%';
  if (record.deduction_rate === 20) return 'Standard rate recorded · 20%';
  if (record.deduction_rate === 30) return 'Higher rate recorded · 30%';
  return 'No rate recorded';
}

export default function CompliancePage() {
  const { organisation, role, isOwnerOrAdmin, isReadOnly } = useOrg();
  const [records, setRecords] = useState<CisRecordWithPerson[]>([]);
  const [people, setPeople] = useState<CisPersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingPerson, setCreatingPerson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [personId, setPersonId] = useState('');
  const [utrRecorded, setUtrRecorded] = useState(false);
  const [manualStatus, setManualStatus] = useState<ManualStatus>('');
  const [note, setNote] = useState('');
  const [showCreatePerson, setShowCreatePerson] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRelationship, setNewRelationship] = useState<'subcontractor_individual' | 'subcontractor_company'>('subcontractor_company');
  const [newTradingName, setNewTradingName] = useState('');
  const [newTrade, setNewTrade] = useState('');

  const canManage = (isOwnerOrAdmin || role === 'finance') && !isReadOnly;
  const canCreateWorkforce = (isOwnerOrAdmin || role === 'project_manager') && !isReadOnly;
  const organisationId = organisation?.id ?? null;

  useEffect(() => {
    let active = true;
    if (!organisationId) {
      setRecords([]);
      setPeople([]);
      setLoading(false);
      setError(null);
      setLoadError(false);
      setEditingId(null);
      setPersonId('');
      setUtrRecorded(false);
      setManualStatus('');
      setNote('');
      return () => { active = false; };
    }

    setLoading(true);
    setRecords([]);
    setPeople([]);
    setError(null);
    setLoadError(false);
    setEditingId(null);
    setPersonId('');
    setUtrRecorded(false);
    setManualStatus('');
    setNote('');
    setNotice(null);
    Promise.all([cisService.getRecords(organisationId), cisService.getEligiblePeople(organisationId)])
      .then(([nextRecords, nextPeople]) => {
        if (!active) return;
        setRecords(nextRecords);
        setPeople(nextPeople);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'We could not load CIS records.');
        setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [organisationId, refreshKey]);

  const availablePeople = useMemo(() => {
    const alreadyRecorded = new Set(records.map((record) => record.person_id));
    return people.filter((person) => person.id === personId || !alreadyRecorded.has(person.id));
  }, [people, records, personId]);

  function resetForm() {
    setEditingId(null);
    setPersonId('');
    setUtrRecorded(false);
    setManualStatus('');
    setNote('');
  }

  function startEdit(record: CisRecordWithPerson) {
    setEditingId(record.id);
    setPersonId(record.person_id);
    setUtrRecorded(record.utr_recorded);
    setManualStatus(record.gross_payment_status === true ? '0' : record.deduction_rate === 20 ? '20' : record.deduction_rate === 30 ? '30' : '');
    setNote(record.note ?? '');
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organisationId || !personId || !canManage) return;
    setSaving(true);
    setError(null);
    setLoadError(false);
    setNotice(null);

    try {
      await cisService.saveRecord(organisationId, personId, {
        utr_recorded: utrRecorded,
        deduction_rate: manualStatus ? Number(manualStatus) : null,
        gross_payment_status: manualStatus === '' ? null : manualStatus === '0',
        note: note.trim() || null,
      });
      resetForm();
      setNotice('CIS details saved as an internal record. No HMRC check was performed.');
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not save this CIS record.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organisationId || !canCreateWorkforce) return;
    setCreatingPerson(true);
    setError(null);
    setLoadError(false);
    setNotice(null);

    try {
      const person = await cisService.createWorkforceSubcontractor(organisationId, {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        relationship: newRelationship,
        trading_name: newTradingName.trim() || null,
        primary_trade: newTrade.trim() || null,
        business_type: newRelationship === 'subcontractor_company' ? 'limited_company' : 'sole_trader',
      });
      setPeople((current) => [...current, person].sort((left, right) => left.last_name.localeCompare(right.last_name)));
      setPersonId(person.id);
      setShowCreatePerson(false);
      setNewFirstName('');
      setNewLastName('');
      setNewTradingName('');
      setNewTrade('');
      setNotice('Workforce record created. Add any manually recorded CIS details below; this does not verify the subcontractor with HMRC.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not add this subcontractor to Workforce.');
    } finally {
      setCreatingPerson(false);
    }
  }

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 max-w-[1400px] mx-auto space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-status-purple">CIS workspace</p>
        <h1 className="mt-2 text-2xl font-semibold text-main">Subcontractor CIS records</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          These are internal records for {organisation?.name || 'your organisation'}. Statuses entered here are not HMRC verification,
          and must not be used as confirmation for a payment or tax return.
        </p>
      </header>

      <section className="rounded-xl border border-status-amber/40 bg-status-amber-pale p-5" role="status">
        <p className="font-semibold text-main">HMRC services are not connected</p>
        <p className="mt-1 text-sm leading-relaxed text-main">
          UTR verification, CIS300 filing/export, deduction calculations and statement emails are unavailable. No HMRC request is made by this page.
        </p>
      </section>

      {!organisation && (
        <section className="rounded-xl border border-border bg-white p-5 text-sm text-muted" role="status">
          Select or set up an organisation to view its CIS records.
        </section>
      )}

      {notice && <p className="rounded-lg border border-status-green/30 bg-status-green-pale px-4 py-3 text-sm text-status-green" role="status">{notice}</p>}
      {error && (
        <div className="rounded-lg border border-status-red/30 bg-status-red-pale px-4 py-3 text-sm text-status-red" role="alert">
          <p>{error}</p>
          {loadError && <button className="mt-2 font-semibold underline" onClick={() => setRefreshKey((key) => key + 1)}>Try loading again</button>}
        </div>
      )}

      {organisation && (
        <>
          <section className="rounded-xl border border-border bg-white p-5 md:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-main">{editingId ? 'Edit internal CIS record' : 'Add a subcontractor record'}</h2>
              <p className="mt-1 text-sm text-muted">Choose a subcontractor already listed in Workforce. Do not enter or store a UTR here.</p>
            </div>

            {canCreateWorkforce && (
              <div className="mb-5 border-b border-border pb-5">
                {!showCreatePerson ? (
                  <button type="button" onClick={() => setShowCreatePerson(true)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-main hover:bg-page">
                    Add a subcontractor to Workforce
                  </button>
                ) : (
                  <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleCreatePerson}>
                    <p className="text-sm font-semibold text-main md:col-span-2">New Workforce subcontractor</p>
                    <div>
                      <label htmlFor="cis-new-first" className="mb-1 block text-xs font-medium text-main">First name</label>
                      <input id="cis-new-first" className="h-10 w-full rounded-lg border border-border bg-page px-3 text-sm" value={newFirstName} onChange={(event) => setNewFirstName(event.target.value)} maxLength={100} required />
                    </div>
                    <div>
                      <label htmlFor="cis-new-last" className="mb-1 block text-xs font-medium text-main">Last name</label>
                      <input id="cis-new-last" className="h-10 w-full rounded-lg border border-border bg-page px-3 text-sm" value={newLastName} onChange={(event) => setNewLastName(event.target.value)} maxLength={100} required />
                    </div>
                    <div>
                      <label htmlFor="cis-new-type" className="mb-1 block text-xs font-medium text-main">Business type</label>
                      <select id="cis-new-type" className="h-10 w-full rounded-lg border border-border bg-page px-3 text-sm" value={newRelationship} onChange={(event) => setNewRelationship(event.target.value as typeof newRelationship)}>
                        <option value="subcontractor_company">Company</option>
                        <option value="subcontractor_individual">Individual / sole trader</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="cis-new-trading-name" className="mb-1 block text-xs font-medium text-main">Trading name <span className="font-normal text-muted">(optional)</span></label>
                      <input id="cis-new-trading-name" className="h-10 w-full rounded-lg border border-border bg-page px-3 text-sm" value={newTradingName} onChange={(event) => setNewTradingName(event.target.value)} maxLength={150} />
                    </div>
                    <div>
                      <label htmlFor="cis-new-trade" className="mb-1 block text-xs font-medium text-main">Trade <span className="font-normal text-muted">(optional)</span></label>
                      <input id="cis-new-trade" className="h-10 w-full rounded-lg border border-border bg-page px-3 text-sm" value={newTrade} onChange={(event) => setNewTrade(event.target.value)} maxLength={100} />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="submit" disabled={creatingPerson || loading} className="h-10 rounded-lg bg-primary-500 px-4 text-sm font-semibold text-white disabled:opacity-50">{creatingPerson ? 'Saving…' : 'Create Workforce record'}</button>
                      <button type="button" onClick={() => setShowCreatePerson(false)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-main">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {!canCreateWorkforce && !people.length && !loading && (
              <p className="mb-4 rounded-lg bg-page px-4 py-3 text-sm text-muted">
                No active subcontractors are in this organisation’s live Workforce records. An owner, admin or project manager must add one before a CIS record can be created.
              </p>
            )}

            {!canManage && (
              <p className="mb-4 rounded-lg bg-page px-4 py-3 text-sm text-muted">
                {isReadOnly ? 'This organisation is currently read-only.' : 'Only organisation owners, admins and finance members can change CIS records.'}
              </p>
            )}

            {people.length === 0 && !loading ? (
              <p className="rounded-lg bg-page px-4 py-3 text-sm text-muted">
                There are no active subcontractors in Workforce yet. Add one above to begin an internal CIS record.
              </p>
            ) : (
              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="md:col-span-2">
                  <label htmlFor="cis-person" className="mb-1.5 block text-xs font-medium text-main">Subcontractor</label>
                  <select
                    id="cis-person"
                    className="h-11 w-full rounded-lg border border-border bg-page px-3 text-sm text-main disabled:opacity-60"
                    value={personId}
                    onChange={(event) => setPersonId(event.target.value)}
                    disabled={!canManage || saving || loading || Boolean(editingId)}
                    required
                  >
                    <option value="">Select a workforce subcontractor</option>
                    {availablePeople.map((person) => (
                      <option key={person.id} value={person.id}>
                        {personName(person)}{person.primary_trade ? ` · ${person.primary_trade}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm text-main">
                  <input type="checkbox" checked={utrRecorded} onChange={(event) => setUtrRecorded(event.target.checked)} disabled={!canManage || saving || loading} />
                  UTR recorded in your own records
                </label>

                <div>
                  <label htmlFor="cis-status" className="mb-1.5 block text-xs font-medium text-main">Manually recorded status</label>
                  <select
                    id="cis-status"
                    className="h-11 w-full rounded-lg border border-border bg-page px-3 text-sm text-main disabled:opacity-60"
                    value={manualStatus}
                    onChange={(event) => setManualStatus(event.target.value as ManualStatus)}
                    disabled={!canManage || saving || loading}
                  >
                    <option value="">No status recorded</option>
                    <option value="20">Standard deduction rate · 20%</option>
                    <option value="30">Higher deduction rate · 30%</option>
                    <option value="0">Gross payment status · 0%</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="cis-note" className="mb-1.5 block text-xs font-medium text-main">Internal note</label>
                  <textarea
                    id="cis-note"
                    className="min-h-24 w-full rounded-lg border border-border bg-page p-3 text-sm text-main disabled:opacity-60"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={2000}
                    placeholder="Record who provided the information or any follow-up needed."
                    disabled={!canManage || saving || loading}
                  />
                </div>

                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <button type="submit" disabled={!canManage || saving || loading || !personId} className="h-10 rounded-lg bg-primary-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save internal record'}
                  </button>
                  {editingId && <button type="button" onClick={resetForm} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-main">Cancel</button>}
                </div>
              </form>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b border-border p-5">
              <h2 className="text-base font-semibold text-main">Organisation register</h2>
              <p className="mt-1 text-sm text-muted">{records.length} record{records.length === 1 ? '' : 's'} · manual information only</p>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-muted" role="status">Loading this organisation’s CIS records…</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted" role="status">
                <i className="ri-inbox-line mb-2 block text-2xl" aria-hidden="true"></i>
                No CIS records have been added for this organisation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-page/60 text-xs text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Subcontractor</th>
                      <th className="px-4 py-3 font-medium">UTR on file</th>
                      <th className="px-4 py-3 font-medium">Status noted</th>
                      <th className="px-4 py-3 font-medium">Last updated</th>
                      <th className="px-4 py-3 font-medium">Internal note</th>
                      {canManage && <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-t border-border align-top">
                        <td className="px-4 py-3 font-medium text-main">
                          {personName(record.person)}
                          {record.person?.primary_trade && <span className="mt-0.5 block text-xs font-normal text-muted">{record.person.primary_trade}</span>}
                        </td>
                        <td className="px-4 py-3 text-muted">{record.utr_recorded ? 'Recorded' : 'Not recorded'}</td>
                        <td className="px-4 py-3 text-muted">{statusLabel(record)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{dateLabel(record.updated_at)}</td>
                        <td className="max-w-xs whitespace-pre-wrap px-4 py-3 text-muted">{record.note || '—'}</td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => startEdit(record)} className="rounded-md px-2 py-1 font-semibold text-primary-600 hover:bg-page">Edit</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
