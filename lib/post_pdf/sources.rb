# frozen_string_literal: true

module PostPdf
  # Discovers renderable pages from the Hugo content tree + packages data.
  class Sources
    DEFAULT_GLOBS = [
      "content/posts/*.md",
      "content/snippets/**/index.md",
      "content/snippets/*.md"
    ].freeze

    attr_reader :root

    def initialize(root)
      @root = File.expand_path(root)
    end

    def markdown_paths
      paths = DEFAULT_GLOBS.flat_map do |g|
        Dir.glob(File.join(@root, g))
      end
      paths.select { |p| File.file?(p) }.uniq.sort
    end

    def packages_yaml
      path = File.join(@root, "data/packages.yaml")
      File.file?(path) ? path : nil
    end

    def write_access_json
      path = File.join(@root, "static/data/write-access.json")
      File.file?(path) ? path : nil
    end

    def documents(base_url: "https://rgoswami.me")
      docs = []
      markdown_paths.each do |path|
        doc = Document.from_post(path, base_url: base_url, root: @root)
        docs << doc if doc
      end
      if (yaml = packages_yaml)
        docs << Document.from_packages(yaml, base_url: base_url)
      end
      if (json = write_access_json)
        docs << Document.from_write_access(json, base_url: base_url)
      end
      docs
    end
  end
end
