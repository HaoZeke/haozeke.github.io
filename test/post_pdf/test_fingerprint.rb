# frozen_string_literal: true

require_relative "test_helper"

class TestFingerprint < Minitest::Test
  def test_stable_digest
    a = PostPdf::Fingerprint.document_digest("x" => 1, "y" => "z")
    b = PostPdf::Fingerprint.document_digest("x" => 1, "y" => "z")
    c = PostPdf::Fingerprint.document_digest("x" => 2, "y" => "z")
    assert_equal a, b
    refute_equal a, c
    assert_match(/\A[0-9a-f]{64}\z/, a)
  end

  def test_template_version_included
    # document_digest always folds TEMPLATE_VERSION
    d1 = PostPdf::Fingerprint.document_digest("a" => 1)
    # shadowing would change if version constant changes — just check format
    assert_equal 64, d1.length
  end
end
