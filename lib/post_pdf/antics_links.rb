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

    Result = Struct.new(:table, :created, :replayed, :errors, keyword_init: true)

    def initialize(api_url: DEFAULT_API, token:, site: DEFAULT_SITE, post: nil)
      @api_url = api_url.to_s.chomp("/")
      @token = token.to_s
      @site = site.to_s.chomp("/")
      @post = post || method(:http_post)
    end

    def self.source_id(slug, theme)
      "#{SOURCE_PREFIX}:#{slug}-#{theme}"
    end

    def self.target_url(slug, theme, site: DEFAULT_SITE)
      "#{site.to_s.chomp("/")}/pdf/#{slug}-#{theme}.pdf"
    end

    # +entries+ is { slug => { "title" => ..., "files" => { "light" => ..., "dark" => ... } } }
    def mint(entries)
      table = {}
      created = 0
      replayed = 0
      errors = []

      entries.each do |slug, meta|
        title = (meta["title"] || slug).to_s
        files = meta["files"] || {}
        row = {}
        files.each_key do |theme|
          theme = theme.to_s
          begin
            url, status = mint_one(slug, theme, title)
            row[theme] = url
            created += 1 if status == 201
            replayed += 1 if status == 200
          rescue Error => e
            errors << { "slug" => slug, "theme" => theme, "error" => e.message }
          end
        end
        table[slug] = row unless row.empty?
      end

      Result.new(table: table, created: created, replayed: replayed, errors: errors)
    end

    def write_json!(path, table)
      File.write(path, JSON.pretty_generate(table) + "\n")
      path
    end

    def mint_one(slug, theme, title)
      source_id = self.class.source_id(slug, theme)
      body = {
        "target_url" => self.class.target_url(slug, theme, site: @site),
        "title" => "#{title} (#{theme} PDF)",
        "status_code" => 302,
        "forward_query" => false,
        "enabled" => true,
        "source_id" => source_id,
        "tags" => ["rgoswami-me", "pdf", theme]
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
        "Idempotency-Key" => source_id
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
