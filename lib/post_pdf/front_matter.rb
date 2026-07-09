# frozen_string_literal: true

require "yaml"

module PostPdf
  # Minimal YAML front-matter parser for Hugo/ox-hugo markdown.
  module FrontMatter
    module_function

    FRONT_MATTER_RE = /\A---\s*\n(.*?)\n---\s*\n(.*)\z/m

    def parse(text)
      match = FRONT_MATTER_RE.match(text)
      return [{}, text.to_s] unless match

      meta = YAML.safe_load(match[1], permitted_classes: [Date, Time, DateTime]) || {}
      body = match[2]
      [stringify_keys(meta), body]
    rescue Psych::SyntaxError
      [{}, text.to_s]
    end

    def stringify_keys(obj)
      case obj
      when Hash
        obj.each_with_object({}) { |(k, v), h| h[k.to_s] = stringify_keys(v) }
      when Array
        obj.map { |v| stringify_keys(v) }
      else
        obj
      end
    end
  end
end
