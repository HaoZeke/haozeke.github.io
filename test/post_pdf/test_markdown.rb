# frozen_string_literal: true

require_relative "test_helper"

class TestMarkdown < Minitest::Test
  def test_scrubs_hugo_shortcodes
    text = <<~MD
      Hello

      {{< figure src="/x.png" caption="cap" >}}

      More **bold**.
    MD
    html = PostPdf::Markdown.to_html(text)
    refute_includes html, "{{<"
    assert_includes html, "<strong>bold</strong>"
    assert_includes html, "Hello"
  end
end
