# frozen_string_literal: true

require "json"
require "fileutils"

module PostPdf
  # On-disk map of slug → {digest, themes → paths, kind, ...}.
  class Manifest
    attr_reader :path, :entries

    def initialize(path)
      @path = path.to_s
      @entries = {}
      load!
    end

    def load!
      if File.file?(@path)
        data = JSON.parse(File.read(@path))
        @entries = data.fetch("entries", {})
      else
        @entries = {}
      end
      self
    end

    def [](slug)
      @entries[slug]
    end

    def record!(slug, entry)
      @entries[slug] = entry
    end

    def delete!(slug)
      @entries.delete(slug)
    end

    def slugs
      @entries.keys
    end

    def save!
      FileUtils.mkdir_p(File.dirname(@path))
      payload = {
        "version" => 1,
        "updated" => Time.now.utc.iso8601,
        "entries" => @entries
      }
      File.write(@path, JSON.pretty_generate(payload) + "\n")
    end

    def stale?(slug, digest, themes, out_dir)
      entry = @entries[slug]
      return true if entry.nil?
      return true if entry["digest"] != digest

      themes.any? do |theme|
        rel = entry.dig("files", theme)
        rel.nil? || !File.file?(File.join(out_dir, rel))
      end
    end
  end
end
