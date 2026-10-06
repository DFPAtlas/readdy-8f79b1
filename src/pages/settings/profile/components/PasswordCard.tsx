import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/base/Toast';

export default function PasswordCard() {
  const { updatePassword } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'warning');
      return;
    }
    if (password !== confirm) {
      showToast('Passwords do not match', 'warning');
      return;
    }

    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);

    if (error) {
      showToast(error.message, 'warning');
      return;
    }
    setPassword('');
    setConfirm('');
    showToast('Password updated', 'success');
  };

  return (
    <section className="bg-white rounded-2xl border border-background-200 p-5">
      <h2 className="text-sm font-semibold text-foreground-950 mb-1">Change password</h2>
      <p className="text-xs text-foreground-500 mb-4">Use at least 8 characters. You will stay signed in on this device.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-foreground-700">New password</label>
          <input
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-700">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 transition-colors"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving || !password || !confirm}
          className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
        >
          {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-lock-password-line"></i>}
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </section>
  );
}