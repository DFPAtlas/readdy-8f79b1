import { useCallback, useEffect, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/components/base/Toast';
import { organisationsService } from '@/services/organisations.service';
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

  useEffect(() => {
    if (organisation) setForm(organisationToForm(organisation));
  }, [organisation]);

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

  if (!organisation) {
    return (
      <div className="flex items-center justify-center py-24">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto space-y-6">
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