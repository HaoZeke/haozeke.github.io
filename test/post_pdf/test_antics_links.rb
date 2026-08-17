# frozen_string_literal: true

require_relative "test_helper"

class TestAnticsLinks < Minitest::Test
  def setup
    @calls = []
    @status = 201
    @public = "https://sh.turtletech.us/Abc123"
    poster = lambda do |url, headers, body|
      @calls << { url: url, headers: headers, body: body }
      [@status, { "id" => "link-1", "public_url" => @public }]
    end
    @minter = PostPdf::AnticsLinks.new(token: "test-key", post: poster)
  end

  def test_source_id_and_target
    assert_equal "rgoswami-me-pdf:rm2-ss-dark", PostPdf::AnticsLinks.source_id("rm2-ss", "dark")
    assert_equal(
      "https://rgoswami.me/pdf/rm2-ss-dark.pdf",
      PostPdf::AnticsLinks.target_url("rm2-ss", "dark")
    )
  end

  def test_mint_posts_ookcite_shaped_body
    entries = {
      "rm2-ss" => { "title" => "reMarkable Screen Sharing", "files" => { "dark" => "rm2-ss-dark.pdf" } }
    }
    result = @minter.mint(entries)
    assert_equal 1, @calls.size
    call = @calls.first
    assert_equal "https://antics-api.turtletech.us/api/links", call[:url]
    assert_equal "Bearer test-key", call[:headers]["Authorization"]
    assert_equal "rgoswami-me-pdf:rm2-ss-dark", call[:headers]["Idempotency-Key"]
    body = call[:body]
    assert_equal "https://rgoswami.me/pdf/rm2-ss-dark.pdf", body["target_url"]
    assert_equal "rgoswami-me-pdf:rm2-ss-dark", body["source_id"]
    assert_equal 302, body["status_code"]
    assert_equal false, body["forward_query"]
    assert_equal %w[rgoswami-me pdf dark], body["tags"]
    assert_equal "https://sh.turtletech.us/Abc123", result.table.dig("rm2-ss", "dark")
    assert_equal 1, result.created
    assert_equal 0, result.replayed
    assert_empty result.errors
  end

  def test_replay_is_200
    @status = 200
    entries = { "rm2-ss" => { "title" => "x", "files" => { "light" => "x" } } }
    result = @minter.mint(entries)
    assert_equal 1, result.replayed
    assert_equal 0, result.created
  end

  def test_rejects_non_short_host
    poster = lambda { |_u, _h, _b| [201, { "public_url" => "https://example.com/nope" }] }
    minter = PostPdf::AnticsLinks.new(token: "k", post: poster)
    result = minter.mint("a" => { "title" => "A", "files" => { "dark" => "a-dark.pdf" } })
    assert_equal 1, result.errors.size
    assert_match(/unexpected public_url/, result.errors[0]["error"])
  end

  def test_write_json
    dir = Dir.mktmpdir("antics-links")
    path = File.join(dir, "pdf-links.json")
    @minter.write_json!(path, "rm2-ss" => { "dark" => "https://sh.turtletech.us/Abc123" })
    data = JSON.parse(File.read(path))
    assert_equal "https://sh.turtletech.us/Abc123", data.dig("rm2-ss", "dark")
  ensure
    FileUtils.remove_entry(dir)
  end
end
