#!/usr/bin/env python3
"""Scan a NixOS/nixpkgs tree for packages listing a given maintainer handle.

Usage:
  python scripts/scan_nixpkgs_maintainers.py /path/to/nixpkgs HaoZeke

Prints package.nix paths and extracts pname/version when present.
Exit 0 always when scan completes; non-zero if nixpkgs path missing.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

PNAME = re.compile(r'\bpname\s*=\s*"([^"]+)"')
VERSION = re.compile(r'\bversion\s*=\s*"([^"]+)"')
DESC = re.compile(r'\bdescription\s*=\s*"([^"]+)"')


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: scan_nixpkgs_maintainers.py <nixpkgs-root> [handle]", file=sys.stderr)
        return 2
    root = Path(argv[1])
    handle = argv[2] if len(argv) > 2 else "HaoZeke"
    if not root.is_dir():
        print(f"missing nixpkgs root: {root}", file=sys.stderr)
        return 2
    needle = handle.encode()
    hits: list[Path] = []
    for path in root.rglob("*.nix"):
        try:
            data = path.read_bytes()
        except OSError:
            continue
        if needle not in data:
            continue
        # skip maintainer-list itself for package rows
        rel = path.relative_to(root).as_posix()
        if rel.endswith("maintainers/maintainer-list.nix"):
            print(f"MAINTAINER_ENTRY	{rel}")
            continue
        text = data.decode("utf-8", errors="replace")
        if f"maintainers.{handle}" not in text and f"[ {handle} ]" not in text and f"[ {handle};" not in text:
            # still record if handle appears in maintainers context
            if "maintainers" not in text:
                continue
        pname = (PNAME.search(text) or type("M", (), {"group": lambda *_: "?"})()).group(1)
        version = (VERSION.search(text) or type("M", (), {"group": lambda *_: "?"})()).group(1)
        desc = (DESC.search(text) or type("M", (), {"group": lambda *_: ""})()).group(1)
        print(f"PACKAGE\t{rel}\t{pname}\t{version}\t{desc}")
        hits.append(path)
    print(f"# packages_with_handle={len(hits)} handle={handle} root={root}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
