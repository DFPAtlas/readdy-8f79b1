interface PersonalDetailsCardProps {
  fullName: string;
  email: string;
  onChangeName: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}

export default function PersonalDetailsCard({ fullName, email, onChangeName, onSave, saving }: PersonalDetailsCardProps) {
  return (
    <section className="bg-white rounded-2xl border border-background-200 p-5">
      <h2 className="text-sm font-semibold text-foreground-950 mb-4">Personal details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-foreground-700">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Martin Hewett"
            className="mt-1 w-full h-10 px-3 rounded-lg border border-background-200 text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-700">Email address</label>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="mt-1 w-full h-10 px-3 rounded-lg border border-background-200 bg-background-50 text-sm text-foreground-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-foreground-400 mt-1">Your email is used to sign in and cannot be changed here.</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || !fullName.trim()}
          className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
        >
          {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
          {saving ? 'Saving…' : 'Save name'}
        </button>
      </div>
    </section>
  );
}