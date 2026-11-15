import {
  BookingLink,
  Scorecard,
  SiteFooter,
  SiteNav,
  emitAnalytics,
  useLandingEffects,
} from "./PublicLanding";

export const medicalFaq = [
  [
    "Is this HIPAA-compliant?",
    "The architecture is designed for practices governed by HIPAA and professional confidentiality duties. Final compliance depends on configuration, access controls, written policies, connected tools, and staff behavior, which is why the engagement starts with an audit.",
  ],
  [
    "Why not just use Copilot or Gemini with enterprise privacy settings?",
    "Enterprise tiers give you a contract, not an architecture. Your data still leaves the premises and vendor logs can still exist. On-premise removes that trust requirement: the data can remain inside infrastructure you control.",
  ],
  [
    "What about Dentrix, Eaglesoft, or the EHR we already use?",
    "Keep them. The point is not to replace your system of record. We map integration points during the audit and tell you which systems can connect and which workflows need a different path.",
  ],
  [
    "Does the AI send anything to patients on its own?",
    "No. It prepares drafts. A person at your practice reviews, approves, and sends every patient-facing message.",
  ],
  [
    "What hardware is required?",
    "A dedicated machine that fits in your office, roughly the size of a small desktop unit. I handle procurement, configuration, and setup. You need an ethernet port and a power outlet.",
  ],
  [
    "What if the audit findings do not justify moving forward?",
    "Then you will get that answer in writing. The audit has standalone value: a clear map of your admin leaks and exposure points whether or not you hire Hivemind afterward.",
  ],
] as const;

export function MedicalPractices() {
  useLandingEffects();

  return (
    <div className="landing">
      <div className="scroll-progress" aria-hidden="true" />
      <SiteNav />
      <main>
        <header className="dark-section page-hero" id="top">
          <div className="circuit-pattern" aria-hidden="true" />
          <div className="site-wrap">
            <span className="eyebrow">For medical, dental, and therapy practices</span>
            <h1>
              Private AI for medical practices.{" "}
              <em>Patient information never leaves your office.</em>
            </h1>
            <p className="page-hero-copy">
              Hivemind installs a machine in your office that runs private AI
              models on it. Drafting, intake summaries, and search across your
              own documents happen on hardware you control, and a person at
              your practice approves everything that goes to a patient. It is
              built for practices governed by HIPAA.
            </p>
            <div className="button-row">
              <a
                className="button button-primary"
                href="#scorecard"
                onClick={() => emitAnalytics("scorecard_start")}
              >
                Take the two-minute Scorecard
              </a>
              <BookingLink className="button button-ghost">
                Book the audit
              </BookingLink>
            </div>
          </div>
        </header>

        <section>
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>The problem</span>
            <h2 data-reveal>Three things are true in most small practices.</h2>
            <div className="three-column controls-grid">
              {[
                [
                  "Admin eats clinical hours",
                  "Intake paperwork, follow-up messages, and routine letters get done by the people whose time is worth the most, because there is nobody to hand them to.",
                ],
                [
                  "Staff reach for free chatbots",
                  "With no approved tool and no policy, people keep up however they can. That can mean patient information pasted into a consumer AI service.",
                ],
                [
                  "You answer for where it went",
                  "Your license and your HIPAA obligations are yours. \u201cThe vendor's privacy page looked fine\u201d is not a record of where patient information has been.",
                ],
              ].map(([title, copy]) => (
                <article className="control" data-reveal key={title}>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="muted-section">
          <div className="site-wrap split-layout">
            <div>
              <span className="eyebrow" data-reveal>What gets installed</span>
              <h2 data-reveal>An approved way to use AI around patient information.</h2>
              <p data-reveal>
                The safe way has to be the easy way, or staff will keep using
                whatever is open in the next browser tab.
              </p>
              <p data-reveal>
                Unlike the enterprise tiers of Copilot or Gemini, where
                document content still leaves your premises, a Hivemind node
                processes it on a machine in your office.
              </p>
            </div>
            <ul className="check-list" data-reveal>
              <li>A dedicated machine in your office, running private models</li>
              <li>Drafting from your own templates and documents</li>
              <li>Intake summaries and search across your own files</li>
              <li>A written AI usage policy and staff training</li>
              <li>Your existing system of record stays where it is</li>
            </ul>
          </div>
        </section>

        <section className="controls-section">
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>Who is in control</span>
            <h2 data-reveal>The model drafts. A person at your practice sends.</h2>
            <div className="approval-flow" data-reveal>
              {[
                ["01 · Draft", "AI prepares a bounded first draft."],
                ["02 · Review", "A qualified person checks facts and context."],
                ["03 · Approve", "An authorized user accepts or edits it."],
                ["04 · Send", "The human—not the model—releases it."],
              ].map(([title, copy]) => (
                <div className="approval-step" key={title}>
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </div>
              ))}
            </div>
            <p className="compliance-note" data-reveal>
              Hivemind systems run in practices governed by HIPAA today. The
              proof is something you watch: the machine comes to your office,
              the network cable comes out, and it processes a sample document
              in front of you.
            </p>
          </div>
        </section>

        <section className="muted-section" id="how">
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>Where to start</span>
            <h2 data-reveal>Start small. Decide with a written answer.</h2>
            <div className="three-column steps">
              {[
                [
                  "FIRST",
                  "The Shadow AI Scorecard",
                  "Five questions on this page. You see where your practice sits before you talk to anyone.",
                  "Free",
                  "Two minutes.",
                ],
                [
                  "THEN",
                  "The AI Practice Audit",
                  "Interviews with your team, a map of where hours go and where patient information has been, and a ranked list of what to fix first. Yours whether or not you hire Hivemind afterward.",
                  "$1,500",
                  "Fixed fee. 7 days.",
                ],
                [
                  "IF IT FITS",
                  "The install",
                  "Hardware in your office, private models, your top workflows, a written AI usage policy, and staff training.",
                  "From $9,000",
                  "Fixed scope.",
                ],
              ].map(([number, title, copy, price, note]) => (
                <article className="step" data-reveal key={number}>
                  <span className="step-number">{number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <strong>{price}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </div>
            <p className="page-link-row" data-reveal>
              <a href="/pricing">See full pricing</a>
            </p>
          </div>
        </section>

        <section className="faq-section">
          <div className="site-wrap narrow align-left">
            <span className="eyebrow" data-reveal>Questions practice owners ask</span>
            <h2 data-reveal>Questions before you book.</h2>
            <div className="faq-list" data-reveal>
              {medicalFaq.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <Scorecard />
      </main>
      <SiteFooter />
    </div>
  );
}
