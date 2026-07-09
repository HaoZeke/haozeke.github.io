# frozen_string_literal: true

require_relative "test_helper"

class TestDocument < Minitest::Test
  def setup
    @dir = Dir.mktmpdir("postpdf-doc")
  end

  def teardown
    FileUtils.remove_entry(@dir)
  end

  def write_post(name, body, **meta)
    path = File.join(@dir, "#{name}.md")
    fm = meta.map { |k, v| "#{k}: #{v.inspect}" }.join("\n")
    File.write(path, "---\n#{fm}\n---\n\n#{body}\n")
    path
  end

  def test_from_post_basic
    path = write_post(
      "hello-world",
      "Intro paragraph.\n\n## Section\n\nCode `x`.",
      title: "Hello World",
      author: ["Rohit Goswami"],
      date: "2020-01-02",
      tags: %w[emacs orgmode],
      draft: false
    )
    # path must look like content/posts for section detection
    posts = File.join(@dir, "content/posts")
    FileUtils.mkdir_p(posts)
    dest = File.join(posts, "hello-world.md")
    FileUtils.mv(path, dest)

    doc = PostPdf::Document.from_post(dest)
    assert_equal "post", doc.kind
    assert_equal "hello-world", doc.slug
    assert_equal "Hello World", doc.title
    assert_includes doc.meta_line, "2020-01-02"
    assert_includes doc.body_html, "Intro paragraph"
    assert_includes doc.body_html, "<h2"
    html = doc.render_html(theme: "light", css_text: "body{}")
    assert_includes html, "theme-light"
    assert_includes html, "Hello World"
    assert_includes html, "Atkinson Hyperlegible"
  end

  def test_skips_draft
    path = write_post("d", "x", title: "D", draft: true)
    assert_nil PostPdf::Document.from_post(path)
  end

  def test_skips_pdf_false
    path = write_post("d", "x", title: "D", pdf: false)
    assert_nil PostPdf::Document.from_post(path)
  end

  def test_from_packages
    yaml = File.join(@dir, "packages.yaml")
    File.write(yaml, <<~YAML)
      updated: "2026-07-09"
      title: Packages I maintain
      intro: Hello catalog.
      ecosystems:
        - id: aur
          name: AUR
          description: Arch packages.
          packages:
            - name: klfc
              version: "1.0"
              summary: Keyboard layouts.
      retired:
        registries:
          - id: nixpkgs
            name: nixpkgs
            packages:
              - name: rang
                last_touched: "2022"
                summary: Old.
    YAML
    doc = PostPdf::Document.from_packages(yaml)
    assert_equal "catalog", doc.kind
    assert_equal "packages", doc.slug
    assert_includes doc.body_html, "klfc"
    assert_includes doc.body_html, "catalog-table"
    assert_includes doc.body_html, "col-name"
    assert_includes doc.body_html, "Retired"
    assert_includes doc.body_html, "rang"
    # no repeated ecosystem essay blurbs in the dense ledger
    refute_includes doc.body_html, "Arch packages"
    dark = doc.render_html(theme: "dark", css_text: "/*css*/")
    assert_includes dark, "theme-dark"
    assert_includes dark, "kind-catalog"
  end

  def test_unknown_theme_raises
    doc = PostPdf::Document.new(
      kind: "post", slug: "x", title: "T", meta_line: "", url: "u", body_html: "<p>x</p>"
    )
    assert_raises(ArgumentError) { doc.render_html(theme: "neon", css_text: "") }
  end

  def test_index_md_slug_uses_parent_dir
    snip = File.join(@dir, "content/snippets/cool-tip")
    FileUtils.mkdir_p(snip)
    File.write(File.join(snip, "index.md"), <<~MD)
      ---
      title: "Cool Tip"
      draft: false
      ---

      Tip body.
    MD
    doc = PostPdf::Document.from_post(File.join(snip, "index.md"))
    assert_equal "cool-tip", doc.slug
    assert_includes doc.url, "/snippets/cool-tip/"
  end

  def test_from_write_access
    path = File.join(@dir, "write-access.json")
    File.write(path, <<~JSON)
      {
        "generated": "2026-07-09",
        "total": 3,
        "org_count": 2,
        "forge_count": 1,
        "notables": [
          {"name": "numpy/numpy", "forge": "github", "access": "write"}
        ],
        "forges": [
          {
            "id": "github",
            "name": "GitHub",
            "orgs": [
              {
                "org": "HaoZeke",
                "count": 2,
                "repos": [
                  {"name": "anneal", "access": "admin", "private": false},
                  {"name": "secret", "access": "admin", "private": true}
                ]
              },
              {
                "org": "metatensor",
                "count": 1,
                "repos": [
                  {"name": "metatensor", "access": "write", "private": false}
                ]
              }
            ]
          }
        ]
      }
    JSON
    doc = PostPdf::Document.from_write_access(path)
    assert_equal "write-access", doc.slug
    assert_equal "catalog", doc.kind
    assert_equal "Write access", doc.title
    assert_includes doc.meta_line, "3 repos"
    assert_includes doc.body_html, "Notables"
    assert_includes doc.body_html, "numpy/numpy"
    assert_includes doc.body_html, "anneal"
    assert_includes doc.body_html, "private"
    assert_includes doc.body_html, "metatensor"
    html = doc.render_html(theme: "dark", css_text: "/*css*/")
    assert_includes html, "kind-catalog"
    assert_includes html, "write access"
  end
end
