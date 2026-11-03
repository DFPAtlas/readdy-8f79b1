import BusinessVerification from '@/components/feature/BusinessVerification';
import { useCallback, useEffect, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/components/base/Toast';
import { organisationsService } from '@/services/organisations.service';
import { accountClosureService } from '@/services/account-closure.service';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import OrganisationDetailsForm from '@/pages/settings/organisation/components/OrganisationDetailsForm';
import LogoUploader from '@/pages/settings/organisation/components/LogoUploader';
import {
  EMPTY_ORG_FORM,
  organisationToForm,
  validateLogoFile,
  type OrgFormValues,
} from '@/pages/settings/organisation/organisation.constants';

const toNullable = (value: string): string | null => (value.trim() === '' ? null : value.trim());

export default function OrganisationSettingsPage() {
  const { organisation, membership, refreshOrganisations } = useOrg();
  const { showToast } = useToast();

  const orgId = organisation?.id ?? null;
  const canEdit = membership?.role === 'owner' || membership?.role === 'admin';

  const [form, setForm] = useState<OrgFormValues>(EMPTY_ORG_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [closureExportAvailable, setClosureExportAvailable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (organisation) setForm(organisationToForm(organisation));
  }, [organisation]);

  useEffect(() => {
    const client = getSupabase();
    if (!orgId || !canEdit || !client) {
      setClosureExportAvailable(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await (client as any)
        .from('organisation_deletion_requests')
        .select('status,purge_after')
        .eq('organisation_id', orgId)
        .maybeSingle();
      const available = data
        && ['scheduled', 'blocked'].includes(data.status)
        && new Date(data.purge_after).getTime() >= Date.now();
      if (!cancelled) setClosureExportAvailable(Boolean(available));
    })();
    return () => { cancelled = true; };
  }, [orgId, canEdit]);

  useEffect(() => {
    const path = organisation?.logo_path;
    if (!path) {
      setLogoPreview(null);
      return;
    }
    let cancelled = false;
    organisationsService
      .getSignedObjectUrl(path, 3600)
      .then((url) => {
        if (!cancelled) setLogoPreview(url);
      })
      .catch(() => {
        if (!cancelled) setLogoPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [organisation?.logo_path]);

  const handleChange = useCallback((field: keyof OrgFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (!orgId || !canEdit) return;
    if (!form.name.trim()) {
      showToast('Company name is required', 'warning');
      return;
    }

    const payload: Database['public']['Tables']['organisations']['Update'] = {
      name: form.name.trim(),
      trading_name: toNullable(form.trading_name),
      company_number: toNullable(form.company_number),
      utr_reference: toNullable(form.utr_reference),
      vat_number: toNullable(form.vat_number),
      address_line1: toNullable(form.address_line1),
      address_line2: toNullable(form.address_line2),
      town_city: toNullable(form.town_city),
      county: toNullable(form.county),
      postcode: toNullable(form.postcode),
      phone: toNullable(form.phone),
      email: toNullable(form.email),
      default_currency: form.default_currency,
    };

    setSaving(true);
    try {
      await organisationsService.updateOrganisation(orgId, payload);
      await refreshOrganisations();
      showToast('Company details saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save company details', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = async (file: File) => {
    if (!orgId || !canEdit) return;
    const validationError = validateLogoFile(file);
    if (validationError) {
      showToast(validationError, 'warning');
      return;
    }

    setUploading(true);
    try {
      const path = await organisationsService.uploadLogo(orgId, file);
      await organisationsService.updateOrganisation(orgId, { logo_path: path });
      setLogoPreview(URL.createObjectURL(file));
      await refreshOrganisations();
      showToast('Logo updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not upload the logo', 'warning');
    } finally {
      setUploading(false);
    }
  };

  const handleClosureExport = async () => {
    if (!orgId || !canEdit || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const filename = await accountClosureService.downloadOrganisationExport(orgId);
      showToast(`Export downloaded: ${filename}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The organisation export could not be prepared.';
      setExportError(message);
      showToast(message, 'warning');
    } finally {
      setExporting(false);
    }
  };

  if (!organisation) {
    return (
      <div className="flex items-center justify-center py-24">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto space-y-6">
      {orgId && canEdit && <BusinessVerification orgId={orgId} canEdit={canEdit} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground-950">Company</h1>
          <p className="text-sm text-foreground-500 mt-1">Manage your organisation details and branding.</p>
        </div>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-background-100 border border-background-200">
          <i className="ri-lock-line text-foreground-500 mt-0.5"></i>
          <p className="text-sm text-foreground-600">Only owners and admins can edit company details.</p>
        </div>
      )}

      <LogoUploader canEdit={canEdit} previewUrl={logoPreview} uploading={uploading} onSelectFile={handleLogoSelect} />

      <OrganisationDetailsForm values={form} canEdit={canEdit} onChange={handleChange} />

      {canEdit && closureExportAvailable && (
        <section className="space-y-3 rounded-xl border border-background-200 p-4">
          <div>
            <h2 className="font-semibold text-foreground-900">Account closure export</h2>
            <p className="mt-1 text-sm text-foreground-600">
              Download a ZIP of your organisation records and stored files during the closure window. Credential-like fields are redacted; BuildNerve billing and legally retained records are handled separately.
            </p>
          </div>
          {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}
          <button
            type="button"
            onClick={() => void handleClosureExport()}
            disabled={exporting}
            className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-xl border border-background-300 text-sm font-semibold hover:bg-background-50 disabled:opacity-50"
          >
            {exporting ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-download-cloud-2-line"></i>}
            {exporting ? 'Preparing export…' : 'Download organisation export'}
          </button>
        </section>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  );
}
