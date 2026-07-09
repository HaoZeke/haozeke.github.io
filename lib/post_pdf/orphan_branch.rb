# frozen_string_literal: true

require "fileutils"
require "open3"
require "tmpdir"
require "time"

module PostPdf
  # Store generated PDFs on a single-commit orphan branch (rgCV `pdfs` pattern).
  # Source tree never holds PDF binaries; each publish force-pushes a fresh orphan tip.
  class OrphanBranch
    class Error < StandardError; end

    DEFAULT_BRANCH = "post-pdfs"
    GLOB = ["*.pdf", "index.json", ".manifest.json"].freeze

    attr_reader :source_dir, :branch, :remote, :remote_url

    def initialize(source_dir:, branch: DEFAULT_BRANCH, remote: "origin", remote_url: nil)
      @source_dir = File.expand_path(source_dir)
      @branch = branch
      @remote = remote
      @remote_url = remote_url
    end

    # Copy artifacts from remote orphan branch into source_dir (for incremental rebuild).
    # No-op if the branch does not exist yet.
    def restore!
      FileUtils.mkdir_p(@source_dir)
      url = resolve_remote_url
      Dir.mktmpdir("post-pdf-restore-") do |tmp|
        run!(["git", "init", "-q"], chdir: tmp)
        run!(["git", "remote", "add", "origin", url], chdir: tmp)
        _out, status = Open3.capture2e("git", "fetch", "--depth=1", "origin", @branch, chdir: tmp)
        unless status.success?
          return { restored: 0, skipped: true, reason: "branch missing or fetch failed" }
        end

        run!(["git", "checkout", "-q", "FETCH_HEAD"], chdir: tmp)
        n = 0
        GLOB.each do |pattern|
          Dir.glob(File.join(tmp, pattern)).each do |path|
            next unless File.file?(path)

            dest = File.join(@source_dir, File.basename(path))
            FileUtils.cp(path, dest)
            n += 1
          end
        end
        { restored: n, skipped: false }
      end
    end

    # Force-push source_dir contents as a brand-new orphan commit on +branch+.
    def publish!(message: nil)
      pdfs = Dir.glob(File.join(@source_dir, "*.pdf"))
      raise Error, "no PDFs in #{@source_dir}" if pdfs.empty?

      message ||= "Update post PDFs (#{Time.now.utc.strftime("%Y-%m-%d")})"
      url = resolve_remote_url

      Dir.mktmpdir("post-pdf-publish-") do |tmp|
        run!(["git", "init", "-q"], chdir: tmp)
        run!(["git", "checkout", "--orphan", @branch], chdir: tmp)

        GLOB.each do |pattern|
          Dir.glob(File.join(@source_dir, pattern)).each do |path|
            next unless File.file?(path)

            FileUtils.cp(path, File.join(tmp, File.basename(path)))
          end
        end

        File.write(File.join(tmp, "README.md"), branch_readme)

        run!(["git", "add", "-A"], chdir: tmp)
        env = {
          "GIT_AUTHOR_NAME" => "post-pdf-bot",
          "GIT_AUTHOR_EMAIL" => "bot@users.noreply.github.com",
          "GIT_COMMITTER_NAME" => "post-pdf-bot",
          "GIT_COMMITTER_EMAIL" => "bot@users.noreply.github.com"
        }
        run!(
          [
            "git",
            "-c", "user.name=post-pdf-bot",
            "-c", "user.email=bot@users.noreply.github.com",
            "commit", "-m", message
          ],
          chdir: tmp,
          env: env
        )

        run!(["git", "remote", "add", "origin", url], chdir: tmp)
        run!(["git", "push", "-f", "origin", "HEAD:#{@branch}"], chdir: tmp)

        count = Dir.glob(File.join(tmp, "*.pdf")).size
        { branch: @branch, pdfs: count, message: message }
      end
    end

    def resolve_remote_url
      return @remote_url if @remote_url && !@remote_url.empty?

      out, status = Open3.capture2("git", "remote", "get-url", @remote)
      raise Error, "cannot resolve remote #{@remote}" unless status.success?

      out.strip
    end

    def branch_readme
      <<~MD
        # post-pdfs

        Orphan branch of generated light/dark page PDFs for rgoswami.me.
        Single commit, force-pushed on each successful site build (same pattern
        as the CV repo `pdfs` branch).

        Do not edit by hand. Source of truth is the `src` branch builder
        (`lib/post_pdf`, `rake postPdf`).
      MD
    end

    def run!(argv, chdir:, env: {})
      full_env = ENV.to_h.merge(env)
      out, status = Open3.capture2e(full_env, *argv, chdir: chdir)
      raise Error, "command failed: #{argv.inspect}\n#{out}" unless status.success?

      out
    end
  end
end
