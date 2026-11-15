import {
  BookingLink,
  faqItems,
  SiteFooter,
  SiteNav,
  emitAnalytics,
  useLandingEffects,
} from "./PublicLanding";

const tiers = [
  {
    step: "STEP 01",
    name: "AI Practice Audit",
    price: "$1,500",
    note: "Flat fee. Delivered in 7 days.",
    copy: "A written decision document for your practice. It is yours whether or not you hire Hivemind afterward.",
    items: [
      "Readiness Scorecard for your practice",
      "Leak Register: where hours and exposure are going",
      "Cuts Ranked by Payback",
      "The Three We’d Do First",
      "Compliance Path Note",
    ],
  },
  {
    step: "STEP 02",
    name: "Install",
    price: "$9,000 to $50,000",
    note: "Fixed scope, set after the audit.",
    copy: "Scoped on the complexity of your workflows and your privacy requirements, including any custom training of local models. Most practices are fully live within two to three weeks from the day the hardware arrives.",
    items: [
      "Hardware in your office",
      "Private models running on it",
      "Your top workflows, built and tested",
      "A written AI usage policy",
      "Staff training",
    ],
  },
  {
    step: "STEP 03",
    name: "Manage",
    price: "From $2,000 a month",
    note: "Monthly. Cancel anytime.",
    copy: "The system keeps improving while your data stays in your office.",
    items: [
      "Monitoring",
      "Hardware refresh",
      "Model updates",
      "One new workflow every quarter",
    ],
  },
] as const;

// Reuses answers already published on the homepage FAQ.
const pricingQuestions = new Set([
  "What hardware is required?",
  "How long does installation take?",
  "What if the audit findings do not justify moving forward?",
]);
export const pricingFaq = faqItems.filter(([question]) =>
  pricingQuestions.has(question),
);

export function Pricing() {
  useLandingEffects();

  return (
    <div className="landing">
      <div className="scroll-progress" aria-hidden="true" />
      <SiteNav />
      <main>
        <header className="dark-section page-hero" id="top">
          <div className="circuit-pattern" aria-hidden="true" />
          <div className="site-wrap">
            <span className="eyebrow">Prices as of November 2026</span>
            <h1>
              Three steps. <em>Always in this order.</em>
            </h1>
            <p className="page-hero-copy">
              Every engagement starts with the AI Practice Audit: a $1,500,
              7-day written review of where admin hours go and where client
              information is exposed. You see the findings in writing before
              anyone talks about an install, and an install is hardware in
              your office rather than a cloud subscription that processes your
              documents somewhere else.
            </p>
          </div>
        </header>

        <section>
          <div className="site-wrap">
            <div className="three-column steps price-grid">
              {tiers.map((tier) => (
                <article className="step" data-reveal key={tier.name}>
                  <span className="step-number">{tier.step}</span>
                  <h3>{tier.name}</h3>
                  <strong>{tier.price}</strong>
                  <small>{tier.note}</small>
                  <p>{tier.copy}</p>
                  <ul className="check-list">
                    {tier.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="muted-section faq-section">
          <div className="site-wrap narrow align-left">
            <span className="eyebrow" data-reveal>Common questions</span>
            <h2 data-reveal>Questions about cost and timing.</h2>
            <div className="faq-list" data-reveal>
              {pricingFaq.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="dark-section final-section" id="book">
          <div className="site-wrap narrow">
            <span className="eyebrow" data-reveal>Next step</span>
            <h2 data-reveal>Find out where you stand.</h2>
            <p data-reveal>
              Not ready to book? The free Shadow AI Scorecard takes two minutes
              and five questions.
            </p>
            <div className="button-row button-row-center">
              <BookingLink className="button button-primary">
                Book the audit
              </BookingLink>
              <a
                className="button button-ghost"
                href="/#scorecard"
                onClick={() => emitAnalytics("scorecard_start")}
              >
                Take the Scorecard
              </a>
            </div>
            <p className="honesty" data-reveal>
              If the math does not justify hiring me, I will tell you in writing.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
