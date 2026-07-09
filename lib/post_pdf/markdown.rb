# frozen_string_literal: true

require "cgi"
require "kramdown"
begin
  require "kramdown-parser-gfm"
rescue LoadError
  # GFM parser optional
end

module PostPdf
  module Markdown
    module_function

    FIGURE_RE = /\{\{[<%]\s*figure\s+(.*?)\s*[>%]\}\}/m

    # Convert Markdown (+ Hugo figure shortcodes) to HTML for PDF printing.
    # +root+ is the site root so /ox-hugo/... resolves to static/public files.
    def to_html(text, root: nil, base_url: "https://rgoswami.me")
      body = expand_figures(text.to_s, root: root, base_url: base_url)
      body = scrub_remaining_shortcodes(body)
      body = rewrite_markdown_images(body, root: root, base_url: base_url)
      body, math_slots = protect_math(body)
      opts = {
        hard_wrap: false,
        syntax_highlighter: nil
      }
      opts[:input] = "GFM" if defined?(Kramdown::Parser::GFM)
      html = Kramdown::Document.new(body, opts).to_html
      html = restore_math(html, math_slots)
      rewrite_html_img_srcs(html, root: root, base_url: base_url)
    end

# Keep TeX delimiters out of kramdown; normalize ox-hugo \\( \\).
def protect_math(text)
  slots = []
  # Match 1–2 backslashes before delimiters (ox-hugo often double-escapes)
  t = text.gsub(/\\{1,2}\[(.+?)\\{1,2}\]/m) do
    tex = normalize_tex(Regexp.last_match(1))
    slots << "\\[#{tex}\\]"
    math_token(slots.size - 1)
  end
  t = t.gsub(/\\{1,2}\((.+?)\\{1,2}\)/m) do
    tex = normalize_tex(Regexp.last_match(1))
    slots << "\\(#{tex}\\)"
    math_token(slots.size - 1)
  end
  t = t.gsub(/\$\$(.+?)\$\$/m) do
    tex = normalize_tex(Regexp.last_match(1))
    slots << "$$#{tex}$$"
    math_token(slots.size - 1)
  end
  [t, slots]
end

def math_token(i)
  "@@MATH#{i}@@"
end

def restore_math(html, slots)
  slots.each_with_index do |tex, i|
    html = html.gsub(math_token(i), tex)
  end
  html
end

def normalize_tex(tex)
  tex.to_s.gsub("\\_", "_")
end

    # Expand {{< figure src="..." caption="..." >}} into HTML figures.
    def expand_figures(text, root: nil, base_url: "https://rgoswami.me")
      text.gsub(FIGURE_RE) do
        attrs = Regexp.last_match(1)
        src = attr_value(attrs, "src")
        next "" if src.nil? || src.empty?

        caption = attr_value(attrs, "caption")
        caption = clean_caption(caption) if caption
        href = resolve_asset(src, root: root, base_url: base_url)
        cap_html = caption && !caption.empty? ? "<figcaption>#{caption}</figcaption>" : ""
        %(<figure class="pdf-figure"><img src="#{CGI.escapeHTML(href)}" alt="#{CGI.escapeHTML(plain_caption(caption))}" />#{cap_html}</figure>\n\n)
      end
    end

    def scrub_remaining_shortcodes(text)
      t = text.gsub(/\{\{[<%].*?[>%]\}\}/m, "")
      t.gsub(/\n{3,}/, "\n\n")
    end

    # Rewrite markdown image URLs before kramdown.
    def rewrite_markdown_images(text, root: nil, base_url: "https://rgoswami.me")
      text.gsub(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/) do
        alt = Regexp.last_match(1)
        src = Regexp.last_match(2)
        href = resolve_asset(src, root: root, base_url: base_url)
        "![#{alt}](#{href})"
      end
    end

    # Rewrite any remaining relative <img src="/..."> after kramdown.
    def rewrite_html_img_srcs(html, root: nil, base_url: "https://rgoswami.me")
      html.gsub(/<img([^>]*?)\ssrc=(["'])([^"']+)\2/i) do
        pre = Regexp.last_match(1)
        q = Regexp.last_match(2)
        src = Regexp.last_match(3)
        href = resolve_asset(src, root: root, base_url: base_url)
        %(<img#{pre} src=#{q}#{href}#{q})
      end
    end

    def attr_value(attrs, name)
      m = attrs.match(/#{Regexp.escape(name)}\s*=\s*"((?:\\.|[^"\\])*)"/) ||
          attrs.match(/#{Regexp.escape(name)}\s*=\s*'((?:\\.|[^'\\])*)'/)
      return nil unless m

      m[1].gsub('\\"', '"').gsub("\\'", "'")
    end

    def clean_caption(caption)
      caption
        .gsub(%r{<span[^>]*>}i, "")
        .gsub(%r{</span>}i, "")
        .strip
    end

    def plain_caption(caption)
      return "" if caption.nil?

      clean_caption(caption).gsub(/<[^>]+>/, "")
    end

    # Map site-relative or absolute URL to a printable src (file:// preferred).
    def resolve_asset(src, root: nil, base_url: "https://rgoswami.me")
      src = src.to_s.strip
      return src if src.empty?
      return src if src.start_with?("file://", "data:")
      return src if src.start_with?("https://", "http://")

      rel = src.sub(%r{\A/}, "")
      if root
        candidates = [
          File.join(root, "static", rel),
          File.join(root, "public", rel),
          File.join(root, rel)
        ]
        found = candidates.find { |p| File.file?(p) }
        return "file://#{File.expand_path(found)}" if found
      end

      base = base_url.to_s.chomp("/")
      "#{base}/#{rel}"
    end
  end
end
