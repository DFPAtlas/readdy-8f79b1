import { Link } from 'react-router-dom';

export default function RetentionScheduler() {
  return (
    <section className="bg-white border border-border rounded-xl p-5 space-y-3">
      <h2 className="text-lg font-semibold">Retention releases</h2>
      <p className="text-sm text-muted">
        Use the retention register to record contractual terms, achieved milestones, release requests and actual receipts or payments.
      </p>
      <Link to="/retention" className="inline-flex rounded-lg bg-primary-500 text-white px-4 py-2 font-semibold text-sm">
        Open retention register
      </Link>
    </section>
  );
}
