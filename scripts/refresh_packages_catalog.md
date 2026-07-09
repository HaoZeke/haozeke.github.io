# Packages catalog maintenance

## Offline (always, CI gate)

```bash
pixi run check-packages
# or:
python scripts/check_packages_catalog.py
python -m unittest tests.test_packages_catalog -v
```

## Online registry scan (weekly CI + manual)

`scripts/scan_package_registries.py` compares live registries to
`data/packages.yaml`. It does **not** edit the catalog.

| Source | Discovery |
|--------|-----------|
| AUR | maintainer `HaoZeke` RPC |
| crates.io | user id 115780 |
| CRAN | crandb maintainer email / name match |
| rOpenSci | r-universe search + docs probe |
| MELPA | recipe existence |
| Docker Hub | `haozeke/*` |
| PyPI | existence check for catalog names only |
| nixpkgs (retired) | local tree `rg` for `HaoZeke` (`--nixpkgs-root`) |

```bash
python scripts/scan_package_registries.py --json /tmp/report.json
python scripts/scan_package_registries.py --nixpkgs-root /path/to/nixpkgs --open-issue
```

CI workflow: `.github/workflows/packages_catalog_scan.yml`
- Offline check on catalog edits
- Weekly scan; on drift, opens/comments issue titled
  `packages catalog: registry scan found drift` (label `packages-catalog`)

## Adding a package

1. Confirm it is yours on the registry.
2. Edit `data/packages.yaml` (active `ecosystems` or `retired.registries`).
3. Run offline check.
4. Close or resolve the drift issue.

## UI

- Active registries render as open ledger sections.
- Write access is collapsed by default (lazy multi-forge JSON).
- Retired is collapsed; each registry under it (e.g. nixpkgs) is nested-collapsed.
