import { Link } from 'react-router-dom';

export default function InviteSubcontractor() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="space-y-4 rounded-xl border border-border bg-white p-8">
        <h1 className="text-2xl font-bold">Invitations are not available yet</h1>
        <p className="text-sm text-muted">
          This workflow is not connected to saved invitations or email delivery, so no invitation has been sent. Add the person to the workforce register while invitation sending is being completed.
        </p>
        <Link className="inline-flex rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white" to="/workforce">
          Return to workforce
        </Link>
      </section>
    </main>
  );
}
