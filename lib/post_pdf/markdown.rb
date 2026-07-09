# frozen_string_literal: true

require "kramdown"
begin
  require "kramdown-parser-gfm"
rescue LoadError
  # GFM parser optional; falls back to default kramdown input
end

module PostPdf
  module Markdown
    module_function

    # Strip Hugo shortcodes / templates so PDF body is readable prose.
    def scrub_hugo(text)
      t = text.to_s
      # {{< ... >}} and {{% ... %}} including multi-line
      t = t.gsub(/\{\{[<%].*?[>%]\}\}/m, "")
      # leftover figure captions that were only shortcodes
      t = t.gsub(/\n{3,}/, "\n\n")
      t
    end

    def to_html(text)
      body = scrub_hugo(text)
      opts = {
        hard_wrap: false,
        syntax_highlighter: nil
      }
      opts[:input] = "GFM" if defined?(Kramdown::Parser::GFM)
      Kramdown::Document.new(body, opts).to_html
    end
  end
end
