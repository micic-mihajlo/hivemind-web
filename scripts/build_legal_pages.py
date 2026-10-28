#!/usr/bin/env python3
"""Render the Growth Audit legal documents as static HTML pages for the
Hivemind Intelligence site.

The HTML is generated from the canonical Markdown in the plugin repo so the
published page and the packaged document can never drift apart.

The Markdown inputs live in content/legal/ inside this repo. They are copied
verbatim from the Growth Audit plugin package so that the published page and
the packaged document cannot drift. See scripts/sync_legal_docs.py.

Usage:
    python3 build_legal_pages.py <content/legal> <public_dir>
"""

import html
import re
import sys
from pathlib import Path

TEMPLATE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta
      name="description"
      content="{description}"
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
{body}
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


def inline(text: str) -> str:
    """Convert inline Markdown to HTML. Order matters: code first so that
    bold/italic markers inside code spans are left alone."""
    text = html.escape(text, quote=False)
    # `code`
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    # [label](url)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    # **bold**
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    # *italic* (not part of a word)
    text = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", text)
    return text


def render_table(rows: list[list[str]]) -> str:
    head, *body = rows
    out = ['<div class="legal-table-wrap"><table class="legal-table">']
    out.append("<thead><tr>")
    for cell in head:
        out.append(f"<th>{inline(cell)}</th>")
    out.append("</tr></thead><tbody>")
    for row in body:
        out.append("<tr>")
        for cell in row:
            out.append(f"<td>{inline(cell)}</td>")
        out.append("</tr>")
    out.append("</tbody></table></div>")
    return "\n".join(out)


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def markdown_to_html(md: str) -> str:
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    meta: list[str] = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped == "---":
            i += 1
            continue

        # Heading
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text = inline(m.group(2))
            if level == 1:
                out.append(f"<h1>{text}</h1>")
            elif level == 2:
                out.append(f"<h2>{text}</h2>")
            elif level == 3:
                out.append(f"<h3>{text}</h3>")
            else:
                out.append(f"<h4>{text}</h4>")
            i += 1
            continue

        # Table
        if stripped.startswith("|") and i + 1 < len(lines) and set(
            lines[i + 1].strip().replace("|", "").replace(" ", "")
        ) <= set("-:"):
            rows = [split_row(stripped)]
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(split_row(lines[i].strip()))
                i += 1
            out.append(render_table(rows))
            continue

        # Unordered list
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                items.append(re.sub(r"^\s*[-*]\s+", "", lines[i]))
                i += 1
            out.append("<ul>")
            for item in items:
                out.append(f"<li>{inline(item)}</li>")
            out.append("</ul>")
            continue

        # Ordered list
        if re.match(r"^\d+[.)]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^\s*\d+[.)]\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+[.)]\s+", "", lines[i]))
                i += 1
            out.append("<ol>")
            for item in items:
                out.append(f"<li>{inline(item)}</li>")
            out.append("</ol>")
            continue

        # Paragraph (consume until blank line)
        para = [stripped]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
            r"^(#{1,4}\s|[-*]\s|\d+[.)]\s|\||---)", lines[i].strip()
        ):
            para.append(lines[i].strip())
            i += 1
        text = " ".join(para)

        # The effective-date line is metadata, not body copy.
        if text.startswith("**Effective:**"):
            out.append(f'<p class="legal-meta">{inline(text)}</p>')
            continue
        if text.startswith("**Applies to:**"):
            meta.append(inline(text))
            continue

        out.append(f"<p>{inline(text)}</p>")

    body = "\n".join(out)
    if meta:
        body = body.replace(
            "</h1>", "</h1>\n" + "\n".join(f"<p>{m}</p>" for m in meta), 1
        )
    return body


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2

    content_dir, out_dir = sys.argv[1], sys.argv[2]
    content = Path(content_dir)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    pages = [
        (content / "privacy-policy.md", out / "privacy" / "growth-audit" / "index.html",
         "Growth Audit Privacy Policy | Hivemind Intelligence",
         "How Hivemind Intelligence handles data in the Growth Audit plugin for ChatGPT and Codex."),
        (content / "terms-of-service.md", out / "terms" / "index.html",
         "Terms of Service | Hivemind Intelligence",
         "The terms governing the Growth Audit plugin for ChatGPT and Codex and Hivemind Intelligence services."),
    ]

    for md_path, html_path, title, description in pages:
        md = Path(md_path).read_text(encoding="utf-8")
        body = markdown_to_html(md)
        doc = TEMPLATE.format(
            title=html.escape(title, quote=True),
            description=html.escape(description, quote=True),
            body=body,
        )
        html_path.parent.mkdir(parents=True, exist_ok=True)
        html_path.write_text(doc, encoding="utf-8")
        print(f"wrote {html_path} ({len(doc):,} bytes)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
