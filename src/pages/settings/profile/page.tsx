import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/base/Toast';
import { getSupabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import PersonalDetailsCard from '@/pages/settings/profile/components/PersonalDetailsCard';
import PasswordCard from '@/pages/settings/profile/components/PasswordCard';
import SessionsCard from '@/pages/settings/profile/components/SessionsCard';

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? '');
    let cancelled = false;

    authService
      .getProfile(user.id)
      .then((profile) => {
        if (cancelled) return;
        const metadataName = (user.user_metadata?.full_name as string | undefined) ?? '';
        setFullName(profile?.full_name ?? metadataName);
      })
      .catch(() => {
        if (!cancelled) setFullName((user.user_metadata?.full_name as string | undefined) ?? '');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const name = fullName.trim();
    if (!name) {
      showToast('Please enter your name', 'warning');
      return;
    }

    setSaving(true);
    try {
      await authService.updateProfile(user.id, { full_name: name });
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.updateUser({ data: { full_name: name } });
      }
      showToast('Profile updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update your profile', 'warning');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground-950">My profile</h1>
        <p className="text-sm text-foreground-500 mt-1">Manage your personal details and account security.</p>
      </div>

      <PersonalDetailsCard
        fullName={fullName}
        email={email}
        saving={saving}
        onChangeName={setFullName}
        onSave={handleSave}
      />

      <PasswordCard />

      <SessionsCard />
    </div>
  );
}