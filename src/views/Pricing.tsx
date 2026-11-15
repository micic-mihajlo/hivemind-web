import {
  BookingLink,
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
    note: "Flat fee. Delivered in 14 days.",
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
              Every engagement starts with the audit. You see the findings in
              writing before anyone talks about an install.
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
