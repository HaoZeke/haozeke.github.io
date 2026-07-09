# frozen_string_literal: true

require_relative "test_helper"

class TestFrontMatter < Minitest::Test
  def test_parses_yaml_and_body
    text = <<~MD
      ---
      title: "Hello"
      draft: false
      tags: ["a", "b"]
      ---

      Body *here*.
    MD
    meta, body = PostPdf::FrontMatter.parse(text)
    assert_equal "Hello", meta["title"]
    assert_equal false, meta["draft"]
    assert_equal %w[a b], meta["tags"]
    assert_includes body, "Body"
  end

  def test_missing_front_matter
    meta, body = PostPdf::FrontMatter.parse("just text")
    assert_equal({}, meta)
    assert_equal "just text", body
  end
end
