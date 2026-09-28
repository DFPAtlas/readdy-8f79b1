import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';

type Article = {
  id: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  href: string;
  action: string;
  note?: string;
};

const articles: Article[] = [
  {
    id: 'first-job', category: 'Getting started', title: 'Create your first job',
    summary: 'Set up the client, site, contract and project details in one guided form.',
    steps: ['Open Jobs and choose New job.', 'Choose an existing client or add a new one, then enter the job and site details.', 'If you upload a contract, review every extracted term before confirming it.', 'Check the final summary and create the job. You can return to an unfinished draft on this device.'],
    href: '/jobs/new', action: 'Create a job',
    note: 'An organisation must be selected before a job can be created. Contract extraction is assistance: check dates, amounts and clauses against the original document.',
  },
  {
    id: 'client', category: 'People', title: 'Add and manage clients',
    summary: 'Keep client contact and site information with the jobs they relate to.',
    steps: ['Open Clients to find an existing record.', 'You can add a new client while creating a job.', 'Open a client record to review the linked project information.'],
    href: '/clients', action: 'Open Clients',
  },
  {
    id: 'workforce', category: 'People', title: 'Invite a subcontractor',
    summary: 'Bring a team member into the workforce workspace.',
    steps: ['Open Workforce and choose the invitation action.', 'Enter the person’s details and review the invitation before sending.', 'Track their profile and documents in Workforce.'],
    href: '/workforce/invite', action: 'Invite a subcontractor',
    note: 'Confirm the invited person’s access and document status before relying on them for site work.',
  },
  {
    id: 'site-log', category: 'On site', title: 'Record a daily site log',
    summary: 'Capture what happened on a job on the day it happened.',
    steps: ['Open Jobs and select the job.', 'Go to Daily logs and create a new entry.', 'Record the date, work completed and relevant site information.', 'Review the entry and save it with the correct job.'],
    href: '/jobs', action: 'Find a job',
  },
  {
    id: 'evidence', category: 'On site', title: 'Find project evidence',
    summary: 'Review photos, notes and records associated with a job.',
    steps: ['Open Evidence and use the available filters to find a record.', 'Open an item to inspect its details and project link.', 'Check visibility before sharing anything with a client.'],
    href: '/evidence', action: 'Open Evidence',
    note: 'The separate /site/:jobId/capture screen still uses demonstration data and demo save messages. Do not treat a toast on that screen as proof that evidence was uploaded.',
  },
  {
    id: 'variation', category: 'Commercial', title: 'Create and follow a variation',
    summary: 'Record a change in scope and track its review.',
    steps: ['Open Variations and choose New variation.', 'Select the job and describe the requested change and cost or time impact.', 'Review the details before submitting.', 'Return to Variations to follow its status.'],
    href: '/variations/new', action: 'Create a variation',
    note: 'Keep the underlying instruction and supporting evidence with the job.',
  },
  {
    id: 'deadlines', category: 'Commercial', title: 'Review deadlines',
    summary: 'See upcoming notices and contract dates in one place.',
    steps: ['Open Deadlines and filter the calendar or list.', 'Open the relevant job to check the contract and source dates.', 'Confirm any notice date with the contract and a qualified adviser where needed.'],
    href: '/deadlines', action: 'Open Deadlines',
    note: 'Calculated dates are prompts for review, not legal advice or a guarantee that a notice is valid.',
  },
  {
    id: 'billing', category: 'Account', title: 'Review your subscription and invoices',
    summary: 'Find your current plan, usage and billing history.',
    steps: ['Open Billing to view your subscription.', 'Use Plan or Usage for the relevant details.', 'Open Invoices to find the billing history available to your account.'],
    href: '/app/settings/billing', action: 'Open Billing',
  },
  {
    id: 'assist', category: 'Account', title: 'Use BuildNerve Assist',
    summary: 'Ask questions about work in context and inspect the sources returned.',
    steps: ['Select Assist in the top bar.', 'Ask a specific question and include the job context where appropriate.', 'Open source citations and check important answers against the underlying records.', 'Use AI & Automation settings to review your organisation controls.'],
    href: '/app/settings/ai-automation', action: 'AI settings',
    note: 'Assist can make mistakes. Review contract, safety, financial and legal outputs before acting on them.',
  },
];

const categories = ['All', ...Array.from(new Set(articles.map((article) => article.category)))];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(() => articles.filter((article) => {
    const matchesCategory = category === 'All' || article.category === category;
    const searchText = [article.title, article.summary, article.category, ...article.steps].join(' ').toLowerCase();
    return matchesCategory && searchText.includes(query.trim().toLowerCase());
  }), [query, category]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">BuildNerve help</p>
          <h1 className="text-3xl font-bold text-main mt-2">How can we help?</h1>
          <p className="text-muted mt-2">Practical guides for the tasks you use most.</p>
          <label htmlFor="help-search" className="sr-only">Search help articles</label>
          <input id="help-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs, variations, evidence…" className="mt-6 w-full h-12 px-4 bg-white border border-border rounded-xl text-main focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </header>

        <nav aria-label="Help categories" className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => { setCategory(item); setSelected(null); }}
              aria-pressed={category === item}
              className={`px-3 py-2 rounded-full text-sm border ${category === item ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-main border-border hover:border-primary-300'}`}>
              {item}
            </button>
          ))}
        </nav>

        {results.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-8">
            <h2 className="font-semibold text-main">No matching guides</h2>
            <p className="text-sm text-muted mt-1">Try another term or choose All categories.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((article) => {
              const open = selected === article.id;
              return (
                <section key={article.id} className="bg-white border border-border rounded-2xl p-5 self-start">
                  <p className="text-xs font-semibold text-primary-600">{article.category}</p>
                  <h2 className="font-bold text-main text-lg mt-1">{article.title}</h2>
                  <p className="text-sm text-muted mt-2">{article.summary}</p>
                  <button type="button" aria-expanded={open} aria-controls={`help-${article.id}`}
                    onClick={() => setSelected(open ? null : article.id)}
                    className="mt-4 text-sm font-semibold text-primary-700 hover:underline">
                    {open ? 'Hide steps' : 'Show steps'}
                  </button>
                  {open && (
                    <div id={`help-${article.id}`} className="mt-4 border-t border-border pt-4">
                      <ol className="list-decimal pl-5 space-y-2 text-sm text-main">
                        {article.steps.map((step) => <li key={step}>{step}</li>)}
                      </ol>
                      {article.note && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{article.note}</p>}
                      <Link to={article.href} className="inline-flex mt-4 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600">
                        {article.action}
                      </Link>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
        <p className="text-sm text-muted">For account or technical issues, contact your BuildNerve administrator. Platform staff can review cases in the support workspace.</p>
      </div>
    </DashboardLayout>
  );
}
