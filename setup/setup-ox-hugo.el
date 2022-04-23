;;; package --- Setup ox-hugo preliminaries

;; Copyright (C) 2021 Rohit Goswami

;; Author: Rohit Goswami <rohit[dot]goswami[at]aol[dot]com>
;; Keywords: use-package, ox-hugo, org-mode
;; License: MIT

;;; Commentary:

;; Setup to export Org files to Hugo-compatible Markdown using
;; `ox-hugo' in an "emacs -Q" environment.

;;; Code:
(require 'package)
(setq package-enable-at-startup nil)
(unless package-archive-contents
  (setq package-archives
        '(("melpa" . "https://melpa.org/packages/")
          ("gnu" . "http://elpa.gnu.org/packages/")
          ("nongnu" . "https://elpa.nongnu.org/nongnu/")
     ))
  (package-refresh-contents)
  )
(package-initialize)

;; Install and setup use-package
(unless (package-installed-p 'use-package)
  (package-refresh-contents)
  (package-install 'use-package)
  )

(eval-when-compile
  (require 'use-package))
;; Always install things here
(require 'use-package-ensure)
(setq use-package-always-ensure t)

;; Get more dependencies
(use-package org)
(use-package org-contrib)
(use-package htmlize)
(use-package lua-mode)
(use-package ox-hugo)

(require 'ox-hugo)
;; Some sane settings
(setq-default require-final-newline t)
(setq-default indent-tabs-mode nil)
(setq-default make-backup-files nil)

;; Toggle debug on error, including `user-error'.
(setq debug-ignored-errors (remq 'user-error debug-ignored-errors))
(toggle-debug-on-error)

(defun org-hugo-export-all-wim-to-md ()
  (org-hugo-export-wim-to-md :all-subtrees nil nil :noerror))

;; Allow setting few vars in Local Variables in the test files.
(put 'org-hugo-auto-set-lastmod 'safe-local-variable 'booleanp)
(put 'org-hugo-suppress-lastmod-period 'safe-local-variable 'floatp)

(with-eval-after-load 'org
  ;; Allow multiple line Org emphasis markup
  ;; http://emacs.stackexchange.com/a/13828/115
  (setcar (nthcdr 4 org-emphasis-regexp-components) 20) ;Up to 20 lines, default is just 1
  ;; Below is needed to apply the modified `org-emphasis-regexp-components'
  ;; settings from above.
  (org-set-emph-re 'org-emphasis-regexp-components org-emphasis-regexp-components)

  ;; Prevent prompts like:
  ;;   Non-existent agenda file
  (defun org-check-agenda-file (file))

  (let (ob-lang-alist)
    (add-to-list 'ob-lang-alist '(emacs-lisp . t))
    (add-to-list 'ob-lang-alist '(org . t))
    (org-babel-do-load-languages 'org-babel-load-languages ob-lang-alist))

  (with-eval-after-load 'ob-core
    (defun ox-hugo-org-confirm-babel-evaluate-fn (lang body)
      "Mark `org' as a safe language for ox-hugo tests and docs."
      (let* ((ob-enabled-langs '("org"))
             (ob-enabled-langs-re (regexp-opt ob-enabled-langs 'words))
             (unsafe t)) ;Set the return value `unsafe' to t by default
        (when (string-match-p ob-enabled-langs-re lang)
          (setq unsafe nil))
        unsafe))
    (setq org-confirm-babel-evaluate #'ox-hugo-org-confirm-babel-evaluate-fn))

  (with-eval-after-load 'ox
    (setq org-export-headline-levels 4))) ;default is 3
(provide 'setup-ox-hugo)
;;; setup-ox-hugo.el ends here
