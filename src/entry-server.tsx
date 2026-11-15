import { renderToString } from "react-dom/server";
import { App } from "./App";
import { LawFirms, lawFaq } from "./views/LawFirms";
import { Pricing } from "./views/Pricing";
import { faqItems } from "./views/PublicLanding";

// Build-time rendering: scripts/prerender.mjs calls this for each page so the
// HTML that crawlers receive contains the page content, not an empty root.
export const pages = {
  "index.html": { render: () => renderToString(<App />), faq: faqItems },
  "law-firms/index.html": {
    render: () => renderToString(<LawFirms />),
    faq: lawFaq,
  },
  "pricing/index.html": { render: () => renderToString(<Pricing />), faq: null },
} as const;
