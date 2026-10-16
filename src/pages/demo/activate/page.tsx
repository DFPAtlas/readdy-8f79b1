import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';

export default function DemoActivationPage() {
  const { user, loading } = useAuth();
  const [message, setMessage] = useState('Verifying your secure demo link…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setMessage('This sign-in link is invalid or has expired. Request a new demo link from the homepage.');
      setFailed(true);
      return;
    }

    let active = true;
    const activate = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        if (active) {
          setMessage('Demo access is temporarily unavailable. Please try again later.');
          setFailed(true);
        }
        return;
      }

      const { data: organisationId, error } = await supabase.rpc('activate_demo_workspace');
      if (!active) return;
      if (error || !organisationId) {
        setMessage('This demo link may have expired. Return to the homepage and request another link.');
        setFailed(true);
        return;
      }

      localStorage.setItem('buildnerveOrgId', organisationId);
      window.location.replace('/app');
    };

    void activate();
    return () => { active = false; };
  }, [loading, user]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-page px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <i className={failed ? 'ri-error-warning-line text-xl' : 'ri-loader-4-line animate-spin text-xl'} aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-main">BuildNerve demo workspace</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted" role={failed ? 'alert' : 'status'}>{message}</p>
        {failed && <Link to="/#demo" className="mt-6 inline-flex rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white">Request a new demo link</Link>}
      </section>
    </main>
  );
}
