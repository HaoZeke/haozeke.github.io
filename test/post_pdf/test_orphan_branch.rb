# frozen_string_literal: true

require_relative "test_helper"
require "open3"

class TestOrphanBranch < Minitest::Test
  def setup
    @bare = Dir.mktmpdir("postpdf-bare")
    @src = Dir.mktmpdir("postpdf-src")
    @restore = Dir.mktmpdir("postpdf-restore")
    _out, status = Open3.capture2e("git", "init", "--bare", @bare)
    flunk "git init bare failed" unless status.success?
  end

  def teardown
    FileUtils.remove_entry(@bare)
    FileUtils.remove_entry(@src)
    FileUtils.remove_entry(@restore)
  end

  def write_artifacts(dir)
    File.write(File.join(dir, "alpha-light.pdf"), "%PDF-light")
    File.write(File.join(dir, "alpha-dark.pdf"), "%PDF-dark")
    File.write(File.join(dir, "index.json"), %({"entries":{}}))
    File.write(File.join(dir, ".manifest.json"), %({"entries":{}}))
  end

  def test_publish_and_restore_roundtrip
    write_artifacts(@src)
    pub = PostPdf::OrphanBranch.new(
      source_dir: @src,
      branch: "post-pdfs",
      remote_url: @bare
    )
    result = pub.publish!(message: "test pdfs")
    assert_equal "post-pdfs", result[:branch]
    assert_equal 2, result[:pdfs]

    # orphan tip is a single commit
    out, status = Open3.capture2("git", "--git-dir=#{@bare}", "rev-list", "--count", "post-pdfs")
    assert status.success?
    assert_equal "1", out.strip

    restorer = PostPdf::OrphanBranch.new(
      source_dir: @restore,
      branch: "post-pdfs",
      remote_url: @bare
    )
    r = restorer.restore!
    refute r[:skipped]
    assert r[:restored] >= 2
    assert_equal "%PDF-light", File.read(File.join(@restore, "alpha-light.pdf"))
    assert File.file?(File.join(@restore, "index.json"))
  end

  def test_restore_missing_branch_is_noop
    restorer = PostPdf::OrphanBranch.new(
      source_dir: @restore,
      branch: "does-not-exist",
      remote_url: @bare
    )
    r = restorer.restore!
    assert r[:skipped]
    assert_equal 0, r[:restored]
  end

  def test_publish_requires_pdfs
    pub = PostPdf::OrphanBranch.new(source_dir: @src, remote_url: @bare)
    assert_raises(PostPdf::OrphanBranch::Error) { pub.publish! }
  end

  def test_force_push_replaces_history
    write_artifacts(@src)
    pub = PostPdf::OrphanBranch.new(source_dir: @src, branch: "post-pdfs", remote_url: @bare)
    pub.publish!(message: "first")
    File.write(File.join(@src, "beta-light.pdf"), "%PDF-beta")
    pub.publish!(message: "second")

    out, status = Open3.capture2("git", "--git-dir=#{@bare}", "rev-list", "--count", "post-pdfs")
    assert status.success?
    assert_equal "1", out.strip, "orphan tip must stay a single commit after force-push"

    # only latest tree
    restorer = PostPdf::OrphanBranch.new(source_dir: @restore, branch: "post-pdfs", remote_url: @bare)
    restorer.restore!
    assert File.file?(File.join(@restore, "beta-light.pdf"))
  end
end
