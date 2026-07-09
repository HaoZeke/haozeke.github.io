# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "tmpdir"
require "json"

ROOT = File.expand_path("../..", __dir__)
$LOAD_PATH.unshift(File.join(ROOT, "lib"))
require "post_pdf"
