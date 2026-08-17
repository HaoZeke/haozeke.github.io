# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

module PostPdf
  # Mint native Antics short links for PDF files (OokCite collection-share shape).
  #
  # POST https://antics-api.turtletech.us/api/links
  #   Authorization: Bearer $ANTICS_API_KEY
  #   Idempotency-Key / source_id: rgoswami-me-pdf:{slug}-{theme}
  #   target_url: https://rgoswami.me/pdf/{slug}-{theme}.pdf
  #
  # Stores public_url as https://sh.turtletech.us/{antics-slug}.
  class AnticsLinks
    class Error < StandardError; end

    DEFAULT_API = "https://antics-api.turtletech.us/api/links"
    DEFAULT_SITE = "https://rgoswami.me"
    SOURCE_PREFIX = "rgoswami-me-pdf"
    FOLDER_PREFIX = "Blog/pdf"

    Result = Struct.new(:table, :created, :replayed, :errors, keyword_init: true)

    def initialize(api_url: DEFAULT_API, token:, site: DEFAULT_SITE, post: nil)
      @api_url = api_url.to_s.chomp("/")
      @token = token.to_s
      @site = site.to_s.chomp("/")
      @post = post || method(:http_post)
    end

    def self.enrich_years!(entries, root:)
      entries.each do |slug, meta|
        next unless meta.is_a?(Hash)
        next if year_for(meta)

        year = year_from_content(root, slug.to_s, meta)
        meta["year"] = year if year
      end
      entries
    end

    def self.year_from_content(root, slug, meta = {})
      kind = meta["kind"].to_s
      if kind == "catalog" || slug == "packages"
        return year_for(yaml_updated(File.join(root, "data/packages.yaml")))
      end
      if slug == "write-access"
        return year_for(json_generated(File.join(root, "static/data/write-access.json")))
      end

      candidates = [
        File.join(root, "content/posts/#{slug}.md"),
        File.join(root, "content/posts/#{slug}/index.md"),
        File.join(root, "content/snippets/#{slug}.md"),
        File.join(root, "content/snippets/#{slug}/index.md")
      ]
      Dir.glob(File.join(root, "content/snippets/**/#{slug}/index.md")).each do |path|
        candidates << path
      end

      candidates.each do |path|
        next unless File.file?(path)

        require_relative "front_matter"
        fm, = FrontMatter.parse(File.read(path))
        year = year_for(fm)
        return year if year
      end
      nil
    end

    def self.yaml_updated(path)
      return nil unless File.file?(path)

      require "yaml"
      data = YAML.safe_load(File.read(path), permitted_classes: [Date, Time, DateTime]) || {}
      data["updated"] || data["date"]
    end
    private_class_method :yaml_updated

    def self.json_generated(path)
      return nil unless File.file?(path)

      data = JSON.parse(File.read(path))
      data["generated"] || data["updated"] || data["date"]
    end
    private_class_method :json_generated

    def self.source_id(slug, theme)
      "#{SOURCE_PREFIX}:#{slug}-#{theme}"
    end

    def self.target_url(slug, theme, site: DEFAULT_SITE)
      "#{site.to_s.chomp("/")}/pdf/#{slug}-#{theme}.pdf"
    end

    def self.folder_path(year)
      "#{FOLDER_PREFIX}/#{year}"
    end

    def self.link_title(title, theme)
      "#{title} (#{theme})"
    end

    # Publish year (UTC, four digits) from an index row or a date-like value.
    def self.year_for(meta)
      raw = meta.is_a?(Hash) ? (meta["year"] || meta["date"]) : meta
      return nil if raw.nil? || raw.to_s.strip.empty?

      text = raw.to_s.strip
      return text if text.match?(/\A\d{4}\z/)

      Time.parse(text).utc.strftime("%Y")
    rescue ArgumentError
      nil
    end

    # +entries+ is { slug => { "title" => ..., "year" => "2024", "files" => { ... } } }
    def mint(entries)
      table = {}
      created = 0
      replayed = 0
      errors = []

      entries.each do |slug, meta|
        title = (meta["title"] || slug).to_s
        year = self.class.year_for(meta)
        files = meta["files"] || {}
        row = {}
        files.each_key do |theme|
          theme = theme.to_s
          begin
            raise Error, "missing publish year for #{slug}" if year.nil?

            url, status = mint_one(slug, theme, title, year)
            row[theme] = url
            created += 1 if status == 201
            replayed += 1 if status == 200
          rescue Error => e
            errors << { "slug" => slug, "theme" => theme, "error" => e.message }
            break if e.message.include?(" 429:")
          end
        end
        table[slug] = row unless row.empty?
        break if errors.any? { |err| err["error"].include?(" 429:") }
      end

      Result.new(table: table, created: created, replayed: replayed, errors: errors)
    end

    def write_json!(path, table)
      File.write(path, JSON.pretty_generate(table) + "\n")
      path
    end

    def mint_one(slug, theme, title, year)
      source_id = self.class.source_id(slug, theme)
      body = {
        "target_url" => self.class.target_url(slug, theme, site: @site),
        "title" => self.class.link_title(title, theme),
        "status_code" => 302,
        "forward_query" => false,
        "enabled" => true,
        "source_id" => source_id,
        "folder_path" => self.class.folder_path(year),
        "tags" => ["blog", "pdf", theme]
      }
      status, payload = @post.call(@api_url, headers(source_id), body)
      unless [200, 201].include?(status)
        raise Error, "POST /api/links #{status}: #{payload}"
      end

      url = payload.is_a?(Hash) ? payload["public_url"].to_s.strip : ""
      raise Error, "missing public_url in #{payload.inspect}" if url.empty?
      unless url.start_with?("https://sh.turtletech.us/")
        raise Error, "unexpected public_url #{url}"
      end

      [url, status]
    end

    def headers(source_id)
      {
        "Authorization" => "Bearer #{@token}",
        "Content-Type" => "application/json",
        "Idempotency-Key" => source_id,
        "User-Agent" => "rgoswami.me-post-pdf/1"
      }
    end

    def http_post(url, headers, body)
      uri = URI.parse(url)
      req = Net::HTTP::Post.new(uri)
      headers.each { |k, v| req[k] = v }
      req.body = JSON.generate(body)
      res = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") do |http|
        http.request(req)
      end
      parsed = begin
        JSON.parse(res.body)
      rescue JSON::ParserError
        { "raw" => res.body.to_s }
      end
      [res.code.to_i, parsed]
    end
  end
end
