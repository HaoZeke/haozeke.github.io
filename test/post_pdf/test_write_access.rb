# frozen_string_literal: true

require_relative "test_helper"

class TestWriteAccess < Minitest::Test
  def full_sample
    {
      "generated" => "2026-07-09",
      "notables" => [
        { "name" => "numpy/numpy", "forge" => "github", "access" => "write", "private" => false },
        { "name" => "HaoZeke/secret", "forge" => "github", "access" => "admin", "private" => true }
      ],
      "forges" => [
        {
          "id" => "github",
          "name" => "GitHub",
          "host" => "github.com",
          "orgs" => [
            {
              "org" => "HaoZeke",
              "url" => "https://github.com/HaoZeke",
              "repos" => [
                { "name" => "anneal", "access" => "admin", "private" => false, "url" => "https://github.com/HaoZeke/anneal" },
                { "name" => "ST_secret", "access" => "admin", "private" => true },
                { "name" => ".password-store", "access" => "admin", "private" => true }
              ]
            },
            {
              "org" => "only-private",
              "repos" => [
                { "name" => "hidden", "access" => "admin", "private" => true }
              ]
            }
          ]
        }
      ]
    }
  end

  def test_public_payload_keeps_aggregate_private_counts
    pub = PostPdf::WriteAccess.public_payload(full_sample)
    assert_equal 4, pub["total"]
    assert_equal 1, pub["public_total"]
    assert_equal 3, pub["private_total"]
    assert_equal 2, pub["org_count"]
    assert_equal 1, pub["forge_count"]

    names = pub["forges"].flat_map { |f| f["orgs"].flat_map { |o| o["repos"].map { |r| r["name"] } } }
    assert_equal ["anneal"], names
    refute_includes names, "ST_secret"
    refute_includes names, ".password-store"
    refute_includes names, "hidden"

    hz = pub["forges"][0]["orgs"].find { |o| o["org"] == "HaoZeke" }
    assert_equal 3, hz["count"]
    assert_equal 1, hz["public_count"]
    assert_equal 2, hz["private_count"]

    only = pub["forges"][0]["orgs"].find { |o| o["org"] == "only-private" }
    assert_equal 1, only["count"]
    assert_equal 0, only["public_count"]
    assert_equal 1, only["private_count"]
    assert_empty only["repos"]

    notable_names = pub["notables"].map { |n| n["name"] }
    assert_equal ["numpy/numpy"], notable_names
  end

  def test_export_writes_public_json
    root = Dir.mktmpdir("wa-export")
    begin
      full = File.join(root, "data/write-access.full.json")
      FileUtils.mkdir_p(File.dirname(full))
      File.write(full, JSON.generate(full_sample))
      FileUtils.mkdir_p(File.join(root, "static/data"))
      File.write(File.join(root, "data/packages.yaml"), <<~YAML)
        upstream:
          title: Write access
          total: 0
          org_count: 0
          forge_count: 0
          forge_summary:
          - id: github
            name: GitHub
            host: github.com
            total: 0
            org_count: 0
        retired:
          title: Retired
      YAML

      result = PostPdf::WriteAccess.export!(root: root)
      refute result[:skipped]
      assert_equal 4, result[:total]
      assert_equal 1, result[:public_total]
      assert_equal 3, result[:private_total]

      pub = JSON.parse(File.read(File.join(root, "static/data/write-access.json")))
      assert_equal 4, pub["total"]
      assert_equal 1, pub["public_total"]
      text = File.read(File.join(root, "static/data/write-access.json"))
      refute_includes text, "ST_secret"
      refute_includes text, "password-store"

      yaml = File.read(File.join(root, "data/packages.yaml"))
      assert_match(/total: 4/, yaml)
    ensure
      FileUtils.remove_entry(root)
    end
  end

  def test_export_skips_without_full
    root = Dir.mktmpdir("wa-skip")
    begin
      result = PostPdf::WriteAccess.export!(root: root)
      assert result[:skipped]
    ensure
      FileUtils.remove_entry(root)
    end
  end
end
