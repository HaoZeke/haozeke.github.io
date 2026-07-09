# frozen_string_literal: true

module PostPdf
  # MathJax 3 (SVG) for chromium print. Typesets \( \), \[\], $, $$.
  module MathJax
    module_function

    CDN = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg-full.js"

    def head_tags
      <<~HTML
        <script>
          window.MathJax = {
            tex: {
              inlineMath: [['\\\\(', '\\\\)'], ['$', '$']],
              displayMath: [['\\\\[', '\\\\]'], ['$$', '$$']],
              processEscapes: true
            },
            svg: { fontCache: 'global' },
            options: { enableMenu: false },
            startup: {
              pageReady: function () {
                return MathJax.startup.defaultPageReady().then(function () {
                  document.documentElement.setAttribute('data-mathjax', 'ready');
                });
              }
            }
          };
        </script>
        <script src="#{CDN}" id="MathJax-script" async></script>
      HTML
    end

    def needed?(html)
      h = html.to_s
      h.include?('\\(') || h.include?('\\[') || h.include?('$$') ||
        h.match?(/\$[^$\n]+\$/)
    end
  end
end
