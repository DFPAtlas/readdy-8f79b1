import { Link, useSearchParams } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';

export default function MobileFieldPage() {
  const [params] = useSearchParams();
  const scan = params.get('tab') === 'scan';
  return <main className="min-h-screen p-4 pb-24 space-y-4"><h1 className="text-xl font-bold">{scan ? 'Document capture' : 'Site log capture'}</h1><p>{scan ? 'Automatic receipt extraction is not connected here. Upload the original document through the document workspace for review.' : 'Voice transcription is not connected here. Select a job and create a written daily log from its saved job workspace.'}</p><Link className="block underline" to={scan ? '/app/documents/ingestion' : '/mobile/jobs'}>{scan ? 'Open document ingestion' : 'Choose a job'}</Link><MobileBottomNav /></main>;
}
