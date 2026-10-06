import { CURRENCY_OPTIONS, type OrgFormValues } from '@/pages/settings/organisation/organisation.constants';

interface OrganisationDetailsFormProps {
  values: OrgFormValues;
  canEdit: boolean;
  onChange: (field: keyof OrgFormValues, value: string) => void;
}

interface FieldProps {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}

function Field({ label, value, disabled, onChange, placeholder, type = 'text', className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-foreground-700">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 px-3 rounded-lg border border-background-200 text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 disabled:bg-background-50 disabled:text-foreground-500 transition-colors"
      />
    </div>
  );
}

export default function OrganisationDetailsForm({ values, canEdit, onChange }: OrganisationDetailsFormProps) {
  const disabled = !canEdit;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-background-200 p-5">
        <h2 className="text-sm font-semibold text-foreground-950 mb-4">Company details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company name" value={values.name} disabled={disabled} onChange={(v) => onChange('name', v)} placeholder="Northgate Construction Ltd" />
          <Field label="Trading name" value={values.trading_name} disabled={disabled} onChange={(v) => onChange('trading_name', v)} placeholder="Northgate" />
          <Field label="Company number" value={values.company_number} disabled={disabled} onChange={(v) => onChange('company_number', v)} placeholder="12345678" />
          <Field label="UTR reference" value={values.utr_reference} disabled={disabled} onChange={(v) => onChange('utr_reference', v)} placeholder="1234567890" />
          <Field label="VAT number" value={values.vat_number} disabled={disabled} onChange={(v) => onChange('vat_number', v)} placeholder="GB123456789" />
          <div>
            <label className="text-xs font-medium text-foreground-700">Default currency</label>
            <select
              value={values.default_currency}
              disabled={disabled}
              onChange={(e) => onChange('default_currency', e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-background-200 text-sm text-foreground-900 bg-white focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 disabled:bg-background-50 disabled:text-foreground-500 cursor-pointer transition-colors"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-background-200 p-5">
        <h2 className="text-sm font-semibold text-foreground-950 mb-4">Registered address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Address line 1" value={values.address_line1} disabled={disabled} onChange={(v) => onChange('address_line1', v)} className="sm:col-span-2" />
          <Field label="Address line 2" value={values.address_line2} disabled={disabled} onChange={(v) => onChange('address_line2', v)} className="sm:col-span-2" />
          <Field label="Town / city" value={values.town_city} disabled={disabled} onChange={(v) => onChange('town_city', v)} />
          <Field label="County" value={values.county} disabled={disabled} onChange={(v) => onChange('county', v)} />
          <Field label="Postcode" value={values.postcode} disabled={disabled} onChange={(v) => onChange('postcode', v)} placeholder="SW1A 1AA" />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-background-200 p-5">
        <h2 className="text-sm font-semibold text-foreground-950 mb-4">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone" value={values.phone} disabled={disabled} onChange={(v) => onChange('phone', v)} placeholder="020 7946 0000" />
          <Field label="Email" value={values.email} disabled={disabled} onChange={(v) => onChange('email', v)} type="email" placeholder="accounts@northgate.co.uk" />
        </div>
      </section>
    </div>
  );
}