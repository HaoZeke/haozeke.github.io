#!/usr/bin/env python3
"""Scan public registries and compare against data/packages.yaml.

Durable CI hook: discover catalog drift (missing or stale names). Does not
auto-edit the catalog. Exit codes:
  0  no drift (or report-only with empty drift)
  1  drift detected
  2  usage / config / hard failure

Optional: --open-issue creates (or comments on) a GitHub issue when drift
exists, if GITHUB_TOKEN / gh is available.

Examples:
  python scripts/scan_package_registries.py
  python scripts/scan_package_registries.py --json /tmp/report.json
  python scripts/scan_package_registries.py --open-issue --repo HaoZeke/haozeke.github.io
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required", file=sys.stderr)
    sys.exit(2)

UA = "rgoswami-packages-catalog-scan/1.0 (+https://rgoswami.me/packages/)"
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "data" / "packages.yaml"
ISSUE_TITLE = "packages catalog: registry scan found drift"
ISSUE_LABEL = "packages-catalog"


def http_json(url: str, timeout: float = 30.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_text(url: str, timeout: float = 30.0) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def load_catalog(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def catalog_names(data: dict) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for eco in data.get("ecosystems") or []:
        eid = eco.get("id")
        if not eid:
            continue
        names: set[str] = set()
        for pkg in eco.get("packages") or []:
            n = pkg.get("name")
            if n:
                names.add(str(n).lower())
        out[str(eid)] = names
    # retired registries keyed as retired/<id>
    retired = data.get("retired") or {}
    for reg in retired.get("registries") or []:
        rid = reg.get("id")
        if not rid:
            continue
        names = set()
        for pkg in reg.get("packages") or []:
            n = pkg.get("name")
            if n:
                names.add(str(n).lower())
        out[f"retired/{rid}"] = names
    return out


def scan_aur() -> set[str]:
    data = http_json(
        "https://aur.archlinux.org/rpc/v5/search/HaoZeke?by=maintainer"
    )
    return {r["Name"].lower() for r in data.get("results") or [] if r.get("Name")}


def scan_crates() -> set[str]:
    # crates.io user HaoZeke id 115780
    data = http_json(
        "https://crates.io/api/v1/crates?user_id=115780&per_page=100"
    )
    return {c["name"].lower() for c in data.get("crates") or [] if c.get("name")}


def scan_pypi(catalog: set[str]) -> set[str]:
    """Probe catalog names only (PyPI has no public maintainer index)."""
    live: set[str] = set()
    for name in sorted(catalog):
        # skip scoped oddities
        slug = name.split()[0]
        url = f"https://pypi.org/pypi/{slug}/json"
        try:
            http_json(url, timeout=15)
            live.add(name)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                continue
            raise
    return live


def scan_cran() -> set[str]:
    """Scan crandb allall for maintainer email (expensive but durable)."""
    data = http_json("https://crandb.r-pkg.org/-/allall", timeout=180)
    needles = re.compile(r"rgoswami@ieee\.org|Rohit Goswami", re.I)
    hits: set[str] = set()
    for name, meta in data.items():
        if not isinstance(meta, dict):
            continue
        latest = meta.get("latest")
        versions = meta.get("versions") or {}
        ver = versions.get(latest) if latest else None
        if not isinstance(ver, dict) and versions:
            ver = versions.get(list(versions.keys())[-1])
        blob = json.dumps(ver if isinstance(ver, dict) else meta)
        if needles.search(blob):
            hits.add(str(name).lower())
    return hits


def scan_ropensci() -> set[str]:
    try:
        data = http_json(
            "https://ropensci.r-universe.dev/api/search?q=goswami&limit=50"
        )
    except Exception:
        return set()
    hits: set[str] = set()
    for r in data.get("results") or []:
        if isinstance(r, dict) and r.get("Package"):
            hits.add(str(r["Package"]).lower())
        elif isinstance(r, str):
            hits.add(r.lower())
    # always include known peer-reviewed if docs alive
    try:
        http_text("https://docs.ropensci.org/fastMatMR/", timeout=15)
        hits.add("fastmatmr")
    except Exception:
        pass
    return hits


def scan_melpa() -> set[str]:
    # recipe file is the durable signal
    try:
        http_text(
            "https://raw.githubusercontent.com/melpa/melpa/master/recipes/lammps-mode",
            timeout=15,
        )
        return {"lammps-mode"}
    except Exception:
        return set()


def scan_dockerhub() -> set[str]:
    data = http_json(
        "https://hub.docker.com/v2/repositories/haozeke/?page_size=100"
    )
    names: set[str] = set()
    for r in data.get("results") or []:
        n = r.get("name")
        if n:
            names.add(f"haozeke/{n}".lower())
    return names


def scan_crates_ok() -> bool:
    return True


def scan_nixpkgs_local(root: Path | None) -> set[str] | None:
    if root is None or not root.is_dir():
        return None
    # reuse tree scan logic inline
    hits: set[str] = set()
    handle = b"HaoZeke"
    pname_re = re.compile(r'\bpname\s*=\s*"([^"]+)"')
    for path in root.rglob("*.nix"):
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        if handle not in raw:
            continue
        rel = path.as_posix()
        if rel.endswith("maintainer-list.nix"):
            continue
        text = raw.decode("utf-8", errors="replace")
        if "maintainers" not in text:
            continue
        if "HaoZeke" not in text:
            continue
        m = pname_re.search(text)
        if m:
            hits.add(m.group(1).lower())
        else:
            hits.add(path.stem.lower())
    return hits


def diff_sets(discovered: set[str], cataloged: set[str]) -> tuple[set[str], set[str]]:
    """Return (missing_from_catalog, missing_from_registry)."""
    return discovered - cataloged, cataloged - discovered


def run_scans(catalog: dict, nixpkgs_root: Path | None) -> dict[str, Any]:
    cat = catalog_names(catalog)
    report: dict[str, Any] = {"ecosystems": {}, "drift": False}

    scanners = {
        "aur": scan_aur,
        "crates": scan_crates,
        "cran": scan_cran,
        "ropensci": scan_ropensci,
        "melpa": scan_melpa,
        "containers": scan_dockerhub,
    }

    for eid, fn in scanners.items():
        try:
            discovered = fn()
            cataloged = cat.get(eid, set())
            # containers catalog uses haozeke/name and ghcr lines
            if eid == "containers":
                cataloged = {n for n in cataloged if n.startswith("haozeke/")}
            missing_cat, missing_reg = diff_sets(discovered, cataloged)
            # for pypi-like, don't flag "extra catalog" for non-discoverable
            entry = {
                "discovered": sorted(discovered),
                "cataloged": sorted(cataloged),
                "missing_from_catalog": sorted(missing_cat),
                "missing_from_registry": sorted(missing_reg),
                "ok": not missing_cat and not missing_reg,
                "error": None,
            }
            if missing_cat or missing_reg:
                report["drift"] = True
            report["ecosystems"][eid] = entry
            print(f"[{eid}] discovered={len(discovered)} catalog={len(cataloged)} "
                  f"new={len(missing_cat)} gone={len(missing_reg)}")
        except Exception as exc:  # noqa: BLE001
            report["ecosystems"][eid] = {
                "ok": False,
                "error": str(exc),
                "discovered": [],
                "cataloged": sorted(cat.get(eid, set())),
                "missing_from_catalog": [],
                "missing_from_registry": [],
            }
            report["drift"] = True
            print(f"[{eid}] ERROR {exc}", file=sys.stderr)

    # PyPI: only check catalog names still exist
    try:
        pypi_cat = cat.get("pypi", set())
        live = scan_pypi(pypi_cat)
        gone = sorted(pypi_cat - live)
        report["ecosystems"]["pypi"] = {
            "discovered": sorted(live),
            "cataloged": sorted(pypi_cat),
            "missing_from_catalog": [],  # not discoverable
            "missing_from_registry": gone,
            "ok": not gone,
            "error": None,
            "note": "discovery not available; existence check only",
        }
        if gone:
            report["drift"] = True
        print(f"[pypi] catalog={len(pypi_cat)} live={len(live)} gone={len(gone)}")
    except Exception as exc:  # noqa: BLE001
        report["ecosystems"]["pypi"] = {"ok": False, "error": str(exc)}
        report["drift"] = True
        print(f"[pypi] ERROR {exc}", file=sys.stderr)

    # nixpkgs retired
    nix = scan_nixpkgs_local(nixpkgs_root)
    if nix is not None:
        cataloged = cat.get("retired/nixpkgs", set())
        # normalize catalog names
        cat_norm = {n.replace("python3packages.", "") for n in cataloged}
        # d-SEAMS vs d-seams
        cat_norm = {n.lower() for n in cat_norm}
        disc = {n.lower() for n in nix}
        missing_cat, missing_reg = diff_sets(disc, cat_norm)
        # patch-ng may be stored as python3Packages.patch-ng
        report["ecosystems"]["retired/nixpkgs"] = {
            "discovered": sorted(disc),
            "cataloged": sorted(cataloged),
            "missing_from_catalog": sorted(missing_cat),
            "missing_from_registry": sorted(missing_reg),
            "ok": not missing_cat,  # gone-from-tree is expected on unstable
            "error": None,
            "note": "local tree scan; missing_from_registry ignored as soft on channel skew",
        }
        if missing_cat:
            report["drift"] = True
        print(f"[retired/nixpkgs] discovered={len(disc)} catalog={len(cataloged)} new={len(missing_cat)}")
    else:
        report["ecosystems"]["retired/nixpkgs"] = {
            "ok": True,
            "skipped": True,
            "note": "pass --nixpkgs-root to enable",
        }
        print("[retired/nixpkgs] skipped (no --nixpkgs-root)")

    return report


def format_issue_body(report: dict[str, Any]) -> str:
    lines = [
        "Automated registry scan found **catalog drift** against `data/packages.yaml`.",
        "",
        "This issue was opened by `scripts/scan_package_registries.py` (CI).",
        "Edit the catalog by hand; the scanner does not auto-merge names.",
        "",
        "## Drift",
        "",
    ]
    any_row = False
    for eid, eco in sorted((report.get("ecosystems") or {}).items()):
        if eco.get("skipped"):
            continue
        if eco.get("error"):
            any_row = True
            lines.append(f"### `{eid}` — scan error")
            lines.append(f"```\n{eco['error']}\n```")
            lines.append("")
            continue
        new = eco.get("missing_from_catalog") or []
        gone = eco.get("missing_from_registry") or []
        if not new and not gone:
            continue
        any_row = True
        lines.append(f"### `{eid}`")
        if new:
            lines.append("**In registry, not in catalog:**")
            for n in new:
                lines.append(f"- `{n}`")
        if gone and eid != "retired/nixpkgs":
            lines.append("**In catalog, not found in registry:**")
            for n in gone:
                lines.append(f"- `{n}`")
        if eco.get("note"):
            lines.append(f"_{eco['note']}_")
        lines.append("")
    if not any_row:
        lines.append("_No per-ecosystem rows (see JSON artifact)._")
    lines.append("## Next step")
    lines.append("")
    lines.append("1. Confirm the name is really yours / still relevant.")
    lines.append("2. Add or remove the row in `data/packages.yaml`.")
    lines.append("3. Run `pixi run check-packages` (or `python scripts/check_packages_catalog.py`).")
    lines.append("")
    return "\n".join(lines)


def open_or_update_issue(repo: str, body: str) -> None:
    # find open issue with title
    list_cmd = [
        "gh",
        "issue",
        "list",
        "--repo",
        repo,
        "--state",
        "open",
        "--search",
        f'in:title "{ISSUE_TITLE}"',
        "--json",
        "number,title",
    ]
    raw = subprocess.check_output(list_cmd, text=True)
    items = json.loads(raw)
    num = None
    for it in items:
        if it.get("title") == ISSUE_TITLE:
            num = it["number"]
            break
    if num is None:
        cmd = [
            "gh",
            "issue",
            "create",
            "--repo",
            repo,
            "--title",
            ISSUE_TITLE,
            "--body",
            body,
        ]
        # label optional
        try:
            subprocess.check_call(
                ["gh", "label", "create", ISSUE_LABEL, "--repo", repo, "--force"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            cmd.extend(["--label", ISSUE_LABEL])
        except Exception:
            pass
        print(subprocess.check_output(cmd, text=True).strip())
    else:
        subprocess.check_call(
            ["gh", "issue", "comment", str(num), "--repo", repo, "--body", body]
        )
        print(f"commented on issue #{num}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    ap.add_argument("--json", type=Path, help="Write full JSON report")
    ap.add_argument("--nixpkgs-root", type=Path, help="Local nixpkgs tree for retired scan")
    ap.add_argument("--open-issue", action="store_true", help="Open/comment GitHub issue on drift")
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "HaoZeke/haozeke.github.io"))
    args = ap.parse_args(argv)

    if not args.catalog.is_file():
        print(f"catalog missing: {args.catalog}", file=sys.stderr)
        return 2

    data = load_catalog(args.catalog)
    report = run_scans(data, args.nixpkgs_root)
    report["catalog"] = str(args.catalog)

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {args.json}")

    if report.get("drift"):
        body = format_issue_body(report)
        print("--- drift summary ---")
        print(body)
        if args.open_issue:
            try:
                open_or_update_issue(args.repo, body)
            except Exception as exc:  # noqa: BLE001
                print(f"issue open failed: {exc}", file=sys.stderr)
                return 2
        return 1

    print("OK: no registry drift against catalog")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
