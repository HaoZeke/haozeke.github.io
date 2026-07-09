# PostPdf

Incremental light/dark PDF export for rgoswami.me posts, snippets, and the
packages catalog. Pure Ruby (+ headless Chromium for print). No shell scripts.

## Storage: orphan `post-pdfs` branch

PDF binaries **do not live on `src`**. They are force-pushed as a **single
orphan commit** on `post-pdfs`, same pattern as the CV repo’s `pdfs` branch
(`HaoZeke/CV`).

```
src (source)  ──build──►  static/pdf/ (workdir, gitignored)
                              │
                              ├── hugo copies into public/pdf for deploy
                              └── rake postPdfPublish  →  force-push orphan post-pdfs
```

Incremental rebuild restores the previous tip first:

```
rake postPdfRestore   # fetch post-pdfs → static/pdf
rake postPdf          # depends on restore; only re-renders changed digests
rake postPdfPublish   # orphan commit + force-push
```

## Commands

```bash
bundle exec rake test_post_pdf    # unit tests (no chromium; uses temp bare git)
bundle exec rake postPdf          # restore + incremental build
POST_PDF_FORCE=1 rake postPdf     # rebuild everything
POST_PDF_SKIP=1 rake hugoBuild    # skip PDFs entirely
bundle exec rake postPdfPublish   # force-push orphan branch
```

Env knobs:

| Variable | Default | Meaning |
|----------|---------|---------|
| `POST_PDF_OUT` | `static/pdf` | Workdir for PDF artifacts |
| `POST_PDF_BRANCH` | `post-pdfs` | Orphan branch name |
| `POST_PDF_REMOTE_URL` | `git remote get-url origin` | Override remote (tests/CI token URL) |
| `POST_PDF_FORCE` | unset | Rebuild all |
| `POST_PDF_SKIP` | unset | No-op all PDF tasks |

## Page kinds

| Kind | Source | UI |
|------|--------|-----|
| `post` | `content/posts/*.md`, `content/snippets/**/index.md` | Title-cluster **Download PDF** |
| `catalog` | `data/packages.yaml` | Packages tools → **Packages PDF** |
| `catalog` | `static/data/write-access.json` | Packages tools → **Write-access PDF** (separate) |

Opt out: `pdf: false` in front matter, or `params.postPdf = false`.

## Typography

Atkinson Hyperlegible (`static/fonts/atkinson/`), print CSS in
`assets/post-pdf/print.css`, site chrome in `static/css/post-pdf-ui.css`.

## Write-access inventory (public artifact)

Full forge inventory (may include private repo *names*) stays local:

- `data/write-access.full.json` or `.tmp/write-access.full.json` (gitignored)
- or `WRITE_ACCESS_FULL=/path/to/full.json`

```bash
bundle exec rake writeAccessExport   # also runs before postPdf
```

Writes `static/data/write-access.json` with:

- **aggregates**: `total`, `public_total`, `private_total` (and per-org counts)
- **names**: public repositories only

PDF and site UI both consume the public file. Private names never ship.

## Images

Hugo `{{< figure src="..." >}}` shortcodes are expanded to real figures (not stripped).
Site-relative paths resolve to `static/` / `public/` as `file://` when present; otherwise
`https://rgoswami.me/...` so CI can still embed images that already ship on the site.
