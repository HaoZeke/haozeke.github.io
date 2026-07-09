# frozen_string_literal: true

require_relative "test_helper"

class TestMarkdown < Minitest::Test
  def setup
    @root = Dir.mktmpdir("postpdf-md")
    @img_dir = File.join(@root, "static/ox-hugo")
    FileUtils.mkdir_p(@img_dir)
    # minimal valid PNG (1x1)
    png = ["89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" \
           "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"].pack("H*")
    @img = File.join(@img_dir, "sample.png")
    File.write(@img, png, mode: "wb")
  end

  def teardown
    FileUtils.remove_entry(@root)
  end

  def test_expands_hugo_figure_to_img
    text = <<~MD
      Hello

      {{< figure src="/ox-hugo/sample.png" caption="<span class=\\"figure-number\\">Figure 1: </span>A plot" >}}

      More **bold**.
    MD
    html = PostPdf::Markdown.to_html(text, root: @root)
    refute_includes html, "{{<"
    assert_includes html, "<figure"
    assert_includes html, "sample.png"
    assert_includes html, "file://"
    assert_includes html, "Figure 1:"
    assert_includes html, "<strong>bold</strong>"
  end

  def test_scrubs_unknown_shortcodes
    text = "Before {{< foo bar >}} after"
    html = PostPdf::Markdown.to_html(text, root: @root)
    refute_includes html, "{{<"
    assert_includes html, "Before"
    assert_includes html, "after"
  end

  def test_markdown_image_resolved
    text = "![alt text](/ox-hugo/sample.png)"
    html = PostPdf::Markdown.to_html(text, root: @root)
    assert_includes html, "file://"
    assert_includes html, "sample.png"
  end

  def test_missing_asset_falls_back_to_site_url
    text = '{{< figure src="/ox-hugo/missing.png" >}}'
    html = PostPdf::Markdown.to_html(text, root: @root, base_url: "https://rgoswami.me")
    assert_includes html, "https://rgoswami.me/ox-hugo/missing.png"
  end
end
