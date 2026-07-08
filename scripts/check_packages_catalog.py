#!/usr/bin/env python3
"""Validate data/packages.yaml shape for the packages inventory page.

Offline-friendly: no network. Asserts each ecosystem key is present and every
package has name + registry_url with a host matching the ecosystem registry.
Exit 0 on success; non-zero with messages on failure.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse

try:
    import yaml
except ImportError:  # stdlib-only fallback via a tiny subset is not enough
    print("ERROR: PyYAML required (pip install pyyaml | conda install pyyaml)", file=sys.stderr)
    sys.exit(2)

# Required ecosystem ids for the public inventory
REQUIRED_ECOSYSTEMS = ("aur", "conda-forge", "pypi", "crates")

# registry_url host must match one of these (substring / exact host rules)
HOST_RULES: dict[str, tuple[str, ...]] = {
    "aur": ("aur.archlinux.org",),
    "conda-forge": ("anaconda.org", "conda-forge.org", "github.com"),
    "pypi": ("pypi.org", "pypi.python.org"),
    "crates": ("crates.io",),
}


def load_catalog(path: Path) -> dict:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"catalog root must be a mapping, got {type(data).__name__}")
    return data


def host_ok(eco_id: str, url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    allowed = HOST_RULES.get(eco_id, ())
    return any(host == a or host.endswith("." + a) for a in allowed)


def validate(data: dict) -> list[str]:
    errors: list[str] = []
    ecosystems = data.get("ecosystems")
    if not isinstance(ecosystems, list) or not ecosystems:
        return ["ecosystems must be a non-empty list"]

    by_id = {}
    for i, eco in enumerate(ecosystems):
        if not isinstance(eco, dict):
            errors.append(f"ecosystems[{i}] must be a mapping")
            continue
        eid = eco.get("id")
        if not eid:
            errors.append(f"ecosystems[{i}] missing id")
            continue
        by_id[eid] = eco
        pkgs = eco.get("packages")
        if not isinstance(pkgs, list) or len(pkgs) < 1:
            errors.append(f"ecosystem {eid!r}: need ≥1 package")
            continue
        for j, pkg in enumerate(pkgs):
            if not isinstance(pkg, dict):
                errors.append(f"{eid}[{j}]: package must be a mapping")
                continue
            name = pkg.get("name")
            url = pkg.get("registry_url")
            if not name or not isinstance(name, str):
                errors.append(f"{eid}[{j}]: missing name")
            if not url or not isinstance(url, str):
                errors.append(f"{eid}[{j}]: missing registry_url")
            elif not re.match(r"^https?://", url):
                errors.append(f"{eid}/{name}: registry_url must be http(s)")
            elif not host_ok(eid, url):
                errors.append(
                    f"{eid}/{name}: registry_url host not allowed for ecosystem "
                    f"(got {urlparse(url).hostname!r})"
                )

    for req in REQUIRED_ECOSYSTEMS:
        if req not in by_id:
            errors.append(f"missing required ecosystem id: {req!r}")

    return errors


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    root = Path(__file__).resolve().parents[1]
    path = Path(argv[0]) if argv else root / "data" / "packages.yaml"
    if not path.is_file():
        print(f"ERROR: catalog not found: {path}", file=sys.stderr)
        return 2
    try:
        data = load_catalog(path)
    except Exception as exc:  # noqa: BLE001 — surface parse errors cleanly
        print(f"ERROR: failed to load {path}: {exc}", file=sys.stderr)
        return 2
    errors = validate(data)
    if errors:
        print(f"FAIL: {path} ({len(errors)} issue(s))", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    n_eco = len(data["ecosystems"])
    n_pkg = sum(len(e.get("packages") or []) for e in data["ecosystems"])
    print(f"OK: {path}")
    print(f"  ecosystems: {n_eco} ({', '.join(e['id'] for e in data['ecosystems'])})")
    print(f"  packages:   {n_pkg}")
    for e in data["ecosystems"]:
        print(f"    {e['id']}: {len(e['packages'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
