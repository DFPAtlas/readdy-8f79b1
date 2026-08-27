import { faqs } from '@/mocks/pricing';

export default function FaqSection() {
  return (
    <section className="bg-page border-y border-border py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-main font-display tracking-tight text-center">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted mt-3 text-center max-w-xl mx-auto leading-relaxed">
          Answers to the questions contractors ask before switching.
        </p>

        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="bg-white rounded-xl border border-border p-5 group cursor-pointer">
              <summary className="text-sm md:text-base font-semibold text-main list-none flex items-center justify-between gap-4">
                <span>{faq.q}</span>
                <i className="ri-arrow-down-s-line text-muted text-lg flex-shrink-0 group-open:rotate-180 transition-transform"></i>
              </summary>
              <p className="text-sm text-muted mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}