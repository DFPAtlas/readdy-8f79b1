import { Link } from 'react-router-dom';
export default function VoiceLogTab() {
  return <section><h2>Voice daily logs</h2><p>Voice transcription is not connected. No recording has been saved.</p><Link to="/mobile/jobs">Choose a job to write a daily log</Link></section>;
}
