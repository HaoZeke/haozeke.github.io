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

# PANDOC ?= pandoc
# PANDOC_exists := $(shell command -v $(PANDOC) 2> /dev/null)
# ifeq ("$(PANDOC_exists)","")
	PANDOC := $(ox_hugo_tmp_dir)/pandoc/bin/pandoc
	PANDOC_CITEPROC := $(ox_hugo_tmp_dir)/pandoc/bin/pandoc-citeproc
# endif

HUGO_BIN_SOURCE ?= https://gitlab.com/kaushalmodi/unofficial-hugo-dev-builds.git
HUGO_VERSION ?= DEV

PANDOC_BIN_VERSION ?= 2.10.1
PANDOC_ARCHIVE_NAME ?= pandoc-$(PANDOC_BIN_VERSION)-linux-amd64.tar.gz
PANDOC_BIN_SOURCE ?= https://github.com/jgm/pandoc/releases/download/$(PANDOC_BIN_VERSION)

# Set paths
.EXPORT_ALL_VARIABLES:

PATH = $(ox_hugo_tmp_dir)/pandoc:$(PATH)

# baseURL value set via environment variable HUGO_BASEURL
HUGO_BASEURL ?= http://localhost

# Directory containing the Hugo site's config.toml
HUGO_BASE_DIR=./
# Other hugo arguments
HUGO_ARGS=

# Port for hugo server
PORT=1337

# Directory with the setup-ox-hugo.el
OX_HUGO_SETUP_DIR=$(shell pwd)/setup

# Directory containing Org files for the test site
OX_HUGO_CONTENT_ORG_DIR=$(HUGO_BASE_DIR)/content-org
# https://stackoverflow.com/a/3774731/1219634
# Note that the use of immediate assignment := rather than recursive
# assignment = is important here: you do not want to be running the
# shell escape every time SOURCES is inspected by make.

# Path to the Org files (relative to pwd, or absolute)
ORG_FILE:=$(shell find content-org -name "*.*org" -not -path "**/tmp/*")
#$(filter-out $(wildcard $(OX_HUGO_CONTENT_ORG_DIR)/tmp/*.org),$(ALL_ORG))
# Levels
# LVL_TWO:=$(wildcard $(OX_HUGO_CONTENT_ORG_DIR)/**/**/*.org)
# LVL_ONE:=$(wildcard $(OX_HUGO_CONTENT_ORG_DIR)/**/*.org)
# MAIN_ORG:=$(OX_HUGO_CONTENT_ORG_DIR)/all-posts.org
# ALL_ORG:=$(MAIN_ORG)$(LVL_ONE)$(LVL_TWO)

# Function to be run in emacs --batch
FUNC=

.PHONY: help emacs-batch md1 \
	hugo serve clean md

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
	(load-file (expand-file-name \"setup-ox-hugo.el\" \"$(OX_HUGO_SETUP_DIR)\"))\
	)" $(ORG_FILE) \
	-f $(FUNC) \
	--kill

md1:
	for org in $(ORG_FILE) ; do \
	make emacs-batch ORG_FILE=$$org FUNC=org-hugo-export-all-wim-to-md ; \
    done

vcheck_emacs:
	@mkdir -p $(ox_hugo_tmp_dir)
ifeq ("$(EMACS_exists)","")
	@$(CURL) -O $(EMACS_BIN_SOURCE)/emacs-bin-$(EMACS_BIN_VERSION).tar.gz
	@tar xf emacs-bin-$(EMACS_BIN_VERSION).tar.gz -C /
endif
	@echo "Emacs binary used: $(EMACS)"
	@$(EMACS) --batch --eval "(progn\
	(setenv \"OX_HUGO_TMP_DIR\" \"$(ox_hugo_tmp_dir)\")\
	(load-file (expand-file-name \"setup-ox-hugo.el\" \"$(OX_HUGO_SETUP_DIR)\"))\
	(message \"[Version check] Emacs %s\" emacs-version)\
	(message \"[Version check] %s\" (org-version nil :full))\
	)" \
	--kill

vcheck_hugo:
	@mkdir -p $(ox_hugo_tmp_dir)
ifeq ("$(HUGO_exists)","")
	@mkdir -p $(ox_hugo_tmp_dir)/hugo
	@find $(ox_hugo_tmp_dir)/hugo -maxdepth 1 -type d -name bin -exec rm -rf "{}" \;
	@git clone $(HUGO_BIN_SOURCE) $(ox_hugo_tmp_dir)/hugo/bin
	@tar xf $(ox_hugo_tmp_dir)/hugo/bin/hugo_DEV-Linux-64bit.tar.xz -C $(ox_hugo_tmp_dir)/hugo/bin
endif
	$(HUGO) version

vcheck_pandoc:
	@mkdir -p $(ox_hugo_tmp_dir)
# ifeq ("$(PANDOC_exists)","")
	@mkdir -p $(ox_hugo_tmp_dir)/pandoc
	@find $(ox_hugo_tmp_dir)/pandoc -maxdepth 1 -type d -name bin -exec rm -rf "{}" \;
	@$(CURL) -O $(PANDOC_BIN_SOURCE)/$(PANDOC_ARCHIVE_NAME)
	@tar xf $(PANDOC_ARCHIVE_NAME)
	@mv pandoc-$(PANDOC_BIN_VERSION)/bin $(ox_hugo_tmp_dir)/pandoc/.
	@rm -rf pandoc-$(PANDOC_BIN_VERSION)
# endif
	$(PANDOC) --version
	pandoc --version
	pandoc-citeproc --version
	$(PANDOC_CITEPROC) --version

vcheck: vcheck_emacs vcheck_hugo vcheck_pandoc

hugo: vcheck_hugo
	@cd $(HUGO_BASE_DIR) && $(HUGO) $(HUGO_ARGS)

md:
	@$(MAKE_) vcheck md1 hugo

serve server:
	@$(MAKE_) md1
	@echo "Serving the site on $(HUGO_BASEURL):$(PORT) .."
	@cd $(HUGO_BASE_DIR) && $(HUGO) server --port $(PORT) --buildDrafts --buildFuture --navigateToChanged

clean:
	@rm -rf public
