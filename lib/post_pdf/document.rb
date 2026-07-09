# frozen_string_literal: true

require "cgi"
require "time"
require_relative "markdown"
require_relative "version"

module PostPdf
  # Builds print-ready HTML documents for a given theme.
  class Document
    SITE_LABEL = "rgoswami.me"

    attr_reader :kind, :slug, :title, :meta_line, :url, :body_html, :banner_note

    def initialize(kind:, slug:, title:, meta_line:, url:, body_html:, banner_note: nil)
      @kind = kind.to_s
      @slug = slug.to_s
      @title = title.to_s
      @meta_line = meta_line.to_s
      @url = url.to_s
      @body_html = body_html.to_s
      @banner_note = banner_note
    end

    def self.from_post(path, base_url: "https://rgoswami.me")
      require_relative "front_matter"
      raw = File.read(path)
      meta, body = FrontMatter.parse(raw)
      return nil if truthy?(meta["draft"])
      return nil if meta.key?("pdf") && !truthy?(meta["pdf"])

      slug = slug_for(path)
      section = path.include?("/snippets/") ? "snippets" : "posts"
      title = meta["title"] || slug
      authors = Array(meta["author"]).join(", ")
      authors = "Rohit Goswami" if authors.empty?
      date = format_date(meta["date"])
      tags = Array(meta["tags"]).first(6).join(" · ")
      meta_bits = [authors, date, tags].reject { |s| s.nil? || s.empty? }
      series = Array(meta["series"]).first
      banner = series ? series.to_s : section

      new(
        kind: "post",
        slug: slug,
        title: title,
        meta_line: meta_bits.join(" · "),
        url: File.join(base_url, section, slug) + "/",
        body_html: Markdown.to_html(body),
        banner_note: banner
      )
    end

    def self.from_packages(yaml_path, base_url: "https://rgoswami.me")
      require "yaml"
      data = YAML.safe_load(File.read(yaml_path), permitted_classes: [Date, Time, DateTime]) || {}
      ecosystems = Array(data["ecosystems"])
      retired = data["retired"] || {}
      total = ecosystems.sum { |e| Array(e["packages"]).size }
      retired_n = Array(retired["registries"]).sum { |r| Array(r["packages"]).size }

      body = +%(<p class="catalog-lede">#{h(data["intro"] || data["title"] || "Packages")}</p>)
      body << %(<div class="catalog-stats">)
      body << %(<span><strong>#{total}</strong> registry #{total == 1 ? "entry" : "entries"}</span>)
      body << %(<span><strong>#{ecosystems.size}</strong> #{ecosystems.size == 1 ? "surface" : "surfaces"}</span>)
      body << %(<span><strong>#{retired_n}</strong> retired</span>) if retired_n.positive?
      body << %(</div>)

      ecosystems.each do |eco|
        pkgs = Array(eco["packages"])
        body << %(<h2 class="eco-head">#{h(eco["name"])} <span class="pdf-meta">(#{pkgs.size})</span></h2>)
        body << %(<p class="catalog-lede">#{h(eco["description"].to_s.strip)}</p>) unless eco["description"].to_s.strip.empty?
        body << catalog_table(pkgs)
      end

      if retired_n.positive?
        body << %(<h2 class="eco-head">Retired</h2>)
        Array(retired["registries"]).each do |reg|
          pkgs = Array(reg["packages"])
          body << %(<h3>#{h(reg["name"])} (#{pkgs.size})</h3>)
          body << catalog_table(pkgs, retired: true)
        end
      end

      new(
        kind: "catalog",
        slug: "packages",
        title: data["title"] || "Packages",
        meta_line: [
          "updated #{data["updated"]}",
          "#{total} package#{'s' unless total == 1}",
          "#{ecosystems.size} ecosystem#{'s' unless ecosystems.size == 1}"
        ].compact.join(" · "),
        url: File.join(base_url, "packages") + "/",
        body_html: body,
        banner_note: "maintainer inventory"
      )
    end

    def self.catalog_table(pkgs, retired: false)
      return "<p class=\"catalog-lede\">(empty)</p>" if pkgs.empty?

      rows = pkgs.map do |p|
        name = h(p["name"])
        ver = h(p["version"] || p["last_touched"] || "—")
        summary = h(p["summary"] || "—")
        %(<tr><td class="pkg-name">#{name}</td><td class="pkg-ver">#{ver}</td><td>#{summary}</td></tr>)
      end
      col2 = retired ? "last touched" : "version"
      <<~HTML
        <table class="catalog-table">
          <thead><tr><th>package</th><th>#{col2}</th><th>summary</th></tr></thead>
          <tbody>
            #{rows.join("\n")}
          </tbody>
        </table>
      HTML
    end

    def self.h(str)
      CGI.escapeHTML(str.to_s)
    end

    def self.truthy?(val)
      case val
      when true then true
      when false, nil then false
      else
        %w[1 true yes on].include?(val.to_s.strip.downcase)
      end
    end

    def self.format_date(val)
      return "" if val.nil? || val.to_s.empty?
      t = val.is_a?(Time) || val.is_a?(Date) ? val : Time.parse(val.to_s)
      t.strftime("%Y-%m-%d")
    rescue ArgumentError
      val.to_s
    end

    # Hugo section/_index.md → parent folder; posts/foo.md → foo
    def self.slug_for(path)
      base = File.basename(path, ".*")
      return File.basename(File.dirname(path)) if base == "index"

      base
    end

    def render_html(theme:, css_text:)
      raise ArgumentError, "unknown theme #{theme}" unless THEMES.include?(theme.to_s)

      theme = theme.to_s
      note = [banner_note, theme, "Atkinson Hyperlegible"].compact.join(" · ")
      <<~HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>#{self.class.h(title)}</title>
          <style>
        #{css_text}
          </style>
        </head>
        <body class="theme-#{theme}">
          <article class="pdf-page">
            <div class="pdf-banner">
              <strong>#{SITE_LABEL}</strong>
              <span>#{self.class.h(note)}</span>
            </div>
            <h1>#{self.class.h(title)}</h1>
            <p class="pdf-meta">#{self.class.h(meta_line)}</p>
            #{body_html}
            <div class="pdf-footer">
              <span>#{self.class.h(url)}</span>
              <span>Offline PDF · template v#{TEMPLATE_VERSION}</span>
            </div>
          </article>
        </body>
        </html>
      HTML
    end
  end
end
