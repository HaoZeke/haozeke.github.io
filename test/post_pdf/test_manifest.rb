# frozen_string_literal: true

require_relative "test_helper"

class TestManifest < Minitest::Test
  def setup
    @dir = Dir.mktmpdir("postpdf-manifest")
    @path = File.join(@dir, ".manifest.json")
    @out = File.join(@dir, "out")
    FileUtils.mkdir_p(@out)
  end

  def teardown
    FileUtils.remove_entry(@dir)
  end

  def test_stale_when_missing
    m = PostPdf::Manifest.new(@path)
    assert m.stale?("x", "digest", %w[light dark], @out)
  end

  def test_fresh_when_files_present
    m = PostPdf::Manifest.new(@path)
    light = File.join(@out, "x-light.pdf")
    dark = File.join(@out, "x-dark.pdf")
    File.write(light, "%PDF")
    File.write(dark, "%PDF")
    m.record!("x", {
      "digest" => "abc",
      "files" => { "light" => "x-light.pdf", "dark" => "x-dark.pdf" }
    })
    refute m.stale?("x", "abc", %w[light dark], @out)
    assert m.stale?("x", "changed", %w[light dark], @out)
    FileUtils.rm(light)
    assert m.stale?("x", "abc", %w[light dark], @out)
  end

  def test_roundtrip
    m = PostPdf::Manifest.new(@path)
    m.record!("s", { "digest" => "d", "files" => {} })
    m.save!
    m2 = PostPdf::Manifest.new(@path)
    assert_equal "d", m2["s"]["digest"]
  end
end
