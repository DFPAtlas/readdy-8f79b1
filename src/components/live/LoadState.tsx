export default function LoadState({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  if (loading) return <p role="status" className="p-4">Loading saved records…</p>;
  if (error) return <div role="alert" className="p-4 border border-red-300 rounded-xl"><p>{error}</p><button className="underline mt-2" onClick={retry}>Try again</button></div>;
  return null;
}
