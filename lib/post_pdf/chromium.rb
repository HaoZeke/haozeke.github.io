# frozen_string_literal: true

require "fileutils"
require "open3"
require "rbconfig"

module PostPdf
  # Thin wrapper around headless Chromium for HTML → PDF.
  class Chromium
    class Error < StandardError; end

    CANDIDATES = %w[
      chromium
      chromium-browser
      google-chrome
      google-chrome-stable
      chrome
    ].freeze

    def initialize(binary: nil)
      @binary = binary || self.class.find_binary
    end

    def available?
      !@binary.nil? && File.executable?(@binary)
    end

    def self.find_binary
      CANDIDATES.each do |name|
        path = capture_which(name)
        return path if path && !path.empty?
      end
      nil
    end

    def self.capture_which(name)
      out, status = Open3.capture2("which", name)
      return nil unless status.success?

      out.strip
    rescue Errno::ENOENT
      nil
    end

    def print(html_path, pdf_path)
      raise Error, "chromium not available" unless available?

      abs_html = File.expand_path(html_path)
      abs_pdf = File.expand_path(pdf_path)
      FileUtils.mkdir_p(File.dirname(abs_pdf))

      uri = "file://#{abs_html}"
      # virtual-time-budget: allow async MathJax + remote images to settle
      budget = ENV.fetch("POST_PDF_VIRTUAL_TIME_MS", "20000")
      cmd = [
        @binary,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--disable-extensions",
        "--no-first-run",
        "--hide-scrollbars",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=#{budget}",
        "--allow-file-access-from-files",
        "--print-to-pdf=#{abs_pdf}",
        uri
      ]

      _stdout, stderr, status = Open3.capture3(*cmd)
      raise Error, "chromium failed (#{status.exitstatus}): #{stderr}" unless status.success?
      raise Error, "PDF not written: #{abs_pdf}" unless File.file?(abs_pdf) && File.size(abs_pdf).positive?

      abs_pdf
    end
  end
end
