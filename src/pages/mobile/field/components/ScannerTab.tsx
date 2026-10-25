import { Link } from 'react-router-dom';
export default function ScannerTab() {
  return <section><h2>Document scanner</h2><p>Automatic extraction is not connected on this screen.</p><Link to="/app/documents/ingestion">Upload a document for review</Link></section>;
}
