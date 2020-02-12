# Makefile to export org documents to md for Hugo from the command
# line.
#
# Run "make" to see the help for this Makefile.

MAKE_ := $(MAKE) -j1 --no-print-directory

CURL ?= curl -fsSkL --retry 9 --retry-delay 9

USER ?= me
OX_HUGO_TMP_DIR_BASE ?= /tmp/$(USER)
ox_hugo_tmp_dir ?= $(OX_HUGO_TMP_DIR_BASE)/ox-hugo-dev

ifdef INSIDE_EMACS
	EMACS := $(shell which emacs)
else
	EMACS ?= emacs
endif

EMACS_exists := $(shell command -v $(EMACS) 2> /dev/null)
ifeq ("$(EMACS_exists)","")
	EMACS := /tmp/emacs/bin/emacs
endif

EMACS_BIN_SOURCE ?= https://github.com/npostavs/emacs-travis/releases/download/bins
EMACS_BIN_VERSION ?= 26

HUGO ?= hugo
HUGO_exists := $(shell command -v $(HUGO) 2> /dev/null)
ifeq ("$(HUGO_exists)","")
	HUGO := $(ox_hugo_tmp_dir)/hugo/bin/hugo
endif

HTMLTEST ?= htmltest
HTMLTEST_exists := $(shell command -v $(HTMLTEST) 2> /dev/null)
ifeq ("$(HTMLTEST_exists)","")
	HTMLTEST := $(ox_hugo_tmp_dir)/htmltest/bin/htmltest
endif

PANDOC ?= pandoc
PANDOC_exists := $(shell command -v $(PANDOC) 2> /dev/null)
ifeq ("$(PANDOC_exists)","")
	PANDOC := $(ox_hugo_tmp_dir)/pandoc/bin/pandoc
endif

HUGO_BIN_SOURCE ?= https://gitlab.com/kaushalmodi/unofficial-hugo-dev-builds.git
HUGO_VERSION ?= DEV

PANDOC_BIN_VERSION ?= 2.6
PANDOC_ARCHIVE_NAME ?= pandoc-$(PANDOC_BIN_VERSION)-linux.tar.gz
PANDOC_BIN_SOURCE ?= https://github.com/jgm/pandoc/releases/download/$(PANDOC_BIN_VERSION)

# baseURL value set via environment variable HUGO_BASEURL
HUGO_BASEURL ?= http://localhost

# Directory containing the Hugo site's config.toml
HUGO_BASE_DIR=./
# Other hugo arguments
HUGO_ARGS=

# Port for hugo server
PORT=1337

# ox-hugo test directory; also contains the setup-ox-hugo.el
OX_HUGO_TEST_DIR=$(shell pwd)/test

# Directory containing Org files for the test site
OX_HUGO_TEST_ORG_DIR=$(HUGO_BASE_DIR)/content-org
# https://stackoverflow.com/a/3774731/1219634
# Note that the use of immediate assignment := rather than recursive
# assignment = is important here: you do not want to be running the
# shell escape every time SOURCES is inspected by make.

# Path to the Org file (relative to pwd, or absolute)
ORG_FILE=content-org/all-posts.org

# Function to be run in emacs --batch
FUNC=

.PHONY: help emacs-batch md1 \
	hugo serve clean

help:
	@echo "Help for command-line Org->Markdown for Hugo Exporter"
	@echo "====================================================="
	@echo " make md            <-- Only export the test Org files to Markdown, no checks"
	@echo " make hugo          <-- Run hugo"
	@echo " make serve         <-- Run the hugo server on http://localhost:$(PORT)"
	@echo " make clean         <-- Delete the Hugo public/ directory"
	@echo " make               <-- Show this help"

# Note: The Org file from $(ORG_FILE) is loaded *after* the --eval
# section gets evaluated i.e. --eval '(progn ..)' $(ORG_FILE) If the
# order is reversed i.e. i.e.$(ORG_FILE) --eval '(progn ..)', the act
# of loading the $(ORG_FILE) file first will load the older Org
# version that ships with Emacs and then run the stuff in --eval that
# loads the new Org version.. and thus we'll end up with mixed Org in
# the load-path.
emacs-batch:
	@echo ""
	@echo "$(ORG_FILE) ::"
	@$(EMACS) --batch --eval "(progn\
	(setenv \"OX_HUGO_TMP_DIR\" \"$(ox_hugo_tmp_dir)\")\
	(load-file (expand-file-name \"setup-ox-hugo.el\" \"$(OX_HUGO_TEST_DIR)\"))\
	)" $(ORG_FILE) \
	-f $(FUNC) \
	--kill

md1:
	@$(MAKE_) emacs-batch FUNC=org-hugo-export-all-wim-to-md

hugo:
	@cd $(HUGO_BASE_DIR) && $(HUGO) $(HUGO_ARGS)

md:
	@$(MAKE_) md1 hugo

serve server:
	@echo "Serving the site on $(HUGO_BASEURL):$(PORT) .."
	@cd $(HUGO_BASE_DIR) && $(HUGO) server --port $(PORT) --buildDrafts --buildFuture --navigateToChanged

clean:
	@rm -rf public
