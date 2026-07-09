# frozen_string_literal: true

require "digest"
require "json"
require_relative "version"

module PostPdf
  # Stable content digest for incremental rebuild decisions.
  module Fingerprint
    module_function

    def file_sha256(path)
      Digest::SHA256.file(path).hexdigest
    end

    def string_sha256(str)
      Digest::SHA256.hexdigest(str.to_s)
    end

    # Inputs that affect the rendered PDF (not just the source).
    def document_digest(parts)
      payload = {
        "template_version" => TEMPLATE_VERSION,
        "parts" => parts
      }
      string_sha256(JSON.generate(payload))
    end
  end
end
