#!/usr/bin/env python3
"""Copy the canonical Growth Audit legal documents into this site repo.

The published pages on hivemindintelligence.com are generated from the same
Markdown files that ship inside the Growth Audit plugin package, so the live
page and the packaged document can never disagree.

Source of truth:
    <plugin-repo>/legal/privacy-policy.md
    <plugin-repo>/legal/terms-of-service.md

Usage:
    python3 sync_legal_docs.py <plugin-legal-dir> [dest-dir]
"""

import hashlib
import shutil
import sys
from pathlib import Path

DOCS = ("privacy-policy.md", "terms-of-service.md")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    if len(sys.argv) not in (2, 3):
        print(__doc__)
        return 2

    src = Path(sys.argv[1])
    dest = Path(sys.argv[2]) if len(sys.argv) == 3 else Path("content/legal")

    if not src.is_dir():
        print(f"ERROR: source directory not found: {src}", file=sys.stderr)
        return 1

    dest.mkdir(parents=True, exist_ok=True)
    changed = False

    for name in DOCS:
        source_file = src / name
        if not source_file.is_file():
            print(f"ERROR: missing source document: {source_file}", file=sys.stderr)
            return 1

        target = dest / name
        if target.is_file() and sha256(target) == sha256(source_file):
            print(f"unchanged  {name}")
            continue

        shutil.copy2(source_file, target)
        print(f"updated    {name}  sha256={sha256(target)[:16]}...")
        changed = True

    print("no changes" if not changed else "sync complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
