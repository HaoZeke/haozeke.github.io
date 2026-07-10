#!/usr/bin/env python3
"""Convert {{{relref(desc,slug)}}} macros back to normal Org links.

Uses a slug→title map from EXPORT_FILE_NAME drawers (not Pandoc), then
regex-replaces macros in the raw Org text. Inverse of convert_links.py.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Known slug renames / typos in old relref targets.
SLUG_ALIASES: dict[str, str] = {
    "types-fortran-python-cython": "cython-derivedtype-f2py",
    "types-fortran-python-cpython": "fortran-oop-python",
    # finalizers post not published under that slug yet — leave unresolved
}

HEADING_RE = re.compile(r"^(\*+)\s+(.*)$")
PROP_LINE_RE = re.compile(r"^:([^:]+):\s*(.*)$")
# Allow newlines inside the macro args (seen for long desc/slug wraps).
RELREF_RE = re.compile(r"\{\{\{relref\((.*?)\)\}\}\}", re.DOTALL)


def strip_todo_and_tags(raw_title: str) -> str:
    title = re.sub(r"\s+:[^\s]+:\s*$", "", raw_title).strip()
    title = re.sub(r"^(TODO|DONE|DRAFT)\s+", "", title).strip()
    return title


def build_slug_maps(
    org_paths: list[Path],
) -> tuple[dict[str, str], dict[tuple[str, str], str]]:
    """Return (slug→title, (slug, anchor)→link-target).

    Anchor targets prefer :CUSTOM_ID: (as ``#id``), else a matching heading
    title under that post (as a fuzzy ``Title`` link, not ``#slug``).
    """
    slug_to_title: dict[str, str] = {}
    # (slug, anchor_lower) -> org link path (with or without leading #)
    anchor_targets: dict[tuple[str, str], str] = {}
    for path in org_paths:
        lines = path.read_text(encoding="utf-8").splitlines()
        i = 0
        current_slug: str | None = None
        while i < len(lines):
            m = HEADING_RE.match(lines[i])
            if not m:
                i += 1
                continue
            level = len(m.group(1))
            title = strip_todo_and_tags(m.group(2))
            j = i + 1
            props: dict[str, str] = {}
            while j < len(lines) and not HEADING_RE.match(lines[j]):
                if lines[j].strip() == ":PROPERTIES:":
                    j += 1
                    while j < len(lines) and lines[j].strip() != ":END:":
                        pm = PROP_LINE_RE.match(lines[j].strip())
                        if pm:
                            props[pm.group(1).upper()] = pm.group(2).strip()
                        j += 1
                j += 1
            efn = props.get("EXPORT_FILE_NAME")
            if efn:
                efn = efn.strip().strip("\"'")
                slug_to_title.setdefault(efn, title)
                current_slug = efn
            cid = props.get("CUSTOM_ID")
            if current_slug and cid:
                anchor_targets.setdefault(
                    (current_slug, cid.lower()), f"#{cid}"
                )
            # Heading text as fuzzy anchor (e.g. ** i3 → #i3 in Hugo)
            if current_slug and title:
                slug_guess = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
                for key in {title, title.lower(), slug_guess}:
                    if key:
                        anchor_targets.setdefault(
                            (current_slug, key.lower()), title
                        )
            i += 1
    for alias, real in SLUG_ALIASES.items():
        if real in slug_to_title:
            slug_to_title[alias] = slug_to_title[real]
            # copy anchors
            for (slug, anc), tgt in list(anchor_targets.items()):
                if slug == real:
                    anchor_targets.setdefault((alias, anc), tgt)
    return slug_to_title, anchor_targets


def org_link(target: str, desc: str) -> str:
    """Build [[target][desc]] with minimal escaping."""
    # Org link targets must not contain unescaped ].
    if "]" in target or "[" in target:
        raise ValueError(f"cannot encode target with brackets: {target!r}")
    # Descriptions can contain most text; ] would break the link.
    if "]" in desc:
        desc = desc.replace("]", "\\]")
    return f"[[{target}][{desc}]]"


# Do not rewrite macros inside literal example/src blocks (historical docs).
_PROTECTED_BLOCK_RE = re.compile(
    r"(#\+begin_(?:example|src|export|verse|quote)\b.*?#\+end_(?:example|src|export|verse|quote))",
    re.DOTALL | re.IGNORECASE,
)


def convert_text(
    text: str,
    slug_to_title: dict[str, str],
    anchor_targets: dict[tuple[str, str], str],
) -> tuple[str, list[str], int]:
    unresolved: list[str] = []
    count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal count
        raw = match.group(1)
        # Normalize internal newlines/whitespace in desc only partially.
        if "," not in raw:
            unresolved.append(raw)
            return match.group(0)
        desc, _, target = raw.rpartition(",")
        desc = re.sub(r"\s+", " ", desc.strip())
        target = target.strip()
        slug, _, anchor = target.partition("#")
        slug = slug.strip()
        anchor = anchor.strip()
        title = slug_to_title.get(slug)
        if not title:
            unresolved.append(raw.replace("\n", " "))
            return match.group(0)
        try:
            if anchor:
                link_target = anchor_targets.get((slug, anchor.lower()))
                if not link_target:
                    # Fall back to whole-post title if the fragment is unknown.
                    link_target = title
                link = org_link(link_target, desc)
            else:
                link = org_link(title, desc)
        except ValueError as exc:
            unresolved.append(f"{raw} ({exc})")
            return match.group(0)
        count += 1
        return link

    # Split out protected blocks so historical examples stay as written.
    parts = _PROTECTED_BLOCK_RE.split(text)
    out: list[str] = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            out.append(part)
        else:
            out.append(RELREF_RE.sub(repl, part))
    return "".join(out), unresolved, count


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "files",
        nargs="+",
        type=Path,
        help="Org files to convert in place (or with --output for a single file)",
    )
    ap.add_argument(
        "--map-from",
        nargs="+",
        type=Path,
        default=None,
        help="Extra org files to scan for EXPORT_FILE_NAME (default: all content-org/**/*.org)",
    )
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--keep-macro",
        action="store_true",
        help="Do not remove #+macro: relref lines even when none remain",
    )
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero if any relref target slug is unknown",
    )
    args = ap.parse_args()

    root = Path.cwd()
    if args.map_from:
        map_paths = args.map_from
    else:
        map_paths = sorted((root / "content-org").rglob("*.org"))
        if not map_paths:
            map_paths = list(args.files)

    slug_to_title, anchor_targets = build_slug_maps(map_paths)
    print(
        f"slug map: {len(slug_to_title)} entries, "
        f"{len(anchor_targets)} anchors from {len(map_paths)} files"
    )

    total = 0
    all_unresolved: list[str] = []
    for path in args.files:
        text = path.read_text(encoding="utf-8")
        new_text, unresolved, count = convert_text(
            text, slug_to_title, anchor_targets
        )
        remaining = len(RELREF_RE.findall(new_text))
        if not args.keep_macro and remaining == 0:
            new_text2 = re.sub(
                r"^#\+macro:\s*relref\s+.*\n",
                "",
                new_text,
                flags=re.MULTILINE,
            )
            if new_text2 != new_text:
                print(f"{path}: removed #+macro: relref definition")
                new_text = new_text2
        print(f"{path}: converted {count}, remaining relref macros {remaining}")
        for u in unresolved:
            print(f"  unresolved: {u}")
            all_unresolved.append(f"{path}: {u}")
        total += count
        if not args.dry_run and new_text != text:
            path.write_text(new_text, encoding="utf-8")
            print(f"  wrote {path}")

    print(f"total converted: {total}")
    if all_unresolved:
        print(
            "unresolved (left as relref macros): %d" % len(all_unresolved),
            file=sys.stderr,
        )
        if args.strict:
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
