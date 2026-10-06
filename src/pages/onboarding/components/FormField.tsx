interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  autoComplete?: string;
}

export default function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  optional = false,
  error,
  hint,
  autoComplete,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-main mb-1.5">
        {label}
        {optional && <span className="text-muted font-normal"> (optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-11 px-4 bg-white border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50 ${error ? 'border-status-red' : 'border-border'}`}
      />
      {error && <p className="text-status-red text-xs mt-1">{error}</p>}
      {!error && hint && <p className="text-muted text-xs mt-1.5">{hint}</p>}
    </div>
  );
}