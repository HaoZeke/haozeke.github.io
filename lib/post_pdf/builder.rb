# frozen_string_literal: true

require "fileutils"
require "json"
require_relative "version"
require_relative "fingerprint"
require_relative "manifest"
require_relative "document"
require_relative "sources"
require_relative "chromium"

module PostPdf
  # Incremental PDF builder. Only re-renders when digests change or outputs missing.
  class Builder
    Result = Struct.new(:built, :skipped, :removed, :errors, keyword_init: true)

    attr_reader :root, :out_dir, :work_dir, :manifest, :printer, :css_path, :font_dir, :force

    def initialize(
      root:,
      out_dir: nil,
      work_dir: nil,
      printer: nil,
      force: false,
      base_url: "https://rgoswami.me"
    )
      @root = File.expand_path(root)
      @out_dir = File.expand_path(out_dir || File.join(@root, "static/pdf"))
      @work_dir = File.expand_path(work_dir || File.join(@root, ".tmp/post-pdf"))
      @manifest = Manifest.new(File.join(@out_dir, ".manifest.json"))
      @printer = printer || Chromium.new
      @force = force
      @base_url = base_url
      @css_path = File.join(@root, "assets/post-pdf/print.css")
      @font_dir = File.join(@root, "static/fonts/atkinson")
    end

    def run
      raise Chromium::Error, "chromium binary not found" unless @printer.available?

      FileUtils.mkdir_p(@out_dir)
      FileUtils.mkdir_p(@work_dir)

      css_text = prepared_css
      css_digest = Fingerprint.string_sha256(css_text)
      sources = Sources.new(@root)
      docs = sources.documents(base_url: @base_url)

      built = []
      skipped = []
      errors = []

      active_slugs = []

      docs.each do |doc|
        active_slugs << doc.slug
        digest = digest_for(doc, css_digest)
        if !@force && !@manifest.stale?(doc.slug, digest, THEMES, @out_dir)
          skipped << doc.slug
          next
        end

        begin
          files = {}
          THEMES.each do |theme|
            rel = "#{doc.slug}-#{theme}.pdf"
            html_path = File.join(@work_dir, "#{doc.slug}-#{theme}.html")
            pdf_path = File.join(@out_dir, rel)
            File.write(html_path, doc.render_html(theme: theme, css_text: css_text))
            @printer.print(html_path, pdf_path)
            files[theme] = rel
          end
          @manifest.record!(doc.slug, {
            "digest" => digest,
            "kind" => doc.kind,
            "title" => doc.title,
            "files" => files,
            "url" => doc.url
          })
          built << doc.slug
        rescue StandardError => e
          errors << { "slug" => doc.slug, "error" => e.message }
        end
      end

      removed = prune!(active_slugs)
      @manifest.save!

      # Public index for Hugo partials / debugging
      write_index!

      Result.new(built: built, skipped: skipped, removed: removed, errors: errors)
    end

    def digest_for(doc, css_digest)
      Fingerprint.document_digest(
        "slug" => doc.slug,
        "kind" => doc.kind,
        "title" => doc.title,
        "meta" => doc.meta_line,
        "url" => doc.url,
        "body" => Fingerprint.string_sha256(doc.body_html),
        "css" => css_digest,
        "themes" => THEMES
      )
    end

    def prepared_css
      raw = File.read(@css_path)
      font_uri = "file://#{@font_dir}"
      raw.gsub("FONTDIR", font_uri)
    end

    def prune!(active_slugs)
      removed = []
      (@manifest.slugs - active_slugs).each do |slug|
        entry = @manifest[slug]
        Array(entry&.dig("files")&.values).each do |rel|
          path = File.join(@out_dir, rel)
          FileUtils.rm_f(path)
        end
        @manifest.delete!(slug)
        removed << slug
      end
      removed
    end

    def write_index!
      index = {
        "version" => TEMPLATE_VERSION,
        "themes" => THEMES,
        "entries" => @manifest.entries
      }
      File.write(File.join(@out_dir, "index.json"), JSON.pretty_generate(index) + "\n")
    end
  end
end
