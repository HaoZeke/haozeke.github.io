# frozen_string_literal: true

require "cgi"
require "time"
require_relative "markdown"
require_relative "mathjax"
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

    def self.from_post(path, base_url: "https://rgoswami.me", root: nil)
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
      site_root = root || site_root_for(path)

      new(
        kind: "post",
        slug: slug,
        title: title,
        meta_line: meta_bits.join(" · "),
        url: File.join(base_url, section, slug) + "/",
        body_html: Markdown.to_html(body, root: site_root, base_url: base_url),
        banner_note: banner
      )
    end

    def self.site_root_for(path)
      dir = File.expand_path(File.dirname(path))
      # content/posts/foo.md → site root
      6.times do
        return dir if File.file?(File.join(dir, "hugo.toml")) ||
                      File.file?(File.join(dir, "config.toml")) ||
                      File.directory?(File.join(dir, "static"))
        parent = File.dirname(dir)
        break if parent == dir
        dir = parent
      end
      File.expand_path("../..", path)
    end
    private_class_method :site_root_for

    def self.from_packages(yaml_path, base_url: "https://rgoswami.me")
      require "yaml"
      data = YAML.safe_load(File.read(yaml_path), permitted_classes: [Date, Time, DateTime]) || {}
      ecosystems = Array(data["ecosystems"])
      retired = data["retired"] || {}
      total = ecosystems.sum { |e| Array(e["packages"]).size }
      retired_n = Array(retired["registries"]).sum { |r| Array(r["packages"]).size }

      # Dense ledger: section headers + fixed-column tables. No repeated blurbs.
      body = +%(<div class="catalog">)
      ecosystems.each do |eco|
        pkgs = Array(eco["packages"])
        next if pkgs.empty?

        body << %(<section class="catalog-section">)
        body << %(<h2 class="eco-head">#{h(eco["name"])} <span class="eco-n">#{pkgs.size}</span></h2>)
        body << catalog_table(pkgs)
        body << %(</section>)
      end

      if retired_n.positive?
        body << %(<section class="catalog-section catalog-section--retired">)
        body << %(<h2 class="eco-head">Retired <span class="eco-n">#{retired_n}</span></h2>)
        Array(retired["registries"]).each do |reg|
          pkgs = Array(reg["packages"])
          next if pkgs.empty?

          note = reg["note"].to_s.strip
          body << %(<h3 class="reg-head">#{h(reg["name"])} <span class="eco-n">#{pkgs.size}</span></h3>)
          body << %(<p class="catalog-note">#{h(note)}</p>) unless note.empty?
          body << catalog_table(pkgs, retired: true)
        end
        body << %(</section>)
      end
      body << %(</div>)

      new(
        kind: "catalog",
        slug: "packages",
        title: data["title"] || "Packages",
        meta_line: [
          data["updated"] && "updated #{data["updated"]}",
          "#{total} package#{'s' unless total == 1}",
          "#{ecosystems.size} ecosystem#{'s' unless ecosystems.size == 1}",
          (retired_n.positive? ? "#{retired_n} retired" : nil)
        ].compact.join(" · "),
        url: File.join(base_url, "packages") + "/",
        body_html: body,
        banner_note: "packages"
      )
    end

    def self.catalog_table(pkgs, retired: false)
      return %(<p class="catalog-note">(empty)</p>) if pkgs.empty?

      rows = pkgs.map do |p|
        name = h(p["name"])
        ver = h(p["version"] || p["last_touched"] || "—")
        summary = h(p["summary"] || "—")
        %(<tr><td class="pkg-name">#{name}</td><td class="pkg-ver">#{ver}</td><td class="pkg-sum">#{summary}</td></tr>)
      end
      col2 = retired ? "touched" : "version"
      <<~HTML
        <table class="catalog-table">
          <colgroup>
            <col class="col-name" />
            <col class="col-ver" />
            <col class="col-sum" />
          </colgroup>
          <thead>
            <tr><th scope="col">package</th><th scope="col">#{col2}</th><th scope="col">summary</th></tr>
          </thead>
          <tbody>
            #{rows.join("\n")}
          </tbody>
        </table>
      HTML
    end

    # Write-access ledger PDF. Reads the *public* artifact from
    # PostPdf::WriteAccess (aggregates may include private counts; listed
    # names are public only). Defense-in-depth: still strip private:true.
    def self.from_write_access(json_path, base_url: "https://rgoswami.me")
      require "json"
      data = JSON.parse(File.read(json_path))
      # If someone fed a full inventory by mistake, scrub first.
      data = WriteAccess.public_payload(data) if write_access_needs_scrub?(data)

      forges = Array(data["forges"])
      notables = Array(data["notables"])
      generated = data["generated"]
      total = data["total"] || forges.sum { |f| f["total"] || 0 }
      public_total = data["public_total"] || forges.sum { |f| f["public_total"] || 0 }
      private_total = data["private_total"] || forges.sum { |f| f["private_total"] || 0 }
      org_n = data["org_count"] || forges.sum { |f| f["org_count"] || Array(f["orgs"]).size }
      forge_n = data["forge_count"] || forges.size

      body = +%(<div class="catalog catalog--write-access">)
      body << %(<p class="catalog-note">Listed names are public. Private repositories appear only in aggregate counts.</p>)

      unless notables.empty?
        body << %(<section class="catalog-section">)
        body << %(<h2 class="eco-head">Notables <span class="eco-n">#{notables.size}</span></h2>)
        body << notables_table(notables)
        body << %(</section>)
      end

      forges.each do |forge|
        orgs = Array(forge["orgs"]).sort_by { |o| -(o["count"] || 0) }
        next if orgs.empty?

        forge_total = forge["total"] || orgs.sum { |o| o["count"] || 0 }
        forge_priv = forge["private_total"] || orgs.sum { |o| o["private_count"] || 0 }
        body << %(<section class="catalog-section">)
        body << %(<h2 class="eco-head">#{h(forge["name"] || forge["id"])} <span class="eco-n">#{forge_total}</span></h2>)
        if forge_priv.positive?
          body << %(<p class="catalog-note">#{forge_priv} private (not listed by name)</p>)
        end
        orgs.each do |org|
          repos = Array(org["repos"]).reject { |r| WriteAccess.private_repo?(r) }
                    .sort_by { |r| r["name"].to_s.downcase }
          count = org["count"] || (repos.size + (org["private_count"] || 0))
          priv = org["private_count"] || 0
          body << %(<h3 class="reg-head">#{h(org["org"])} <span class="eco-n">#{count}</span></h3>)
          if priv.positive?
            body << %(<p class="catalog-note">#{priv} private (not listed)</p>)
          end
          body << repos_table(repos) if repos.any?
          body << %(<p class="catalog-note">(no public repos listed)</p>) if repos.empty? && priv.positive?
        end
        body << %(</section>)
      end

      body << %(</div>)

      meta_bits = [
        generated && "updated #{generated}",
        "#{total} repo#{'s' unless total == 1}",
        "#{public_total} public",
        (private_total.positive? ? "#{private_total} private" : nil),
        "#{org_n} org#{'s' unless org_n == 1}",
        "#{forge_n} forge#{'s' unless forge_n == 1}"
      ].compact

      new(
        kind: "catalog",
        slug: "write-access",
        title: "Write access",
        meta_line: meta_bits.join(" · "),
        url: File.join(base_url, "packages") + "/#eco-upstream",
        body_html: body,
        banner_note: "write access"
      )
    end

    def self.write_access_needs_scrub?(data)
      Array(data["forges"]).any? do |f|
        Array(f["orgs"]).any? do |o|
          Array(o["repos"]).any? { |r| WriteAccess.private_repo?(r) }
        end
      end
    end
    private_class_method :write_access_needs_scrub?

    def self.notables_table(notables)
      rows = notables.map do |n|
        name = h(n["name"] || n["full_name"])
        forge = h(n["forge"] || "—")
        access = h(n["access"] || "write")
        %(<tr><td class="pkg-name">#{name}</td><td class="pkg-ver">#{forge}</td><td class="pkg-sum">#{access}</td></tr>)
      end
      <<~HTML
        <table class="catalog-table catalog-table--wa-notable">
          <colgroup>
            <col class="col-name" />
            <col class="col-ver" />
            <col class="col-sum" />
          </colgroup>
          <thead>
            <tr><th scope="col">repository</th><th scope="col">forge</th><th scope="col">access</th></tr>
          </thead>
          <tbody>
            #{rows.join("\n")}
          </tbody>
        </table>
      HTML
    end

    def self.repos_table(repos)
      # Callers must already exclude private; drop any that slipped through.
      repos = Array(repos).reject { |r| r["private"] }
      return %(<p class="catalog-note">(empty)</p>) if repos.empty?

      rows = repos.map do |r|
        name = h(r["name"] || r["full_name"])
        access = h(r["access"] || "write")
        %(<tr><td class="pkg-name">#{name}</td><td class="pkg-ver">#{access}</td></tr>)
      end
      <<~HTML
        <table class="catalog-table catalog-table--wa-repos">
          <colgroup>
            <col class="col-name" />
            <col class="col-ver" />
          </colgroup>
          <thead>
            <tr><th scope="col">repository</th><th scope="col">access</th></tr>
          </thead>
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
      math = (kind == "post" && MathJax.needed?(body_html)) ? MathJax.head_tags : ""
      <<~HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>#{self.class.h(title)}</title>
          <style>
        #{css_text}
          </style>
          #{math}
        </head>
        <body class="theme-#{theme} kind-#{kind}">
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
              <span>template v#{TEMPLATE_VERSION}</span>
            </div>
          </article>
        </body>
        </html>
      HTML
    end
  end
end
