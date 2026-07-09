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
REQUIRED_ECOSYSTEMS = ("aur", "conda-forge", "pypi", "crates", "spack", "melpa", "containers", "cran", "ropensci")

# registry_url host must match one of these (substring / exact host rules)
HOST_RULES: dict[str, tuple[str, ...]] = {
    "aur": ("aur.archlinux.org",),
    "conda-forge": ("prefix.dev", "anaconda.org", "conda-forge.org", "github.com"),
    "pypi": ("pypi.org", "pypi.python.org"),
    "crates": ("crates.io",),
    "spack": ("packages.spack.io", "spack.io", "github.com"),
    "melpa": ("melpa.org",),
    "containers": ("hub.docker.com", "docker.io", "github.com", "ghcr.io"),
    "cran": ("cran.r-project.org", "r-project.org", "r-pkg.org", "cranlogs.r-pkg.org"),
    "ropensci": ("ropensci.org", "docs.ropensci.org", "r-universe.dev", "github.com"),
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

    upstream = data.get("upstream")
    if upstream is not None:
        if not isinstance(upstream, dict):
            errors.append("upstream must be a mapping when present")
        else:
            if not isinstance(upstream.get("total"), int) or upstream["total"] < 1:
                errors.append("upstream.total must be a positive int")
            if not isinstance(upstream.get("org_count"), int) or upstream["org_count"] < 1:
                errors.append("upstream.org_count must be a positive int")
            if not upstream.get("data_url"):
                errors.append("upstream.data_url required for lazy-loaded full list")
            notables = upstream.get("notables")
            if not isinstance(notables, list) or len(notables) < 1:
                errors.append("upstream.notables must be a non-empty list")
            else:
                for j, repo in enumerate(notables):
                    if not isinstance(repo, dict) or not repo.get("name") or not repo.get("url"):
                        errors.append(f"upstream.notables[{j}]: need name + url")
            forges = upstream.get("forge_summary")
            if not isinstance(forges, list) or len(forges) < 1:
                errors.append("upstream.forge_summary must be a non-empty list")

    retired = data.get("retired")
    if retired is not None:
        if not isinstance(retired, dict):
            errors.append("retired must be a mapping when present")
        else:
            regs = retired.get("registries")
            if not isinstance(regs, list) or len(regs) < 1:
                errors.append("retired.registries must be a non-empty list")
            else:
                for i, reg in enumerate(regs):
                    if not isinstance(reg, dict) or not reg.get("id") or not reg.get("name"):
                        errors.append(f"retired.registries[{i}]: need id + name")
                        continue
                    pkgs = reg.get("packages")
                    if not isinstance(pkgs, list) or len(pkgs) < 1:
                        errors.append(f"retired.registries[{i}]: need ≥1 package")
                        continue
                    for j, pkg in enumerate(pkgs):
                        if not isinstance(pkg, dict):
                            errors.append(f"retired[{reg.get('id')}][{j}]: mapping required")
                            continue
                        if not pkg.get("name") or not pkg.get("registry_url"):
                            errors.append(
                                f"retired[{reg.get('id')}][{j}]: need name + registry_url"
                            )
                        if not pkg.get("last_touched"):
                            errors.append(
                                f"retired[{reg.get('id')}]/{pkg.get('name')}: need last_touched"
                            )

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
