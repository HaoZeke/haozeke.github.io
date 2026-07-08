# Refreshing `data/packages.yaml`

The inventory is **hand-maintained** catalog data. CI only runs
`scripts/check_packages_catalog.py` (offline shape + host checks).

## Manual seed sources

| Ecosystem   | Source |
|-------------|--------|
| AUR         | `https://aur.archlinux.org/rpc/v5/search/HaoZeke?by=maintainer` |
| conda-forge | GitHub code search for `HaoZeke` in `meta.yaml` / `recipe.yaml` under `conda-forge/*-feedstock` |
| PyPI        | `https://pypi.org/pypi/<name>/json` for known projects |
| crates.io   | `https://crates.io/api/v1/crates?user_id=115780` (user `HaoZeke`) with a proper `User-Agent` |

After editing YAML:

```bash
python scripts/check_packages_catalog.py
python -m unittest tests/test_packages_catalog.py -v
hugo --minify   # or: pixi run build  (also runs ox-hugo org export)
```
