# frozen_string_literal: true

require "rake"
require "image_optim"

# Variables
ORG_FILES = Rake::FileList.new("content-org/**/*.*org") do |fl|
  fl.exclude("**/tmp/*")
  fl.exclude("**/*.Rorg")
end

# Debug
Rake.application.options.trace_rules = true
oxTmp = Dir.pwd + "/.tmp/ox-hugo-dev"
oxSetup = Dir.pwd + "/setup"
rgScripts = Dir.pwd + "/scripts"

# Global
image_optim = ImageOptim.new(skip_missing_workers: true)

# Tasks
task default: :hugoServe

desc "Clean the generated content"
task :clean do
  rm_rf "public"
  rm_rf "content"
end

desc "Install pandoc"
task :getPandoc do
  sh "./scripts/getPandocVersion 2.10.1"
end

desc "Serve site with Hugo"
task :hugoServe, [:port] => [:md] do |_t, args|
  args.with_defaults(port: "1337")
  sh "hugo server --port #{args.port} --buildDrafts --buildFuture --navigateToChanged"
end

desc "Build site with Hugo"
task :hugoBuild, [:cachedir] => %i[md postPdf postPdfMintLinks] do |_t, args|
  args.with_defaults(cachedir: "$(pwd)/cacheDir/images")
  sh "hugo --minify --enableGitInfo --gc --buildFuture --cacheDir #{args.cachedir}"
end

desc "Orgmode to markdown with Emacs"
task md: ORG_FILES.ext(".md")

rule ".md" => ->(f) { source_for_md(f) } do |t|
  file t.name => t.source do
    `#{rgScripts}/mkMD.sh #{t.source} #{oxSetup} #{oxTmp}`
  end
  Rake::Task[t.name].invoke
end

# For zsh:
# rake optImages\[content-org\]
desc "Optimize images"
task :optImages, [:sources] do |_t, args|
  args.with_defaults(sources: "public")
  image_optim.optimize_images!(Dir.glob("#{args.sources}**/**/*.{png,jpg,jpeg,svg,gif}")) do |unoptimized, optimized|
    puts "Testing #{unoptimized}"
    puts "==> Optimized inplace" if optimized
  end
end

# --- Post PDF (Ruby, incremental, unit-tested) ---

$LOAD_PATH.unshift(File.expand_path("lib", __dir__))

desc "Unit tests for post PDF generator (no chromium)"
task :test_post_pdf do
  ruby "-Ilib:test", "test/post_pdf/run.rb"
end

def post_pdf_out_dir
  File.expand_path(ENV.fetch("POST_PDF_OUT", "static/pdf"), Dir.pwd)
end

def post_pdf_branch
  ENV.fetch("POST_PDF_BRANCH", PostPdf::OrphanBranch::DEFAULT_BRANCH)
end

desc "Restore PDFs from orphan branch for incremental rebuild"
task :postPdfRestore do
  require "post_pdf"
  skip = ENV["POST_PDF_SKIP"] == "1"
  if skip
    puts "postPdfRestore: skipped (POST_PDF_SKIP=1)"
    next
  end

  branch = post_pdf_branch
  out = post_pdf_out_dir
  orphan = PostPdf::OrphanBranch.new(
    source_dir: out,
    branch: branch,
    remote_url: ENV["POST_PDF_REMOTE_URL"]
  )
  result = orphan.restore!
  if result[:skipped]
    puts "postPdfRestore: no #{branch} yet (#{result[:reason]})"
  else
    puts "postPdfRestore: restored #{result[:restored]} files from #{branch}"
  end
end

desc "Export public write-access JSON from full inventory (aggregates keep private counts; names public-only)"
task :writeAccessExport do
  require "post_pdf"
  result = PostPdf::WriteAccess.export!(root: Dir.pwd)
  if result[:skipped]
    puts "writeAccessExport: skipped (#{result[:reason]})"
  else
    puts "writeAccessExport: #{result[:total]} total · #{result[:public_total]} public · #{result[:private_total]} private → #{result[:public_path]}"
  end
end

desc "Build per-page light/dark PDFs (incremental; needs chromium)"
task postPdf: %i[postPdfRestore writeAccessExport] do
  require "post_pdf"
  force = ENV["POST_PDF_FORCE"] == "1"
  skip = ENV["POST_PDF_SKIP"] == "1"
  if skip
    puts "postPdf: skipped (POST_PDF_SKIP=1)"
    next
  end

  printer = PostPdf::Chromium.new
  unless printer.available?
    warn "postPdf: chromium not found — skipping PDF generation (set POST_PDF_SKIP=1 to silence)"
    next
  end

  builder = PostPdf::Builder.new(
    root: Dir.pwd,
    out_dir: post_pdf_out_dir,
    force: force,
    printer: printer
  )
  result = builder.run
  puts "postPdf: built=#{result.built.size} skipped=#{result.skipped.size} removed=#{result.removed.size} errors=#{result.errors.size}"
  result.built.first(10).each { |s| puts "  + #{s}" }
  puts "  … #{result.built.size - 10} more" if result.built.size > 10
  result.errors.each { |e| warn "  ! #{e["slug"]}: #{e["error"]}" }
  abort "postPdf: #{result.errors.size} error(s)" unless result.errors.empty?
end

desc "Force rebuild all post PDFs"
task :postPdfForce do
  ENV["POST_PDF_FORCE"] = "1"
  Rake::Task[:postPdf].invoke
end

desc "Mint Antics native short links for PDF files (needs ANTICS_API_KEY)"
task :postPdfMintLinks do
  require "post_pdf"
  require "json"

  token = ENV["ANTICS_API_KEY"].to_s.strip
  if token.empty?
    puts "postPdfMintLinks: skipped (ANTICS_API_KEY unset)"
    next
  end

  index_path = File.join(post_pdf_out_dir, "index.json")
  unless File.file?(index_path)
    warn "postPdfMintLinks: no #{index_path} — nothing to mint"
    next
  end

  index = JSON.parse(File.read(index_path))
  entries = index["entries"] || {}
  PostPdf::AnticsLinks.enrich_years!(entries, root: Dir.pwd)
  minter = PostPdf::AnticsLinks.new(token: token)
  result = minter.mint(entries)
  dest = File.expand_path(ENV.fetch("POST_PDF_LINKS", "data/pdf-links.json"), Dir.pwd)
  FileUtils.mkdir_p(File.dirname(dest))
  minter.write_json!(dest, result.table)
  puts "postPdfMintLinks: created=#{result.created} replayed=#{result.replayed} errors=#{result.errors.size} → #{dest}"
  result.errors.each { |e| warn "  ! #{e["slug"]}/#{e["theme"]}: #{e["error"]}" }
  abort "postPdfMintLinks: #{result.errors.size} error(s)" unless result.errors.empty?
end

desc "Force-push static/pdf to orphan branch (single commit; CV pdfs pattern)"
task :postPdfPublish do
  require "post_pdf"
  skip = ENV["POST_PDF_SKIP"] == "1"
  if skip
    puts "postPdfPublish: skipped (POST_PDF_SKIP=1)"
    next
  end

  out = post_pdf_out_dir
  pdf_count = Dir.glob(File.join(out, "*.pdf")).size
  if pdf_count.zero?
    warn "postPdfPublish: no PDFs in #{out} — nothing to publish"
    next
  end

  branch = post_pdf_branch
  orphan = PostPdf::OrphanBranch.new(
    source_dir: out,
    branch: branch,
    remote_url: ENV["POST_PDF_REMOTE_URL"]
  )
  result = orphan.publish!
  puts "postPdfPublish: force-pushed #{result[:pdfs]} PDFs → #{result[:branch]} (#{result[:message]})"
end

# From https://avdi.codes/rake-part-3-rules/
def source_for_md(md_file)
  ORG_FILES.detect { |f| f.ext("") == md_file.ext("") }
end
