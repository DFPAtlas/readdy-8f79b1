import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { helpArticles, helpSections } from './articles';

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('All');

  const results = useMemo(() => helpArticles.filter((article) => {
    const matchesSection = section === 'All' || article.section === section;
    const text = [article.title, article.summary, article.overview, article.section, article.audience, ...article.steps].join(' ').toLowerCase();
    return matchesSection && text.includes(query.trim().toLowerCase());
  }), [query, section]);

  return (
    <main className="min-h-screen bg-page">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <Link to="/" className="text-sm font-semibold text-primary-700 hover:underline">← BuildNerve home</Link>
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">BuildNerve help centre</p>
          <h1 className="text-3xl md:text-4xl font-bold text-main mt-2">Learn how BuildNerve works</h1>
          <p className="text-muted mt-3 max-w-2xl">Guides for the public website, your account, the dashboard, jobs, field work, payments, commercial tools and administration.</p>
          <label htmlFor="help-search" className="sr-only">Search help guides</label>
          <input id="help-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for jobs, payments, mobile, invoices…" className="mt-6 w-full h-12 px-4 bg-white border border-border rounded-xl text-main focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </header>

        <nav aria-label="Help topics" className="flex flex-wrap gap-2">
          {helpSections.map((item) => (
            <button key={item} type="button" onClick={() => setSection(item)} aria-pressed={section === item}
              className={`px-3 py-2 rounded-full text-sm border ${section === item ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-main border-border hover:border-primary-300'}`}>
              {item}
            </button>
          ))}
        </nav>

        <p className="text-sm text-muted" role="status">{results.length} {results.length === 1 ? 'guide' : 'guides'} found</p>
        {results.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-8">
            <h2 className="font-semibold text-main">No matching guides</h2>
            <p className="text-sm text-muted mt-1">Try another term or select All.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((article) => (
              <Link key={article.slug} to={`/help/${article.slug}`}
                className="bg-white border border-border rounded-2xl p-5 hover:border-primary-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <p className="text-xs font-semibold text-primary-700">{article.section} · {article.audience}</p>
                <h2 className="font-bold text-main text-lg mt-2">{article.title}</h2>
                <p className="text-sm text-muted mt-2 leading-6">{article.summary}</p>
                <span className="inline-block mt-4 text-sm font-semibold text-primary-700">Read guide →</span>
              </Link>
            ))}
          </div>
        )}
        <div className="bg-white border border-border rounded-2xl p-5 text-sm">
          <h2 className="font-semibold text-main">Need more help?</h2>
          <p className="text-muted mt-1">For an account or project issue, contact your organisation administrator. Platform staff can review support cases in the admin workspace.</p>
        </div>
      </div>
    </main>
  );
}
