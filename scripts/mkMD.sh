#!/usr/bin/env sh
#
# Usage: 1 is the file,
#        2 is the orgmode setup file,
#        3 is the temporary directory

emacs --batch --eval \
	"(progn (setenv \"OX_HUGO_TMP_DIR\" \"$3\") \
    (load-file (expand-file-name \"setup-ox-hugo.el\" \"$2\" )))" \
	$1 -f org-hugo-export-all-wim-to-md --kill
