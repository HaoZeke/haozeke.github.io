---
title: "Anki Decks with Orgmode"
author: ["Rohit Goswami"]
date: 2020-10-27T01:05:00+00:00
lastmod: 2020-11-22T17:06:23+00:00
tags: ["workflow", "projects", "tools", "emacs", "orgmode"]
categories: ["programming"]
draft: false
toc: true
comments: true
---

> Setting up unicode math and `orgmode` for painless Anki deck building

## Background {#background}

A recent [Hacker News post](https://news.ycombinator.com/item?id=24878171) reminded me of [Anki](https://docs.ankiweb.net/#/getting-started), and that brought back memories of
my Anki `orgmode` setup. I thought I'd re-create and immortalize it.

The standard way of working with Anki, is with a pretty awkward GUI. There are
changes to be made here, which make life a little easier, including the setup of
custom cards, but the inherent concerns of the WYSIWYG editor are basically
insurmountable.

{{< figure src="/ox-hugo/2020-10-27_00-13-31_screenshot.png" caption="Figure 1: Anki GUI" >}}

The goal is to get this a better workflow than manual editing of Anki decks.
`orgmode` is perfect for making cards, especially in the larger context of using
it for storing images and rich `pdfs`.

{{< figure src="/ox-hugo/2020-10-26_23-53-05_screenshot.png" caption="Figure 2: A pleasant way to make anki decks" >}}

## Methodology {#methodology}

To accomplish this, we basically need to have the following:

[anki-editor](https://github.com/louietan/anki-editor)
: This `emacs` plugin will facilitate the conversion from our `orgmode` files to the Anki markup

[anki-connect](https://github.com/FooSoft/anki-connect)
: We need a server of sorts set up to allow us to push pull and get errors from the running Anki server, this is an Anki plugin

[LaTeX process editor](https://ankiweb.net/shared/info/937148547)
: It wouldn't be much better than manually making cards in Anki if we couldn't leverage `unicode` characters, so we need to modify the internal Anki build process for TeX

### Anki Editor {#anki-editor}

As with all `emacs` related setup snippets on this site, these should be modified and adapted as needed, especially for those not using [doom-emacs](https://github.com/hlissner/doom-emacs/).

```emacs-lisp
(use-package anki-editor
  :after org-noter
  :config
  ; I like making decks
  (setq anki-editor-create-decks 't))
```

Also, my [full configuration](https://dotdoom.rgoswami.me/config.html#text-3) has additional non-essential quality of life keybindings amongst other things.

### Anki Connect {#anki-connect}

`CTRL+Shift+A` will bring up the addon settings, and Anki has to be restarted after installing the addons. [Anki Connect](https://github.com/FooSoft/anki-connect) itself does not need any further configuration, though the `readme` is very comprehensive.

### TeX Setup {#tex-setup}

The [LaTeX process editor](https://ankiweb.net/shared/info/937148547) can be set in two stages, wherein we will first ensure that we can use `xelatex` and that we can generate an `svg`.

```json
{
  "svgCommands": [
    ["xelatex", "--no-pdf", "-interaction=nonstopmode", "tmp.tex"],
    ["dvisvgm", "--no-fonts", "-Z", "2", "tmp.xdv", "-o", "tmp.svg"]
  ]
}
```

The `png` settings can be modified in a similar manner if required, but it is better to generate `svg` files, which will set up in the cosmetics section. Note that we pass `--no-pdf` to get the `xdv` file which has replaced `dvi` files for `xelatex`.

### Cosmetics {#cosmetics}

The final aspect of this is to be configured with the GUI. The easiest option is to clone the Basic card type and customize that. `CTRL+Shift+N` should bring up the card editor. The relevant styles are[^fn:1] (from the `Cards` option):

```css
.card {
  font-family: Literata;
  font-size: 26px;
  text-align: center;
  color: black;
  background-color: white;
}
img {
  max-height: 1000px;
  height: auto;
  width: auto;
}
img[src*="latex"] {
  vertical-align: middle;
}
```

Now we need setup our TeX headers as well, and enable the `Create scalable images with dvisvgm` option. The header needs to have (minimally):

```tex
\documentclass[12pt]{article}
\special{papersize=3in,5in}
\usepackage{geometry}
\usepackage{unicode-math}
\usepackage{mathtools}
\pagestyle{empty}
\setlength{\parindent}{0in}
\begin{document}
```

While the `footer` is simply `\end{document}`. With this, we have achieved
pretty formatting.

{{< figure src="/ox-hugo/2020-10-26_23-53-25_screenshot.png" caption="Figure 3: Pretty card formatting" >}}

### Font Locking {#font-locking}

Inspired by [this post](https://yiufung.net/post/anki-org/), we will also use [orgcss](https://github.com/gongzhitaao/orgcss) to obtain some `orgmode` font-locking. We will add the following styles:

```css
:not(pre) > code {
  padding: 2px 5px;
  margin: auto 1px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background-clip: padding-box;
  color: #333;
  font-size: $code-size;
}

.org-src-container {
  border: 1px solid #ccc;
  box-shadow: 3px 3px 3px #eee;
  font-family: $monospace;
  font-size: $code-size;
  margin: 1em auto;
  padding: 0.1em 0.5em;
  position: relative;
}

.org-src-container > pre {
  overflow: auto;
}

.org-src-container > pre:before {
  display: block;
  position: absolute;
  background-color: #b3b3b3;
  top: 0;
  right: 0;
  padding: 0 0.5em;
  border-bottom-left-radius: 8px;
  border: 0;
  color: white;
  font-size: $code-size;
}

/* from http://demo.thi.ng/org-spec/ */

.org-src-container > pre.src-sh:before {
  content: "sh";
}
.org-src-container > pre.src-bash:before {
  content: "bash";
}
.org-src-container > pre.src-emacs-lisp:before {
  content: "Emacs Lisp";
}
.org-src-container > pre.src-R:before {
  content: "R";
}
.org-src-container > pre.src-org:before {
  content: "Org";
}
.org-src-container > pre.src-cpp:before {
  content: "C++";
}
.org-src-container > pre.src-c:before {
  content: "C";
}
.org-src-container > pre.src-html:before {
  content: "HTML";
}
.org-src-container > pre.src-js:before {
  content: "Javascript";
}
.org-src-container > pre.src-javascript:before {
  content: "Javascript";
}

// More languages from http://orgmode.org/worg/org-contrib/babel/languages.html

.org-src-container > pre.src-abc:before {
  content: "ABC";
}
.org-src-container > pre.src-asymptote:before {
  content: "Asymptote";
}
.org-src-container > pre.src-awk:before {
  content: "Awk";
}
.org-src-container > pre.src-C:before {
  content: "C";
}
.org-src-container > pre.src-calc:before {
  content: "Calc";
}
.org-src-container > pre.src-clojure:before {
  content: "Clojure";
}
.org-src-container > pre.src-comint:before {
  content: "comint";
}
.org-src-container > pre.src-css:before {
  content: "CSS";
}
.org-src-container > pre.src-D:before {
  content: "D";
}
.org-src-container > pre.src-ditaa:before {
  content: "Ditaa";
}
.org-src-container > pre.src-dot:before {
  content: "Dot";
}
.org-src-container > pre.src-ebnf:before {
  content: "ebnf";
}
.org-src-container > pre.src-forth:before {
  content: "Forth";
}
.org-src-container > pre.src-F90:before {
  content: "Fortran";
}
.org-src-container > pre.src-gnuplot:before {
  content: "Gnuplot";
}
.org-src-container > pre.src-haskell:before {
  content: "Haskell";
}
.org-src-container > pre.src-io:before {
  content: "Io";
}
.org-src-container > pre.src-java:before {
  content: "Java";
}
.org-src-container > pre.src-latex:before {
  content: "LaTeX";
}
.org-src-container > pre.src-ledger:before {
  content: "Ledger";
}
.org-src-container > pre.src-ly:before {
  content: "Lilypond";
}
.org-src-container > pre.src-lisp:before {
  content: "Lisp";
}
.org-src-container > pre.src-makefile:before {
  content: "Make";
}
.org-src-container > pre.src-matlab:before {
  content: "Matlab";
}
.org-src-container > pre.src-max:before {
  content: "Maxima";
}
.org-src-container > pre.src-mscgen:before {
  content: "Mscgen";
}
.org-src-container > pre.src-Caml:before {
  content: "Objective";
}
.org-src-container > pre.src-octave:before {
  content: "Octave";
}
.org-src-container > pre.src-org:before {
  content: "Org";
}
.org-src-container > pre.src-perl:before {
  content: "Perl";
}
.org-src-container > pre.src-picolisp:before {
  content: "Picolisp";
}
.org-src-container > pre.src-plantuml:before {
  content: "PlantUML";
}
.org-src-container > pre.src-python:before {
  content: "Python";
}
.org-src-container > pre.src-ruby:before {
  content: "Ruby";
}
.org-src-container > pre.src-sass:before {
  content: "Sass";
}
.org-src-container > pre.src-scala:before {
  content: "Scala";
}
.org-src-container > pre.src-scheme:before {
  content: "Scheme";
}
.org-src-container > pre.src-screen:before {
  content: "Screen";
}
.org-src-container > pre.src-sed:before {
  content: "Sed";
}
.org-src-container > pre.src-shell:before {
  content: "shell";
}
.org-src-container > pre.src-shen:before {
  content: "Shen";
}
.org-src-container > pre.src-sql:before {
  content: "SQL";
}
.org-src-container > pre.src-sqlite:before {
  content: "SQLite";
}
.org-src-container > pre.src-stan:before {
  content: "Stan";
}
.org-src-container > pre.src-vala:before {
  content: "Vala";
}
.org-src-container > pre.src-axiom:before {
  content: "Axiom";
}
.org-src-container > pre.src-browser:before {
  content: "HTML";
}
.org-src-container > pre.src-cypher:before {
  content: "Neo4j";
}
.org-src-container > pre.src-elixir:before {
  content: "Elixir";
}
.org-src-container > pre.src-request:before {
  content: "http";
}
.org-src-container > pre.src-ipython:before {
  content: "iPython";
}
.org-src-container > pre.src-kotlin:before {
  content: "Kotlin";
}
.org-src-container > pre.src-Flavored Erlang lfe:before {
  content: "Lisp";
}
.org-src-container > pre.src-mongo:before {
  content: "MongoDB";
}
.org-src-container > pre.src-prolog:before {
  content: "Prolog";
}
.org-src-container > pre.src-rec:before {
  content: "rec";
}
.org-src-container > pre.src-ML sml:before {
  content: "Standard";
}
.org-src-container > pre.src-Translate translate:before {
  content: "Google";
}
.org-src-container > pre.src-typescript:before {
  content: "Typescript";
}
.org-src-container > pre.src-rust:before {
  content: "Rust";
}
```

However, in the interests of sanity, we will leverage the [Syntax Highlighting Anki plugin](https://ankiweb.net/shared/info/1972239816) for managing the actual style-sheets instead of manual edits to each card type.

{{< figure src="https://raw.githubusercontent.com/ijgnd/syntax-highlighting/master/screenshots/demo%5Fconfig%5Fwith%5Fnm%5Ftoggle%5Faddon.gif" caption="Figure 4: A screencast from the plugin readme" >}}

At this stage, we have a card which can gracefully handle both XeLaTeX and code in an elegant manner. An example is presented in the next section.

## Usage {#usage}

For the sample card[^fn:2] shown, the markup is dead simple.

```org
* Basis Vectors :math:quantum:linear:
:properties:
:anki_deck: CompChem
:anki_note_type: LaTeX
:ANKI_NOTE_ID: 1603755931922
:end:
** Front
For a three dimensional vector with components $aᵢ,i=1,2,3$ what are the basis vectors?
** Back
This is defined as follows:
$$
\mathbf{a}=\mathbf{e}₁a₁+\mathbf{e}₂a₂+\mathbf{e}₃a₃=∑ᵢ\mathbf{e}ᵢaᵢ
$$
```

Essentially:

- Enable and load `anki-editor`
  - Add local variable section to ensure we load `anki-editor`. This is essentially via `eval: (anki-editor-mode)` in the Local variables block
- Fire up Anki
- Export at will, and continue adding more cards or non-card details to the `orgmode` file

The [Anki editor examples](https://raw.githubusercontent.com/louietan/anki-editor/master/examples.org) file is excellent and the [issue tracker](https://github.com/louietan/anki-editor/issues/30) also has a ton
of information.

### Code {#code}

```org
* Test Code :code:python:
:properties:
:anki_deck: CodeWiki
:anki_note_type: myTex
:ANKI_NOTE_ID: 1603891864091
:end:
** Front
What is the definition of an inner product? What are some examples of a code block in Python and R?
** Back
This is essentially a *norm* with more structure. The first two properties, positive definiteness and symmetry (conjugate) defines a *norm*.
$$
\mathbf{a}=\mathbf{e}₁a₁+\mathbf{e}₂a₂+\mathbf{e}₃a₃=∑ᵢ\mathbf{e}ᵢaᵢ
$$

#+begin_src python
def test():
    x = [1,2,3]
    for i in x:
        print(i)
#+end_src

#+begin_src R
library("dplyr")
x = 1
#+end_src
```

{{< figure src="/ox-hugo/2020-10-28_13-35-16_screenshot.png" caption="Figure 5: Code card with TeX" >}}

### More Content {#more-content}

[Fundamental Haskell](https://github.com/Anton-Latukha/Fundamental-Haskell)
: An excellent example of how a multiple frontend learning repository can be, written with `org-drill`[^fn:3]

[Anki powerups with orgmode](https://yiufung.net/post/anki-org/)
: A post brought to my attention after I had published this, an excellent introduction with videos

## Conclusions {#conclusions}

Some final comments:

- Screenshots and other images linked are automatically synced
- The TeX is best rendered on the PC first, so run through these at-least once

A missing link in this setup is the ability to use a touch screen and stylus to
write proofs or skip the TeX setup altogether, but that would require another
post altogether. Additionally, all the standard bells and whistles of having an
`orgmode` document can be applied, including, crucially, the ability to have
long-form notes as well, a coherent approach to this can also be covered later.

[^fn:1]: The alignment trick is from [this post](https://clementc.github.io/blog/2018/08/15/anki%5Fsetup/)
[^fn:2]: It <span class="underline">is</span> a **gag** card, no judgement here
[^fn:3]: `org-drill` doesn't support any kind of mobile synchronization
