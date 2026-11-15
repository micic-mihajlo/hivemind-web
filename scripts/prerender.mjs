// Renders each page to HTML after the client build so crawlers that do not run
// JavaScript still receive the content, and adds FAQ schema that matches the
// visible FAQ. Run by "npm run build".
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const { pages } = await import(
  pathToFileURL(resolve(root, "dist-ssr/entry-server.js")).href
);

for (const [file, page] of Object.entries(pages)) {
  const path = resolve(root, "dist", file);
  let html = readFileSync(path, "utf8");
  const marker = '<div id="root"></div>';
  if (!html.includes(marker)) throw new Error(`no root marker in ${file}`);
  html = html.replace(marker, () => `<div id="root">${page.render()}</div>`);
  if (page.faq) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    };
    const json = JSON.stringify(schema).replace(/</g, "\\u003c");
    html = html.replace(
      "</head>",
      () => `  <script type="application/ld+json">${json}</script>\n  </head>`,
    );
  }
  writeFileSync(path, html);
  console.log(`prerendered ${file}`);
}
