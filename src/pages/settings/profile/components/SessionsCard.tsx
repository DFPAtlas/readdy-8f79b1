import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { getSupabase } from '@/lib/supabase';
import ConfirmDialog from '@/components/base/ConfirmDialog';

export default function SessionsCard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const handleSignOutAll = async () => {
    setConfirmOpen(false);
    setWorking(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Backend is not available');
      await supabase.auth.signOut({ scope: 'global' });
      navigate('/sign-in');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not sign out of all devices', 'warning');
      setWorking(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-background-200 p-5">
      <h2 className="text-sm font-semibold text-foreground-950 mb-1">Active sessions</h2>
      <p className="text-xs text-foreground-500 mb-4">
        Signing out of all devices ends every session, including this one. You will need to sign in again.
      </p>
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={working}
        className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-xl border border-status-red/30 bg-white text-sm font-semibold text-status-red hover:bg-status-red/5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
      >
        <i className="ri-logout-circle-r-line"></i>
        Sign out of all devices
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out of all devices?"
        description="Every device signed in to your account will be signed out immediately. You will need to sign in again on this device."
        confirmText="Sign out everywhere"
        variant="danger"
        onConfirm={handleSignOutAll}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}