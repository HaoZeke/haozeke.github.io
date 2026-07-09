# frozen_string_literal: true

require "json"
require "fileutils"
require "time"

module PostPdf
  # Full write-access inventory → public artifact.
  #
  # Public file keeps aggregate metrics (including private *counts*) but
  # never private repository names or details. PDF and site JS both read
  # the public artifact only.
  module WriteAccess
    module_function

    FULL_RELATIVE = [
      "data/write-access.full.json",
      ".tmp/write-access.full.json"
    ].freeze

    PUBLIC_RELATIVE = "static/data/write-access.json"
    PACKAGES_YAML = "data/packages.yaml"

    REPO_PUBLIC_KEYS = %w[name full_name access url].freeze

    def private_repo?(repo)
      return true if repo.nil?

      val = repo["private"]
      val == true || val.to_s.strip.downcase == "true"
    end

    def find_full_path(root)
      FULL_RELATIVE.each do |rel|
        path = File.join(root, rel)
        return path if File.file?(path)
      end
      env = ENV["WRITE_ACCESS_FULL"]
      return env if env && !env.empty? && File.file?(env)

      nil
    end

    def default_public_path(root)
      File.join(root, PUBLIC_RELATIVE)
    end

    # Pure transform: full inventory Hash → public inventory Hash.
    def public_payload(full)
      raise ArgumentError, "full inventory must be a Hash" unless full.is_a?(Hash)

      out = {
        "generated" => full["generated"] || Time.now.utc.strftime("%Y-%m-%d"),
        "total" => 0,
        "public_total" => 0,
        "private_total" => 0,
        "org_count" => 0,
        "forge_count" => 0,
        "notables" => public_notables(Array(full["notables"])),
        "forges" => []
      }

      Array(full["forges"]).each do |forge|
        f = public_forge(forge)
        next unless f

        out["forges"] << f
        out["total"] += f["total"]
        out["public_total"] += f["public_total"]
        out["private_total"] += f["private_total"]
      end

      out["forge_count"] = out["forges"].size
      out["org_count"] = out["forges"].sum { |f| f["org_count"] }
      assert_public!(out)
      out
    end

    def public_notables(notables)
      notables
        .reject { |n| private_repo?(n) }
        .map { |n| n.select { |k, _| REPO_PUBLIC_KEYS.include?(k) || %w[forge name full_name access url].include?(k) } }
        .map { |n| n.slice(*%w[name full_name access url forge]) }
    end

    def public_forge(forge)
      orgs = []
      total = public_n = private_n = 0

      Array(forge["orgs"]).each do |org|
        o = public_org(org, forge)
        next unless o

        orgs << o
        total += o["count"]
        public_n += o["public_count"]
        private_n += o["private_count"]
      end
      return nil if orgs.empty?

      orgs.sort_by! { |o| -o["count"] }
      {
        "id" => forge["id"],
        "name" => forge["name"] || forge["id"],
        "host" => forge["host"],
        "total" => total,
        "public_total" => public_n,
        "private_total" => private_n,
        "org_count" => orgs.size,
        "orgs" => orgs
      }
    end

    def public_org(org, forge)
      repos = Array(org["repos"])
      public_repos = repos.reject { |r| private_repo?(r) }.map { |r| public_repo(r) }
      private_count = repos.count { |r| private_repo?(r) }
      public_count = public_repos.size
      count = public_count + private_count
      return nil if count.zero?

      public_repos.sort_by! { |r| (r["name"] || "").downcase }
      {
        "org" => org["org"],
        "count" => count,
        "public_count" => public_count,
        "private_count" => private_count,
        "forge" => org["forge"] || forge["id"],
        "host" => org["host"] || forge["host"],
        "url" => org["url"],
        "repos" => public_repos
      }
    end

    def public_repo(repo)
      out = {}
      REPO_PUBLIC_KEYS.each do |k|
        out[k] = repo[k] if repo.key?(k) && !repo[k].nil?
      end
      out
    end

    # Raise if any private name or private:true slipped into the public payload.
    def assert_public!(payload)
      Array(payload["forges"]).each do |forge|
        Array(forge["orgs"]).each do |org|
          Array(org["repos"]).each do |repo|
            if private_repo?(repo)
              raise "public write-access payload still has private:true (#{org["org"]}/#{repo["name"]})"
            end
          end
        end
      end
      true
    end

    # Write public JSON. Optionally sync data/packages.yaml upstream counts.
    def export!(root:, full_path: nil, public_path: nil, sync_yaml: true)
      root = File.expand_path(root)
      full_path ||= find_full_path(root)
      return { skipped: true, reason: "no full inventory (looked for #{FULL_RELATIVE.join(", ")})" } unless full_path

      public_path ||= default_public_path(root)
      full = JSON.parse(File.read(full_path))
      payload = public_payload(full)

      FileUtils.mkdir_p(File.dirname(public_path))
      File.write(public_path, JSON.pretty_generate(payload) + "\n")

      yaml_path = File.join(root, PACKAGES_YAML)
      sync_packages_yaml!(yaml_path, payload) if sync_yaml && File.file?(yaml_path)

      {
        skipped: false,
        full_path: full_path,
        public_path: public_path,
        total: payload["total"],
        public_total: payload["public_total"],
        private_total: payload["private_total"],
        org_count: payload["org_count"],
        forge_count: payload["forge_count"]
      }
    end

    # Update only the numeric upstream totals in packages.yaml (no full rewrite).
    def sync_packages_yaml!(yaml_path, payload)
      text = File.read(yaml_path)
      # upstream: block until retired:
      unless text =~ /^upstream:\n/m
        return false
      end

      text2 = text.sub(/(^upstream:\n)(.*?)(?=^retired:|\z)/m) do
        head = Regexp.last_match(1)
        block = Regexp.last_match(2)
        block = block.sub(/^(  total: )\d+/) { "#{Regexp.last_match(1)}#{payload["total"]}" }
        block = block.sub(/^(  org_count: )\d+/) { "#{Regexp.last_match(1)}#{payload["org_count"]}" }
        block = block.sub(/^(  forge_count: )\d+/) { "#{Regexp.last_match(1)}#{payload["forge_count"]}" }
        Array(payload["forges"]).each do |forge|
          fid = Regexp.escape(forge["id"].to_s)
          block = block.sub(
            /(- id: #{fid}\n(?:.*\n)*?    total: )\d+/
          ) { "#{Regexp.last_match(1)}#{forge["total"]}" }
          block = block.sub(
            /(- id: #{fid}\n(?:.*\n)*?    org_count: )\d+/
          ) { "#{Regexp.last_match(1)}#{forge["org_count"]}" }
        end
        head + block
      end
      File.write(yaml_path, text2) if text2 != text
      true
    end
  end
end
