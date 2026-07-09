# frozen_string_literal: true

require_relative "test_helper"

class FakePrinter
  attr_reader :calls

  def initialize
    @calls = []
  end

  def available?
    true
  end

  def print(html_path, pdf_path)
    @calls << [html_path, pdf_path]
    FileUtils.mkdir_p(File.dirname(pdf_path))
    File.write(pdf_path, "%PDF-1.4 fake #{File.basename(pdf_path)}")
    pdf_path
  end
end

class TestBuilder < Minitest::Test
  def setup
    @root = Dir.mktmpdir("postpdf-builder")
    # minimal tree
    FileUtils.mkdir_p(File.join(@root, "content/posts"))
    FileUtils.mkdir_p(File.join(@root, "data"))
    FileUtils.mkdir_p(File.join(@root, "assets/post-pdf"))
    FileUtils.mkdir_p(File.join(@root, "static/fonts/atkinson"))
    File.write(File.join(@root, "assets/post-pdf/print.css"), "body { color: red; } /* FONTDIR */")
    File.write(File.join(@root, "content/posts/alpha.md"), <<~MD)
      ---
      title: "Alpha"
      date: "2021-01-01"
      draft: false
      ---

      Alpha body.
    MD
    File.write(File.join(@root, "content/posts/beta.md"), <<~MD)
      ---
      title: "Beta"
      date: "2021-02-01"
      draft: false
      ---

      Beta body.
    MD
    File.write(File.join(@root, "data/packages.yaml"), <<~YAML)
      updated: "2026-01-01"
      title: Packages
      intro: Intro.
      ecosystems:
        - id: aur
          name: AUR
          packages:
            - name: pkg
              version: "1"
              summary: s
    YAML
    FileUtils.mkdir_p(File.join(@root, "static/data"))
    File.write(File.join(@root, "static/data/write-access.json"), <<~JSON)
      {
        "generated": "2026-01-01",
        "total": 1,
        "org_count": 1,
        "forge_count": 1,
        "notables": [],
        "forges": [
          {
            "id": "github",
            "name": "GitHub",
            "orgs": [
              {
                "org": "HaoZeke",
                "count": 1,
                "repos": [{"name": "x", "access": "admin", "private": false}]
              }
            ]
          }
        ]
      }
    JSON
    @printer = FakePrinter.new
    @out = File.join(@root, "static/pdf")
  end

  def teardown
    FileUtils.remove_entry(@root)
  end

  def builder(force: false)
    PostPdf::Builder.new(root: @root, out_dir: @out, printer: @printer, force: force)
  end

  def test_incremental_skips_unchanged
    r1 = builder.run
    assert_equal 4, r1.built.size # alpha, beta, packages, write-access
    assert_empty r1.skipped
    assert_empty r1.errors
    first_calls = @printer.calls.size
    assert_equal 8, first_calls # 4 docs × 2 themes

    r2 = builder.run
    assert_empty r2.built
    assert_equal 4, r2.skipped.size
    assert_equal first_calls, @printer.calls.size # no new prints
  end

  def test_rebuild_on_content_change
    builder.run
    File.write(File.join(@root, "content/posts/alpha.md"), <<~MD)
      ---
      title: "Alpha"
      date: "2021-01-01"
      draft: false
      ---

      Alpha body changed.
    MD
    r = builder.run
    assert_includes r.built, "alpha"
    assert_includes r.skipped, "beta"
    assert_includes r.skipped, "packages"
    assert_includes r.skipped, "write-access"
  end

  def test_force_rebuilds_all
    builder.run
    r = builder(force: true).run
    assert_equal 4, r.built.size
  end

  def test_prunes_removed_sources
    builder.run
    FileUtils.rm(File.join(@root, "content/posts/beta.md"))
    r = builder.run
    assert_includes r.removed, "beta"
    refute File.exist?(File.join(@out, "beta-light.pdf"))
    assert File.exist?(File.join(@out, "alpha-light.pdf"))
  end

  def test_writes_index_json
    builder.run
    index = JSON.parse(File.read(File.join(@out, "index.json")))
    assert_equal %w[light dark], index["themes"]
    assert index["entries"].key?("packages")
    assert index["entries"].key?("write-access")
    assert index["entries"].key?("alpha")
  end
end
