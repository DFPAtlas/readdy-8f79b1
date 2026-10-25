import { Navigate, useParams } from 'react-router-dom';

/** Use the existing company-scoped job workspace rather than a sample site. */
export default function MobileJobSitePage() {
  const { jobId } = useParams();
  return <Navigate to={jobId ? `/jobs/${encodeURIComponent(jobId)}` : '/mobile/jobs'} replace />;
}
