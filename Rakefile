require 'rake'
# Variables
ORG_FILES = Rake::FileList.new("content-org/**/*.*org") do |fl| 
  fl.exclude("**/tmp/*")
end

oxTmp=Dir.pwd+"/.tmp/ox-hugo-dev"
oxSetup=Dir.pwd+"/setup"

# Debug
# puts ORG_FILES
# puts oxSetup
# puts oxTmp
Rake.application.options.trace_rules = true

# Tasks
task :default => :hugoServe

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
task :hugoServe, [:port] => [:md] do |t, args|
  args.with_defaults(:port => "1337")
  sh "hugo server --port #{args.port} --buildDrafts --buildFuture --navigateToChanged"
end

desc "Build site with Hugo"
task :hugoBuild => ["md"] do
  sh "hugo --minify --enableGitInfo"
end

desc "Orgmode to markdown with Emacs"
task :md => ORG_FILES.ext(".md")
rule ".md" => ->(f){source_for_md(f)} do |t|
  %x(./scripts/mkMD.sh #{t.source} \
                     #{oxSetup} \
                     #{oxTmp}
                     )
end
# 50.7 with -m
# 33.8 without
# 53 with multitask

# From https://avdi.codes/rake-part-3-rules/
def source_for_md(md_file)
  ORG_FILES.detect{|f| f.ext('') == md_file.ext('')}
end
