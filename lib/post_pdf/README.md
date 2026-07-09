# PostPdf

Incremental light/dark PDF export for rgoswami.me posts, snippets, and the
packages catalog. Pure Ruby (+ headless Chromium for print). No shell scripts.

## Commands

```bash
bundle exec rake test_post_pdf   # unit tests, no chromium
bundle exec rake postPdf         # incremental build → static/pdf/
POST_PDF_FORCE=1 rake postPdf    # rebuild everything
POST_PDF_SKIP=1 rake hugoBuild   # skip PDFs (e.g. offline)
```

## Incremental rebuild

Each page gets a SHA-256 digest over:

- template version (`PostPdf::TEMPLATE_VERSION`)
- title / meta / body HTML
- print CSS
- themes (`light`, `dark`)

`static/pdf/.manifest.json` records digests. Unchanged pages are skipped;
removed sources prune their PDFs.

## Page kinds

| Kind | Source | UI |
|------|--------|-----|
| `post` | `content/posts/*.md`, `content/snippets/**/index.md` | Title-cluster **Download PDF** |
| `catalog` | `data/packages.yaml` | Packages tools bar **Catalog PDF** |

Opt out per page: `pdf: false` in front matter. Site-wide: `params.postPdf = false`.

## Typography

Atkinson Hyperlegible (`static/fonts/atkinson/`), print CSS in
`assets/post-pdf/print.css`, site chrome in `static/css/post-pdf-ui.css`.
