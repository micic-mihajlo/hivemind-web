#!/usr/bin/env python3
"""Render the Growth Audit support page as static HTML.

The support page is generated rather than hand-written so that it stays
consistent with the legal documents and the plugin's actual tool surface.

Usage:
    python3 build_support_page.py <out_dir>
"""

import html
import sys
from pathlib import Path

TEMPLATE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Support | Hivemind Intelligence</title>
    <meta
      name="description"
      content="Support for the Growth Audit plugin for ChatGPT and Codex and Hivemind Intelligence services."
    />
    <meta name="robots" content="index,follow" />
    <meta name="theme-color" content="#0d1924" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap"
      rel="stylesheet"
    />
    <link rel="icon" type="image/svg+xml" href="/brand/hivemind-favicon.svg" />
    <link rel="stylesheet" href="/legal.css" />
  </head>
  <body>
    <div class="legal-page">
      <header class="legal-head">
        <div class="site-wrap">
          <a class="brand" href="/" aria-label="Hivemind Intelligence home">
            <img class="brand-logo" src="/brand/hivemind-horizontal-dark.svg" alt="Hivemind Intelligence" />
          </a>
        </div>
      </header>

      <main class="legal-body">
        <article class="legal-doc">
          <h1>Support</h1>
          <p class="legal-meta">Growth Audit · Hivemind Intelligence · Coral Gables, Florida</p>

          <div class="legal-callout">
            <strong>Before you write:</strong> the Growth Audit plugin runs inside ChatGPT
            and Codex. If something is behaving oddly, try rephrasing your request — the
            plugin responds to the request you give it, not to a fixed menu. Most issues
            resolve by restating the goal with the numbers you have.
          </div>

          <h2>Contact us</h2>
          <p>
            Email <a href="mailto:privacy@hivemindintelligence.com">privacy@hivemindintelligence.com</a>
            and we will reply. Please include what you asked the plugin, what it returned,
            and what you expected instead.
          </p>
          <p>
            For anything about a booked engagement, including scheduling and the
            AI Practice Audit, contact
            <a href="mailto:kevin@hivemindintelligence.com">kevin@hivemindintelligence.com</a>.
          </p>

          <h2>What the plugin does</h2>
          <p>
            Growth Audit scores six categories of inbound funnel performance — inquiry
            volume, conversion rate, follow-up discipline, response speed, offer
            clarity, and staff capacity — then identifies your primary leak and ranks the
            rest by estimated cost of delay.
          </p>
          <p>
            It can also draft offer language, build a blank tracking spreadsheet for
            your sales team, score a prospect against the same model, report whether your
            funnel is improving over time, and record a request for a strategy call.
          </p>

          <h2>Common questions</h2>

          <h3>Why did it ask me for a business input before giving a score?</h3>
          <p>
            The cost-of-delay model needs real numbers to be meaningful. It will ask for
            inquiry volume, close rate, or similar figures rather than guessing. If you
            do not have exact figures, give it your best estimate and it will say which
            results are sensitive to that estimate.
          </p>

          <h3>It refused my request. Why?</h3>
          <p>
            The plugin rejects client and patient identifiers, medical records, matter
            numbers, and other restricted data. That is deliberate and it will not be
            bypassed. Replace those with counts or percentages and it will proceed.
          </p>

          <h3>Can it tell me my revenue?</h3>
          <p>
            No. It produces a modelled estimate and a range from the inputs you supply
            and the assumptions in the model. It does not have access to your accounts,
            it does not measure your actual revenue, and it cannot promise what will
            happen if you act on the output.
          </p>

          <h3>Does it send my business data anywhere?</h3>
          <p>
            Business inputs are processed and never stored. Derived scores and contact
            details are stored only with your explicit consent, and contact details only
            if you ask for a strategy call. We do not share data with third parties and
            we do not sell it. See the
            <a href="/privacy/growth-audit">Privacy Policy</a> for the detail.
          </p>

          <h3>Does the plugin take payment?</h3>
          <p>
            No. The plugin does not sell, subscribe, or take payment for anything.
            Engagements such as the AI Practice Audit are contracted and paid for
            separately with us, off the plugin. See the
            <a href="/terms">Terms of Service</a>.
          </p>

          <h3>How do I get my score over time?</h3>
          <p>
            The plugin keeps derived scores only when you consent to storage, so asking it
            to record your scores is what makes a trend available later. Without stored
            scores it cannot show you change over time.
          </p>

          <h2>Plugin requirements</h2>
          <ul>
            <li>The plugin runs inside ChatGPT and Codex and needs no separate installation.</li>
            <li>You need an active ChatGPT or Codex session to use it.</li>
            <li>Network access to the plugin endpoint is required. If tools do not appear, check that the plugin is enabled for your session.</li>
            <li>It has no file upload, so paste your business data directly into the conversation.</li>
          </ul>

          <h2>Privacy and terms</h2>
          <p>
            <a href="/privacy/growth-audit">Privacy Policy</a> ·
            <a href="/terms">Terms of Service</a>
          </p>
        </article>
      </main>

      <footer class="legal-foot">
        <div class="site-wrap">
          <span>© 2026 Hivemind Intelligence · Coral Gables, Florida</span>
          <nav aria-label="Legal">
            <a href="/terms">Terms</a>
            <a href="/privacy/growth-audit">Privacy</a>
            <a href="/support">Support</a>
            <a href="/">Home</a>
          </nav>
        </div>
      </footer>
    </div>
  </body>
</html>
"""


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    out = Path(sys.argv[1]) / "support" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = TEMPLATE
    out.write_text(doc, encoding="utf-8")
    print(f"wrote {out} ({len(doc):,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
