import { Link, useParams } from 'react-router-dom';
import { helpArticles } from './articles';

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = helpArticles.find((item) => item.slug === slug);

  if (!article) {
    return (
      <main className="min-h-screen bg-page px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-main">Guide not found</h1>
          <Link to="/help" className="inline-block mt-4 text-primary-700 hover:underline">Browse help centre</Link>
        </div>
      </main>
    );
  }

  const related = helpArticles.filter((item) => item.section === article.section && item.slug !== article.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-page">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted flex flex-wrap gap-2">
          <Link to="/" className="hover:text-primary-700">BuildNerve</Link><span>/</span>
          <Link to="/help" className="hover:text-primary-700">Help centre</Link><span>/</span>
          <span aria-current="page" className="text-main">{article.title}</span>
        </nav>
        <article className="mt-8 bg-white border border-border rounded-2xl p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">{article.section} · {article.audience}</p>
          <h1 className="text-3xl font-bold text-main mt-2">{article.title}</h1>
          <p className="text-lg text-muted mt-3">{article.summary}</p>

          <section className="mt-10">
            <h2 className="text-xl font-bold text-main">What this area does</h2>
            <p className="mt-3 text-main leading-7">{article.overview}</p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-bold text-main">How to use it</h2>
            <ol className="mt-4 list-decimal pl-6 space-y-3 text-main leading-7">
              {article.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>

          {article.caution && (
            <aside className="mt-10 border-l-4 border-amber-500 bg-amber-50 rounded-r-xl p-5" aria-label="Check before use">
              <h2 className="font-bold text-amber-950">Check before use</h2>
              <p className="text-sm text-amber-950 mt-2 leading-6">{article.caution}</p>
            </aside>
          )}

          <section className="mt-10">
            <h2 className="text-xl font-bold text-main">Go to the relevant page</h2>
            <div className="flex flex-wrap gap-3 mt-4">
              {article.links.map((link) => (
                <Link key={link.href} to={link.href} className="inline-flex px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600">
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">Some workspace links require you to sign in and join an organisation.</p>
          </section>
        </article>
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-main">Related guides</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {related.map((item) => (
                <Link key={item.slug} to={`/help/${item.slug}`} className="bg-white border border-border rounded-xl p-4 hover:border-primary-300">
                  <span className="font-semibold text-main">{item.title}</span>
                  <span className="block text-sm text-muted mt-1">{item.summary}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
