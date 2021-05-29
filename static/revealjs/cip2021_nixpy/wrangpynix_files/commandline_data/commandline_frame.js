/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/atob/browser-atob.js":
/*!*******************************************!*\
  !*** ./node_modules/atob/browser-atob.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* module decorator */ module = __webpack_require__.nmd(module);
(function (w) {
  "use strict";

  function findBest(atobNative) {
    // normal window
    if ('function' === typeof atobNative) { return atobNative; }


    // browserify (web worker)
    if ('function' === typeof Buffer) {
      return function atobBrowserify(a) {
        //!! Deliberately using an API that's deprecated in node.js because
        //!! this file is for browsers and we expect them to cope with it.
        //!! Discussion: github.com/node-browser-compat/atob/pull/9
        return new Buffer(a, 'base64').toString('binary');
      };
    }

    // ios web worker with base64js
    if ('object' === typeof w.base64js) {
      // bufferToBinaryString
      // https://git.coolaj86.com/coolaj86/unibabel.js/blob/master/index.js#L50
      return function atobWebWorker_iOS(a) {
        var buf = w.base64js.b64ToByteArray(a);
        return Array.prototype.map.call(buf, function (ch) {
          return String.fromCharCode(ch);
        }).join('');
      };
    }

		return function () {
			// ios web worker without base64js
			throw new Error("You're probably in an old browser or an iOS webworker." +
				" It might help to include beatgammit's base64-js.");
    };
  }

  var atobBest = findBest(w.atob);
  w.atob = atobBest;

  if (( true) && module && module.exports) {
    module.exports = atobBest;
  }
}(window));


/***/ }),

/***/ "./node_modules/css/index.js":
/*!***********************************!*\
  !*** ./node_modules/css/index.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

exports.parse = __webpack_require__(/*! ./lib/parse */ "./node_modules/css/lib/parse/index.js");
exports.stringify = __webpack_require__(/*! ./lib/stringify */ "./node_modules/css/lib/stringify/index.js");


/***/ }),

/***/ "./node_modules/css/lib/parse/index.js":
/*!*********************************************!*\
  !*** ./node_modules/css/lib/parse/index.js ***!
  \*********************************************/
/***/ ((module) => {

// http://www.w3.org/TR/CSS21/grammar.html
// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027
var commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g

module.exports = function(css, options){
  options = options || {};

  /**
   * Positional.
   */

  var lineno = 1;
  var column = 1;

  /**
   * Update lineno and column based on `str`.
   */

  function updatePosition(str) {
    var lines = str.match(/\n/g);
    if (lines) lineno += lines.length;
    var i = str.lastIndexOf('\n');
    column = ~i ? str.length - i : column + str.length;
  }

  /**
   * Mark position and patch `node.position`.
   */

  function position() {
    var start = { line: lineno, column: column };
    return function(node){
      node.position = new Position(start);
      whitespace();
      return node;
    };
  }

  /**
   * Store position information for a node
   */

  function Position(start) {
    this.start = start;
    this.end = { line: lineno, column: column };
    this.source = options.source;
  }

  /**
   * Non-enumerable source string
   */

  Position.prototype.content = css;

  /**
   * Error `msg`.
   */

  var errorsList = [];

  function error(msg) {
    var err = new Error(options.source + ':' + lineno + ':' + column + ': ' + msg);
    err.reason = msg;
    err.filename = options.source;
    err.line = lineno;
    err.column = column;
    err.source = css;

    if (options.silent) {
      errorsList.push(err);
    } else {
      throw err;
    }
  }

  /**
   * Parse stylesheet.
   */

  function stylesheet() {
    var rulesList = rules();

    return {
      type: 'stylesheet',
      stylesheet: {
        source: options.source,
        rules: rulesList,
        parsingErrors: errorsList
      }
    };
  }

  /**
   * Opening brace.
   */

  function open() {
    return match(/^{\s*/);
  }

  /**
   * Closing brace.
   */

  function close() {
    return match(/^}/);
  }

  /**
   * Parse ruleset.
   */

  function rules() {
    var node;
    var rules = [];
    whitespace();
    comments(rules);
    while (css.length && css.charAt(0) != '}' && (node = atrule() || rule())) {
      if (node !== false) {
        rules.push(node);
        comments(rules);
      }
    }
    return rules;
  }

  /**
   * Match `re` and return captures.
   */

  function match(re) {
    var m = re.exec(css);
    if (!m) return;
    var str = m[0];
    updatePosition(str);
    css = css.slice(str.length);
    return m;
  }

  /**
   * Parse whitespace.
   */

  function whitespace() {
    match(/^\s*/);
  }

  /**
   * Parse comments;
   */

  function comments(rules) {
    var c;
    rules = rules || [];
    while (c = comment()) {
      if (c !== false) {
        rules.push(c);
      }
    }
    return rules;
  }

  /**
   * Parse comment.
   */

  function comment() {
    var pos = position();
    if ('/' != css.charAt(0) || '*' != css.charAt(1)) return;

    var i = 2;
    while ("" != css.charAt(i) && ('*' != css.charAt(i) || '/' != css.charAt(i + 1))) ++i;
    i += 2;

    if ("" === css.charAt(i-1)) {
      return error('End of comment missing');
    }

    var str = css.slice(2, i - 2);
    column += 2;
    updatePosition(str);
    css = css.slice(i);
    column += 2;

    return pos({
      type: 'comment',
      comment: str
    });
  }

  /**
   * Parse selector.
   */

  function selector() {
    var m = match(/^([^{]+)/);
    if (!m) return;
    /* @fix Remove all comments from selectors
     * http://ostermiller.org/findcomment.html */
    return trim(m[0])
      .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, '')
      .replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, function(m) {
        return m.replace(/,/g, '\u200C');
      })
      .split(/\s*(?![^(]*\)),\s*/)
      .map(function(s) {
        return s.replace(/\u200C/g, ',');
      });
  }

  /**
   * Parse declaration.
   */

  function declaration() {
    var pos = position();

    // prop
    var prop = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
    if (!prop) return;
    prop = trim(prop[0]);

    // :
    if (!match(/^:\s*/)) return error("property missing ':'");

    // val
    var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);

    var ret = pos({
      type: 'declaration',
      property: prop.replace(commentre, ''),
      value: val ? trim(val[0]).replace(commentre, '') : ''
    });

    // ;
    match(/^[;\s]*/);

    return ret;
  }

  /**
   * Parse declarations.
   */

  function declarations() {
    var decls = [];

    if (!open()) return error("missing '{'");
    comments(decls);

    // declarations
    var decl;
    while (decl = declaration()) {
      if (decl !== false) {
        decls.push(decl);
        comments(decls);
      }
    }

    if (!close()) return error("missing '}'");
    return decls;
  }

  /**
   * Parse keyframe.
   */

  function keyframe() {
    var m;
    var vals = [];
    var pos = position();

    while (m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/)) {
      vals.push(m[1]);
      match(/^,\s*/);
    }

    if (!vals.length) return;

    return pos({
      type: 'keyframe',
      values: vals,
      declarations: declarations()
    });
  }

  /**
   * Parse keyframes.
   */

  function atkeyframes() {
    var pos = position();
    var m = match(/^@([-\w]+)?keyframes\s*/);

    if (!m) return;
    var vendor = m[1];

    // identifier
    var m = match(/^([-\w]+)\s*/);
    if (!m) return error("@keyframes missing name");
    var name = m[1];

    if (!open()) return error("@keyframes missing '{'");

    var frame;
    var frames = comments();
    while (frame = keyframe()) {
      frames.push(frame);
      frames = frames.concat(comments());
    }

    if (!close()) return error("@keyframes missing '}'");

    return pos({
      type: 'keyframes',
      name: name,
      vendor: vendor,
      keyframes: frames
    });
  }

  /**
   * Parse supports.
   */

  function atsupports() {
    var pos = position();
    var m = match(/^@supports *([^{]+)/);

    if (!m) return;
    var supports = trim(m[1]);

    if (!open()) return error("@supports missing '{'");

    var style = comments().concat(rules());

    if (!close()) return error("@supports missing '}'");

    return pos({
      type: 'supports',
      supports: supports,
      rules: style
    });
  }

  /**
   * Parse host.
   */

  function athost() {
    var pos = position();
    var m = match(/^@host\s*/);

    if (!m) return;

    if (!open()) return error("@host missing '{'");

    var style = comments().concat(rules());

    if (!close()) return error("@host missing '}'");

    return pos({
      type: 'host',
      rules: style
    });
  }

  /**
   * Parse media.
   */

  function atmedia() {
    var pos = position();
    var m = match(/^@media *([^{]+)/);

    if (!m) return;
    var media = trim(m[1]);

    if (!open()) return error("@media missing '{'");

    var style = comments().concat(rules());

    if (!close()) return error("@media missing '}'");

    return pos({
      type: 'media',
      media: media,
      rules: style
    });
  }


  /**
   * Parse custom-media.
   */

  function atcustommedia() {
    var pos = position();
    var m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
    if (!m) return;

    return pos({
      type: 'custom-media',
      name: trim(m[1]),
      media: trim(m[2])
    });
  }

  /**
   * Parse paged media.
   */

  function atpage() {
    var pos = position();
    var m = match(/^@page */);
    if (!m) return;

    var sel = selector() || [];

    if (!open()) return error("@page missing '{'");
    var decls = comments();

    // declarations
    var decl;
    while (decl = declaration()) {
      decls.push(decl);
      decls = decls.concat(comments());
    }

    if (!close()) return error("@page missing '}'");

    return pos({
      type: 'page',
      selectors: sel,
      declarations: decls
    });
  }

  /**
   * Parse document.
   */

  function atdocument() {
    var pos = position();
    var m = match(/^@([-\w]+)?document *([^{]+)/);
    if (!m) return;

    var vendor = trim(m[1]);
    var doc = trim(m[2]);

    if (!open()) return error("@document missing '{'");

    var style = comments().concat(rules());

    if (!close()) return error("@document missing '}'");

    return pos({
      type: 'document',
      document: doc,
      vendor: vendor,
      rules: style
    });
  }

  /**
   * Parse font-face.
   */

  function atfontface() {
    var pos = position();
    var m = match(/^@font-face\s*/);
    if (!m) return;

    if (!open()) return error("@font-face missing '{'");
    var decls = comments();

    // declarations
    var decl;
    while (decl = declaration()) {
      decls.push(decl);
      decls = decls.concat(comments());
    }

    if (!close()) return error("@font-face missing '}'");

    return pos({
      type: 'font-face',
      declarations: decls
    });
  }

  /**
   * Parse import
   */

  var atimport = _compileAtrule('import');

  /**
   * Parse charset
   */

  var atcharset = _compileAtrule('charset');

  /**
   * Parse namespace
   */

  var atnamespace = _compileAtrule('namespace');

  /**
   * Parse non-block at-rules
   */


  function _compileAtrule(name) {
    var re = new RegExp('^@' + name + '\\s*([^;]+);');
    return function() {
      var pos = position();
      var m = match(re);
      if (!m) return;
      var ret = { type: name };
      ret[name] = m[1].trim();
      return pos(ret);
    }
  }

  /**
   * Parse at rule.
   */

  function atrule() {
    if (css[0] != '@') return;

    return atkeyframes()
      || atmedia()
      || atcustommedia()
      || atsupports()
      || atimport()
      || atcharset()
      || atnamespace()
      || atdocument()
      || atpage()
      || athost()
      || atfontface();
  }

  /**
   * Parse rule.
   */

  function rule() {
    var pos = position();
    var sel = selector();

    if (!sel) return error('selector missing');
    comments();

    return pos({
      type: 'rule',
      selectors: sel,
      declarations: declarations()
    });
  }

  return addParent(stylesheet());
};

/**
 * Trim `str`.
 */

function trim(str) {
  return str ? str.replace(/^\s+|\s+$/g, '') : '';
}

/**
 * Adds non-enumerable parent node reference to each node.
 */

function addParent(obj, parent) {
  var isNode = obj && typeof obj.type === 'string';
  var childParent = isNode ? obj : parent;

  for (var k in obj) {
    var value = obj[k];
    if (Array.isArray(value)) {
      value.forEach(function(v) { addParent(v, childParent); });
    } else if (value && typeof value === 'object') {
      addParent(value, childParent);
    }
  }

  if (isNode) {
    Object.defineProperty(obj, 'parent', {
      configurable: true,
      writable: true,
      enumerable: false,
      value: parent || null
    });
  }

  return obj;
}


/***/ }),

/***/ "./node_modules/css/lib/stringify/compiler.js":
/*!****************************************************!*\
  !*** ./node_modules/css/lib/stringify/compiler.js ***!
  \****************************************************/
/***/ ((module) => {


/**
 * Expose `Compiler`.
 */

module.exports = Compiler;

/**
 * Initialize a compiler.
 *
 * @param {Type} name
 * @return {Type}
 * @api public
 */

function Compiler(opts) {
  this.options = opts || {};
}

/**
 * Emit `str`
 */

Compiler.prototype.emit = function(str) {
  return str;
};

/**
 * Visit `node`.
 */

Compiler.prototype.visit = function(node){
  return this[node.type](node);
};

/**
 * Map visit over array of `nodes`, optionally using a `delim`
 */

Compiler.prototype.mapVisit = function(nodes, delim){
  var buf = '';
  delim = delim || '';

  for (var i = 0, length = nodes.length; i < length; i++) {
    buf += this.visit(nodes[i]);
    if (delim && i < length - 1) buf += this.emit(delim);
  }

  return buf;
};


/***/ }),

/***/ "./node_modules/css/lib/stringify/compress.js":
/*!****************************************************!*\
  !*** ./node_modules/css/lib/stringify/compress.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * Module dependencies.
 */

var Base = __webpack_require__(/*! ./compiler */ "./node_modules/css/lib/stringify/compiler.js");
var inherits = __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js");

/**
 * Expose compiler.
 */

module.exports = Compiler;

/**
 * Initialize a new `Compiler`.
 */

function Compiler(options) {
  Base.call(this, options);
}

/**
 * Inherit from `Base.prototype`.
 */

inherits(Compiler, Base);

/**
 * Compile `node`.
 */

Compiler.prototype.compile = function(node){
  return node.stylesheet
    .rules.map(this.visit, this)
    .join('');
};

/**
 * Visit comment node.
 */

Compiler.prototype.comment = function(node){
  return this.emit('', node.position);
};

/**
 * Visit import node.
 */

Compiler.prototype.import = function(node){
  return this.emit('@import ' + node.import + ';', node.position);
};

/**
 * Visit media node.
 */

Compiler.prototype.media = function(node){
  return this.emit('@media ' + node.media, node.position)
    + this.emit('{')
    + this.mapVisit(node.rules)
    + this.emit('}');
};

/**
 * Visit document node.
 */

Compiler.prototype.document = function(node){
  var doc = '@' + (node.vendor || '') + 'document ' + node.document;

  return this.emit(doc, node.position)
    + this.emit('{')
    + this.mapVisit(node.rules)
    + this.emit('}');
};

/**
 * Visit charset node.
 */

Compiler.prototype.charset = function(node){
  return this.emit('@charset ' + node.charset + ';', node.position);
};

/**
 * Visit namespace node.
 */

Compiler.prototype.namespace = function(node){
  return this.emit('@namespace ' + node.namespace + ';', node.position);
};

/**
 * Visit supports node.
 */

Compiler.prototype.supports = function(node){
  return this.emit('@supports ' + node.supports, node.position)
    + this.emit('{')
    + this.mapVisit(node.rules)
    + this.emit('}');
};

/**
 * Visit keyframes node.
 */

Compiler.prototype.keyframes = function(node){
  return this.emit('@'
    + (node.vendor || '')
    + 'keyframes '
    + node.name, node.position)
    + this.emit('{')
    + this.mapVisit(node.keyframes)
    + this.emit('}');
};

/**
 * Visit keyframe node.
 */

Compiler.prototype.keyframe = function(node){
  var decls = node.declarations;

  return this.emit(node.values.join(','), node.position)
    + this.emit('{')
    + this.mapVisit(decls)
    + this.emit('}');
};

/**
 * Visit page node.
 */

Compiler.prototype.page = function(node){
  var sel = node.selectors.length
    ? node.selectors.join(', ')
    : '';

  return this.emit('@page ' + sel, node.position)
    + this.emit('{')
    + this.mapVisit(node.declarations)
    + this.emit('}');
};

/**
 * Visit font-face node.
 */

Compiler.prototype['font-face'] = function(node){
  return this.emit('@font-face', node.position)
    + this.emit('{')
    + this.mapVisit(node.declarations)
    + this.emit('}');
};

/**
 * Visit host node.
 */

Compiler.prototype.host = function(node){
  return this.emit('@host', node.position)
    + this.emit('{')
    + this.mapVisit(node.rules)
    + this.emit('}');
};

/**
 * Visit custom-media node.
 */

Compiler.prototype['custom-media'] = function(node){
  return this.emit('@custom-media ' + node.name + ' ' + node.media + ';', node.position);
};

/**
 * Visit rule node.
 */

Compiler.prototype.rule = function(node){
  var decls = node.declarations;
  if (!decls.length) return '';

  return this.emit(node.selectors.join(','), node.position)
    + this.emit('{')
    + this.mapVisit(decls)
    + this.emit('}');
};

/**
 * Visit declaration node.
 */

Compiler.prototype.declaration = function(node){
  return this.emit(node.property + ':' + node.value, node.position) + this.emit(';');
};



/***/ }),

/***/ "./node_modules/css/lib/stringify/identity.js":
/*!****************************************************!*\
  !*** ./node_modules/css/lib/stringify/identity.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * Module dependencies.
 */

var Base = __webpack_require__(/*! ./compiler */ "./node_modules/css/lib/stringify/compiler.js");
var inherits = __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js");

/**
 * Expose compiler.
 */

module.exports = Compiler;

/**
 * Initialize a new `Compiler`.
 */

function Compiler(options) {
  options = options || {};
  Base.call(this, options);
  this.indentation = options.indent;
}

/**
 * Inherit from `Base.prototype`.
 */

inherits(Compiler, Base);

/**
 * Compile `node`.
 */

Compiler.prototype.compile = function(node){
  return this.stylesheet(node);
};

/**
 * Visit stylesheet node.
 */

Compiler.prototype.stylesheet = function(node){
  return this.mapVisit(node.stylesheet.rules, '\n\n');
};

/**
 * Visit comment node.
 */

Compiler.prototype.comment = function(node){
  return this.emit(this.indent() + '/*' + node.comment + '*/', node.position);
};

/**
 * Visit import node.
 */

Compiler.prototype.import = function(node){
  return this.emit('@import ' + node.import + ';', node.position);
};

/**
 * Visit media node.
 */

Compiler.prototype.media = function(node){
  return this.emit('@media ' + node.media, node.position)
    + this.emit(
        ' {\n'
        + this.indent(1))
    + this.mapVisit(node.rules, '\n\n')
    + this.emit(
        this.indent(-1)
        + '\n}');
};

/**
 * Visit document node.
 */

Compiler.prototype.document = function(node){
  var doc = '@' + (node.vendor || '') + 'document ' + node.document;

  return this.emit(doc, node.position)
    + this.emit(
        ' '
      + ' {\n'
      + this.indent(1))
    + this.mapVisit(node.rules, '\n\n')
    + this.emit(
        this.indent(-1)
        + '\n}');
};

/**
 * Visit charset node.
 */

Compiler.prototype.charset = function(node){
  return this.emit('@charset ' + node.charset + ';', node.position);
};

/**
 * Visit namespace node.
 */

Compiler.prototype.namespace = function(node){
  return this.emit('@namespace ' + node.namespace + ';', node.position);
};

/**
 * Visit supports node.
 */

Compiler.prototype.supports = function(node){
  return this.emit('@supports ' + node.supports, node.position)
    + this.emit(
      ' {\n'
      + this.indent(1))
    + this.mapVisit(node.rules, '\n\n')
    + this.emit(
        this.indent(-1)
        + '\n}');
};

/**
 * Visit keyframes node.
 */

Compiler.prototype.keyframes = function(node){
  return this.emit('@' + (node.vendor || '') + 'keyframes ' + node.name, node.position)
    + this.emit(
      ' {\n'
      + this.indent(1))
    + this.mapVisit(node.keyframes, '\n')
    + this.emit(
        this.indent(-1)
        + '}');
};

/**
 * Visit keyframe node.
 */

Compiler.prototype.keyframe = function(node){
  var decls = node.declarations;

  return this.emit(this.indent())
    + this.emit(node.values.join(', '), node.position)
    + this.emit(
      ' {\n'
      + this.indent(1))
    + this.mapVisit(decls, '\n')
    + this.emit(
      this.indent(-1)
      + '\n'
      + this.indent() + '}\n');
};

/**
 * Visit page node.
 */

Compiler.prototype.page = function(node){
  var sel = node.selectors.length
    ? node.selectors.join(', ') + ' '
    : '';

  return this.emit('@page ' + sel, node.position)
    + this.emit('{\n')
    + this.emit(this.indent(1))
    + this.mapVisit(node.declarations, '\n')
    + this.emit(this.indent(-1))
    + this.emit('\n}');
};

/**
 * Visit font-face node.
 */

Compiler.prototype['font-face'] = function(node){
  return this.emit('@font-face ', node.position)
    + this.emit('{\n')
    + this.emit(this.indent(1))
    + this.mapVisit(node.declarations, '\n')
    + this.emit(this.indent(-1))
    + this.emit('\n}');
};

/**
 * Visit host node.
 */

Compiler.prototype.host = function(node){
  return this.emit('@host', node.position)
    + this.emit(
        ' {\n'
        + this.indent(1))
    + this.mapVisit(node.rules, '\n\n')
    + this.emit(
        this.indent(-1)
        + '\n}');
};

/**
 * Visit custom-media node.
 */

Compiler.prototype['custom-media'] = function(node){
  return this.emit('@custom-media ' + node.name + ' ' + node.media + ';', node.position);
};

/**
 * Visit rule node.
 */

Compiler.prototype.rule = function(node){
  var indent = this.indent();
  var decls = node.declarations;
  if (!decls.length) return '';

  return this.emit(node.selectors.map(function(s){ return indent + s }).join(',\n'), node.position)
    + this.emit(' {\n')
    + this.emit(this.indent(1))
    + this.mapVisit(decls, '\n')
    + this.emit(this.indent(-1))
    + this.emit('\n' + this.indent() + '}');
};

/**
 * Visit declaration node.
 */

Compiler.prototype.declaration = function(node){
  return this.emit(this.indent())
    + this.emit(node.property + ': ' + node.value, node.position)
    + this.emit(';');
};

/**
 * Increase, decrease or return current indentation.
 */

Compiler.prototype.indent = function(level) {
  this.level = this.level || 1;

  if (null != level) {
    this.level += level;
    return '';
  }

  return Array(this.level).join(this.indentation || '  ');
};


/***/ }),

/***/ "./node_modules/css/lib/stringify/index.js":
/*!*************************************************!*\
  !*** ./node_modules/css/lib/stringify/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * Module dependencies.
 */

var Compressed = __webpack_require__(/*! ./compress */ "./node_modules/css/lib/stringify/compress.js");
var Identity = __webpack_require__(/*! ./identity */ "./node_modules/css/lib/stringify/identity.js");

/**
 * Stringfy the given AST `node`.
 *
 * Options:
 *
 *  - `compress` space-optimized output
 *  - `sourcemap` return an object with `.code` and `.map`
 *
 * @param {Object} node
 * @param {Object} [options]
 * @return {String}
 * @api public
 */

module.exports = function(node, options){
  options = options || {};

  var compiler = options.compress
    ? new Compressed(options)
    : new Identity(options);

  // source maps
  if (options.sourcemap) {
    var sourcemaps = __webpack_require__(/*! ./source-map-support */ "./node_modules/css/lib/stringify/source-map-support.js");
    sourcemaps(compiler);

    var code = compiler.compile(node);
    compiler.applySourceMaps();

    var map = options.sourcemap === 'generator'
      ? compiler.map
      : compiler.map.toJSON();

    return { code: code, map: map };
  }

  var code = compiler.compile(node);
  return code;
};


/***/ }),

/***/ "./node_modules/css/lib/stringify/source-map-support.js":
/*!**************************************************************!*\
  !*** ./node_modules/css/lib/stringify/source-map-support.js ***!
  \**************************************************************/
/***/ ((module, exports, __webpack_require__) => {


/**
 * Module dependencies.
 */

var SourceMap = __webpack_require__(/*! source-map */ "./node_modules/source-map/source-map.js").SourceMapGenerator;
var SourceMapConsumer = __webpack_require__(/*! source-map */ "./node_modules/source-map/source-map.js").SourceMapConsumer;
var sourceMapResolve = __webpack_require__(/*! source-map-resolve */ "./node_modules/source-map-resolve/index.js");
var fs = __webpack_require__(/*! fs */ "?b867");
var path = __webpack_require__(/*! path */ "?cdbe");

/**
 * Expose `mixin()`.
 */

module.exports = mixin;

/**
 * Ensure Windows-style paths are formatted properly
 */

const makeFriendlyPath = function(aPath) {
  return path.sep === "\\" ? aPath.replace(/\\/g, "/").replace(/^[a-z]:\/?/i, "/") : aPath;
}

/**
 * Mixin source map support into `compiler`.
 *
 * @param {Compiler} compiler
 * @api public
 */

function mixin(compiler) {
  compiler._comment = compiler.comment;
  compiler.map = new SourceMap();
  compiler.position = { line: 1, column: 1 };
  compiler.files = {};
  for (var k in exports) compiler[k] = exports[k];
}

/**
 * Update position.
 *
 * @param {String} str
 * @api private
 */

exports.updatePosition = function(str) {
  var lines = str.match(/\n/g);
  if (lines) this.position.line += lines.length;
  var i = str.lastIndexOf('\n');
  this.position.column = ~i ? str.length - i : this.position.column + str.length;
};

/**
 * Emit `str`.
 *
 * @param {String} str
 * @param {Object} [pos]
 * @return {String}
 * @api private
 */

exports.emit = function(str, pos) {
  if (pos) {
    var sourceFile = makeFriendlyPath(pos.source || 'source.css');

    this.map.addMapping({
      source: sourceFile,
      generated: {
        line: this.position.line,
        column: Math.max(this.position.column - 1, 0)
      },
      original: {
        line: pos.start.line,
        column: pos.start.column - 1
      }
    });

    this.addFile(sourceFile, pos);
  }

  this.updatePosition(str);

  return str;
};

/**
 * Adds a file to the source map output if it has not already been added
 * @param {String} file
 * @param {Object} pos
 */

exports.addFile = function(file, pos) {
  if (typeof pos.content !== 'string') return;
  if (Object.prototype.hasOwnProperty.call(this.files, file)) return;

  this.files[file] = pos.content;
};

/**
 * Applies any original source maps to the output and embeds the source file
 * contents in the source map.
 */

exports.applySourceMaps = function() {
  Object.keys(this.files).forEach(function(file) {
    var content = this.files[file];
    this.map.setSourceContent(file, content);

    if (this.options.inputSourcemaps !== false) {
      var originalMap = sourceMapResolve.resolveSync(
        content, file, fs.readFileSync);
      if (originalMap) {
        var map = new SourceMapConsumer(originalMap.map);
        var relativeTo = originalMap.sourcesRelativeTo;
        this.map.applySourceMap(map, file, makeFriendlyPath(path.dirname(relativeTo)));
      }
    }
  }, this);
};

/**
 * Process comments, drops sourceMap comments.
 * @param {Object} node
 */

exports.comment = function(node) {
  if (/^# sourceMappingURL=/.test(node.comment))
    return this.emit('', node.position);
  else
    return this._comment(node);
};


/***/ }),

/***/ "./node_modules/decode-uri-component/index.js":
/*!****************************************************!*\
  !*** ./node_modules/decode-uri-component/index.js ***!
  \****************************************************/
/***/ ((module) => {

"use strict";

var token = '%[a-f0-9]{2}';
var singleMatcher = new RegExp(token, 'gi');
var multiMatcher = new RegExp('(' + token + ')+', 'gi');

function decodeComponents(components, split) {
	try {
		// Try to decode the entire string first
		return decodeURIComponent(components.join(''));
	} catch (err) {
		// Do nothing
	}

	if (components.length === 1) {
		return components;
	}

	split = split || 1;

	// Split the array in 2 parts
	var left = components.slice(0, split);
	var right = components.slice(split);

	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch (err) {
		var tokens = input.match(singleMatcher);

		for (var i = 1; i < tokens.length; i++) {
			input = decodeComponents(tokens, i).join('');

			tokens = input.match(singleMatcher);
		}

		return input;
	}
}

function customDecodeURIComponent(input) {
	// Keep track of all the replacements and prefill the map with the `BOM`
	var replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD'
	};

	var match = multiMatcher.exec(input);
	while (match) {
		try {
			// Decode as big chunks as possible
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch (err) {
			var result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
	replaceMap['%C2'] = '\uFFFD';

	var entries = Object.keys(replaceMap);

	for (var i = 0; i < entries.length; i++) {
		// Replace all decoded components
		var key = entries[i];
		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
	}

	return input;
}

module.exports = function (encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
	}

	try {
		encodedURI = encodedURI.replace(/\+/g, ' ');

		// Try the built in decoder first
		return decodeURIComponent(encodedURI);
	} catch (err) {
		// Fallback to a more advanced decoder
		return customDecodeURIComponent(encodedURI);
	}
};


/***/ }),

/***/ "./node_modules/fuse.js/dist/fuse.esm.js":
/*!***********************************************!*\
  !*** ./node_modules/fuse.js/dist/fuse.esm.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * Fuse.js v6.4.6 - Lightweight fuzzy-search (http://fusejs.io)
 *
 * Copyright (c) 2021 Kiro Risk (http://kiro.me)
 * All Rights Reserved. Apache Software License 2.0
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

function isArray(value) {
  return !Array.isArray
    ? getTag(value) === '[object Array]'
    : Array.isArray(value)
}

// Adapted from: https://github.com/lodash/lodash/blob/master/.internal/baseToString.js
const INFINITY = 1 / 0;
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value
  }
  let result = value + '';
  return result == '0' && 1 / value == -INFINITY ? '-0' : result
}

function toString(value) {
  return value == null ? '' : baseToString(value)
}

function isString(value) {
  return typeof value === 'string'
}

function isNumber(value) {
  return typeof value === 'number'
}

// Adapted from: https://github.com/lodash/lodash/blob/master/isBoolean.js
function isBoolean(value) {
  return (
    value === true ||
    value === false ||
    (isObjectLike(value) && getTag(value) == '[object Boolean]')
  )
}

function isObject(value) {
  return typeof value === 'object'
}

// Checks if `value` is object-like.
function isObjectLike(value) {
  return isObject(value) && value !== null
}

function isDefined(value) {
  return value !== undefined && value !== null
}

function isBlank(value) {
  return !value.trim().length
}

// Gets the `toStringTag` of `value`.
// Adapted from: https://github.com/lodash/lodash/blob/master/.internal/getTag.js
function getTag(value) {
  return value == null
    ? value === undefined
      ? '[object Undefined]'
      : '[object Null]'
    : Object.prototype.toString.call(value)
}

const EXTENDED_SEARCH_UNAVAILABLE = 'Extended search is not available';

const INCORRECT_INDEX_TYPE = "Incorrect 'index' type";

const LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) =>
  `Invalid value for key ${key}`;

const PATTERN_LENGTH_TOO_LARGE = (max) =>
  `Pattern length exceeds max of ${max}.`;

const MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;

const INVALID_KEY_WEIGHT_VALUE = (key) =>
  `Property 'weight' in key '${key}' must be a positive integer`;

const hasOwn = Object.prototype.hasOwnProperty;

class KeyStore {
  constructor(keys) {
    this._keys = [];
    this._keyMap = {};

    let totalWeight = 0;

    keys.forEach((key) => {
      let obj = createKey(key);

      totalWeight += obj.weight;

      this._keys.push(obj);
      this._keyMap[obj.id] = obj;

      totalWeight += obj.weight;
    });

    // Normalize weights so that their sum is equal to 1
    this._keys.forEach((key) => {
      key.weight /= totalWeight;
    });
  }
  get(keyId) {
    return this._keyMap[keyId]
  }
  keys() {
    return this._keys
  }
  toJSON() {
    return JSON.stringify(this._keys)
  }
}

function createKey(key) {
  let path = null;
  let id = null;
  let src = null;
  let weight = 1;

  if (isString(key) || isArray(key)) {
    src = key;
    path = createKeyPath(key);
    id = createKeyId(key);
  } else {
    if (!hasOwn.call(key, 'name')) {
      throw new Error(MISSING_KEY_PROPERTY('name'))
    }

    const name = key.name;
    src = name;

    if (hasOwn.call(key, 'weight')) {
      weight = key.weight;

      if (weight <= 0) {
        throw new Error(INVALID_KEY_WEIGHT_VALUE(name))
      }
    }

    path = createKeyPath(name);
    id = createKeyId(name);
  }

  return { path, id, weight, src }
}

function createKeyPath(key) {
  return isArray(key) ? key : key.split('.')
}

function createKeyId(key) {
  return isArray(key) ? key.join('.') : key
}

function get(obj, path) {
  let list = [];
  let arr = false;

  const deepGet = (obj, path, index) => {
    if (!isDefined(obj)) {
      return
    }
    if (!path[index]) {
      // If there's no path left, we've arrived at the object we care about.
      list.push(obj);
    } else {
      let key = path[index];

      const value = obj[key];

      if (!isDefined(value)) {
        return
      }

      // If we're at the last value in the path, and if it's a string/number/bool,
      // add it to the list
      if (
        index === path.length - 1 &&
        (isString(value) || isNumber(value) || isBoolean(value))
      ) {
        list.push(toString(value));
      } else if (isArray(value)) {
        arr = true;
        // Search each item in the array.
        for (let i = 0, len = value.length; i < len; i += 1) {
          deepGet(value[i], path, index + 1);
        }
      } else if (path.length) {
        // An object. Recurse further.
        deepGet(value, path, index + 1);
      }
    }
  };

  // Backwards compatibility (since path used to be a string)
  deepGet(obj, isString(path) ? path.split('.') : path, 0);

  return arr ? list : list[0]
}

const MatchOptions = {
  // Whether the matches should be included in the result set. When `true`, each record in the result
  // set will include the indices of the matched characters.
  // These can consequently be used for highlighting purposes.
  includeMatches: false,
  // When `true`, the matching function will continue to the end of a search pattern even if
  // a perfect match has already been located in the string.
  findAllMatches: false,
  // Minimum number of characters that must be matched before a result is considered a match
  minMatchCharLength: 1
};

const BasicOptions = {
  // When `true`, the algorithm continues searching to the end of the input even if a perfect
  // match is found before the end of the same input.
  isCaseSensitive: false,
  // When true, the matching function will continue to the end of a search pattern even if
  includeScore: false,
  // List of properties that will be searched. This also supports nested properties.
  keys: [],
  // Whether to sort the result list, by score
  shouldSort: true,
  // Default sort function: sort by ascending score, ascending index
  sortFn: (a, b) =>
    a.score === b.score ? (a.idx < b.idx ? -1 : 1) : a.score < b.score ? -1 : 1
};

const FuzzyOptions = {
  // Approximately where in the text is the pattern expected to be found?
  location: 0,
  // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
  // (of both letters and location), a threshold of '1.0' would match anything.
  threshold: 0.6,
  // Determines how close the match must be to the fuzzy location (specified above).
  // An exact letter match which is 'distance' characters away from the fuzzy location
  // would score as a complete mismatch. A distance of '0' requires the match be at
  // the exact location specified, a threshold of '1000' would require a perfect match
  // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
  distance: 100
};

const AdvancedOptions = {
  // When `true`, it enables the use of unix-like search commands
  useExtendedSearch: false,
  // The get function to use when fetching an object's properties.
  // The default will search nested paths *ie foo.bar.baz*
  getFn: get,
  // When `true`, search will ignore `location` and `distance`, so it won't matter
  // where in the string the pattern appears.
  // More info: https://fusejs.io/concepts/scoring-theory.html#fuzziness-score
  ignoreLocation: false,
  // When `true`, the calculation for the relevance score (used for sorting) will
  // ignore the field-length norm.
  // More info: https://fusejs.io/concepts/scoring-theory.html#field-length-norm
  ignoreFieldNorm: false
};

var Config = {
  ...BasicOptions,
  ...MatchOptions,
  ...FuzzyOptions,
  ...AdvancedOptions
};

const SPACE = /[^ ]+/g;

// Field-length norm: the shorter the field, the higher the weight.
// Set to 3 decimals to reduce index size.
function norm(mantissa = 3) {
  const cache = new Map();
  const m = Math.pow(10, mantissa);

  return {
    get(value) {
      const numTokens = value.match(SPACE).length;

      if (cache.has(numTokens)) {
        return cache.get(numTokens)
      }

      const norm = 1 / Math.sqrt(numTokens);

      // In place of `toFixed(mantissa)`, for faster computation
      const n = parseFloat(Math.round(norm * m) / m);

      cache.set(numTokens, n);

      return n
    },
    clear() {
      cache.clear();
    }
  }
}

class FuseIndex {
  constructor({ getFn = Config.getFn } = {}) {
    this.norm = norm(3);
    this.getFn = getFn;
    this.isCreated = false;

    this.setIndexRecords();
  }
  setSources(docs = []) {
    this.docs = docs;
  }
  setIndexRecords(records = []) {
    this.records = records;
  }
  setKeys(keys = []) {
    this.keys = keys;
    this._keysMap = {};
    keys.forEach((key, idx) => {
      this._keysMap[key.id] = idx;
    });
  }
  create() {
    if (this.isCreated || !this.docs.length) {
      return
    }

    this.isCreated = true;

    // List is Array<String>
    if (isString(this.docs[0])) {
      this.docs.forEach((doc, docIndex) => {
        this._addString(doc, docIndex);
      });
    } else {
      // List is Array<Object>
      this.docs.forEach((doc, docIndex) => {
        this._addObject(doc, docIndex);
      });
    }

    this.norm.clear();
  }
  // Adds a doc to the end of the index
  add(doc) {
    const idx = this.size();

    if (isString(doc)) {
      this._addString(doc, idx);
    } else {
      this._addObject(doc, idx);
    }
  }
  // Removes the doc at the specified index of the index
  removeAt(idx) {
    this.records.splice(idx, 1);

    // Change ref index of every subsquent doc
    for (let i = idx, len = this.size(); i < len; i += 1) {
      this.records[i].i -= 1;
    }
  }
  getValueForItemAtKeyId(item, keyId) {
    return item[this._keysMap[keyId]]
  }
  size() {
    return this.records.length
  }
  _addString(doc, docIndex) {
    if (!isDefined(doc) || isBlank(doc)) {
      return
    }

    let record = {
      v: doc,
      i: docIndex,
      n: this.norm.get(doc)
    };

    this.records.push(record);
  }
  _addObject(doc, docIndex) {
    let record = { i: docIndex, $: {} };

    // Iterate over every key (i.e, path), and fetch the value at that key
    this.keys.forEach((key, keyIndex) => {
      // console.log(key)
      let value = this.getFn(doc, key.path);

      if (!isDefined(value)) {
        return
      }

      if (isArray(value)) {
        let subRecords = [];
        const stack = [{ nestedArrIndex: -1, value }];

        while (stack.length) {
          const { nestedArrIndex, value } = stack.pop();

          if (!isDefined(value)) {
            continue
          }

          if (isString(value) && !isBlank(value)) {
            let subRecord = {
              v: value,
              i: nestedArrIndex,
              n: this.norm.get(value)
            };

            subRecords.push(subRecord);
          } else if (isArray(value)) {
            value.forEach((item, k) => {
              stack.push({
                nestedArrIndex: k,
                value: item
              });
            });
          }
        }
        record.$[keyIndex] = subRecords;
      } else if (!isBlank(value)) {
        let subRecord = {
          v: value,
          n: this.norm.get(value)
        };

        record.$[keyIndex] = subRecord;
      }
    });

    this.records.push(record);
  }
  toJSON() {
    return {
      keys: this.keys,
      records: this.records
    }
  }
}

function createIndex(keys, docs, { getFn = Config.getFn } = {}) {
  const myIndex = new FuseIndex({ getFn });
  myIndex.setKeys(keys.map(createKey));
  myIndex.setSources(docs);
  myIndex.create();
  return myIndex
}

function parseIndex(data, { getFn = Config.getFn } = {}) {
  const { keys, records } = data;
  const myIndex = new FuseIndex({ getFn });
  myIndex.setKeys(keys);
  myIndex.setIndexRecords(records);
  return myIndex
}

function computeScore(
  pattern,
  {
    errors = 0,
    currentLocation = 0,
    expectedLocation = 0,
    distance = Config.distance,
    ignoreLocation = Config.ignoreLocation
  } = {}
) {
  const accuracy = errors / pattern.length;

  if (ignoreLocation) {
    return accuracy
  }

  const proximity = Math.abs(expectedLocation - currentLocation);

  if (!distance) {
    // Dodge divide by zero error.
    return proximity ? 1.0 : accuracy
  }

  return accuracy + proximity / distance
}

function convertMaskToIndices(
  matchmask = [],
  minMatchCharLength = Config.minMatchCharLength
) {
  let indices = [];
  let start = -1;
  let end = -1;
  let i = 0;

  for (let len = matchmask.length; i < len; i += 1) {
    let match = matchmask[i];
    if (match && start === -1) {
      start = i;
    } else if (!match && start !== -1) {
      end = i - 1;
      if (end - start + 1 >= minMatchCharLength) {
        indices.push([start, end]);
      }
      start = -1;
    }
  }

  // (i-1 - start) + 1 => i - start
  if (matchmask[i - 1] && i - start >= minMatchCharLength) {
    indices.push([start, i - 1]);
  }

  return indices
}

// Machine word size
const MAX_BITS = 32;

function search(
  text,
  pattern,
  patternAlphabet,
  {
    location = Config.location,
    distance = Config.distance,
    threshold = Config.threshold,
    findAllMatches = Config.findAllMatches,
    minMatchCharLength = Config.minMatchCharLength,
    includeMatches = Config.includeMatches,
    ignoreLocation = Config.ignoreLocation
  } = {}
) {
  if (pattern.length > MAX_BITS) {
    throw new Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS))
  }

  const patternLen = pattern.length;
  // Set starting location at beginning text and initialize the alphabet.
  const textLen = text.length;
  // Handle the case when location > text.length
  const expectedLocation = Math.max(0, Math.min(location, textLen));
  // Highest score beyond which we give up.
  let currentThreshold = threshold;
  // Is there a nearby exact match? (speedup)
  let bestLocation = expectedLocation;

  // Performance: only computer matches when the minMatchCharLength > 1
  // OR if `includeMatches` is true.
  const computeMatches = minMatchCharLength > 1 || includeMatches;
  // A mask of the matches, used for building the indices
  const matchMask = computeMatches ? Array(textLen) : [];

  let index;

  // Get all exact matches, here for speed up
  while ((index = text.indexOf(pattern, bestLocation)) > -1) {
    let score = computeScore(pattern, {
      currentLocation: index,
      expectedLocation,
      distance,
      ignoreLocation
    });

    currentThreshold = Math.min(score, currentThreshold);
    bestLocation = index + patternLen;

    if (computeMatches) {
      let i = 0;
      while (i < patternLen) {
        matchMask[index + i] = 1;
        i += 1;
      }
    }
  }

  // Reset the best location
  bestLocation = -1;

  let lastBitArr = [];
  let finalScore = 1;
  let binMax = patternLen + textLen;

  const mask = 1 << (patternLen - 1);

  for (let i = 0; i < patternLen; i += 1) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from the match location we can stray
    // at this error level.
    let binMin = 0;
    let binMid = binMax;

    while (binMin < binMid) {
      const score = computeScore(pattern, {
        errors: i,
        currentLocation: expectedLocation + binMid,
        expectedLocation,
        distance,
        ignoreLocation
      });

      if (score <= currentThreshold) {
        binMin = binMid;
      } else {
        binMax = binMid;
      }

      binMid = Math.floor((binMax - binMin) / 2 + binMin);
    }

    // Use the result from this iteration as the maximum for the next.
    binMax = binMid;

    let start = Math.max(1, expectedLocation - binMid + 1);
    let finish = findAllMatches
      ? textLen
      : Math.min(expectedLocation + binMid, textLen) + patternLen;

    // Initialize the bit array
    let bitArr = Array(finish + 2);

    bitArr[finish + 1] = (1 << i) - 1;

    for (let j = finish; j >= start; j -= 1) {
      let currentLocation = j - 1;
      let charMatch = patternAlphabet[text.charAt(currentLocation)];

      if (computeMatches) {
        // Speed up: quick bool to int conversion (i.e, `charMatch ? 1 : 0`)
        matchMask[currentLocation] = +!!charMatch;
      }

      // First pass: exact match
      bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch;

      // Subsequent passes: fuzzy match
      if (i) {
        bitArr[j] |=
          ((lastBitArr[j + 1] | lastBitArr[j]) << 1) | 1 | lastBitArr[j + 1];
      }

      if (bitArr[j] & mask) {
        finalScore = computeScore(pattern, {
          errors: i,
          currentLocation,
          expectedLocation,
          distance,
          ignoreLocation
        });

        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (finalScore <= currentThreshold) {
          // Indeed it is
          currentThreshold = finalScore;
          bestLocation = currentLocation;

          // Already passed `loc`, downhill from here on in.
          if (bestLocation <= expectedLocation) {
            break
          }

          // When passing `bestLocation`, don't exceed our current distance from `expectedLocation`.
          start = Math.max(1, 2 * expectedLocation - bestLocation);
        }
      }
    }

    // No hope for a (better) match at greater error levels.
    const score = computeScore(pattern, {
      errors: i + 1,
      currentLocation: expectedLocation,
      expectedLocation,
      distance,
      ignoreLocation
    });

    if (score > currentThreshold) {
      break
    }

    lastBitArr = bitArr;
  }

  const result = {
    isMatch: bestLocation >= 0,
    // Count exact matches (those with a score of 0) to be "almost" exact
    score: Math.max(0.001, finalScore)
  };

  if (computeMatches) {
    const indices = convertMaskToIndices(matchMask, minMatchCharLength);
    if (!indices.length) {
      result.isMatch = false;
    } else if (includeMatches) {
      result.indices = indices;
    }
  }

  return result
}

function createPatternAlphabet(pattern) {
  let mask = {};

  for (let i = 0, len = pattern.length; i < len; i += 1) {
    const char = pattern.charAt(i);
    mask[char] = (mask[char] || 0) | (1 << (len - i - 1));
  }

  return mask
}

class BitapSearch {
  constructor(
    pattern,
    {
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance,
      includeMatches = Config.includeMatches,
      findAllMatches = Config.findAllMatches,
      minMatchCharLength = Config.minMatchCharLength,
      isCaseSensitive = Config.isCaseSensitive,
      ignoreLocation = Config.ignoreLocation
    } = {}
  ) {
    this.options = {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreLocation
    };

    this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();

    this.chunks = [];

    if (!this.pattern.length) {
      return
    }

    const addChunk = (pattern, startIndex) => {
      this.chunks.push({
        pattern,
        alphabet: createPatternAlphabet(pattern),
        startIndex
      });
    };

    const len = this.pattern.length;

    if (len > MAX_BITS) {
      let i = 0;
      const remainder = len % MAX_BITS;
      const end = len - remainder;

      while (i < end) {
        addChunk(this.pattern.substr(i, MAX_BITS), i);
        i += MAX_BITS;
      }

      if (remainder) {
        const startIndex = len - MAX_BITS;
        addChunk(this.pattern.substr(startIndex), startIndex);
      }
    } else {
      addChunk(this.pattern, 0);
    }
  }

  searchIn(text) {
    const { isCaseSensitive, includeMatches } = this.options;

    if (!isCaseSensitive) {
      text = text.toLowerCase();
    }

    // Exact match
    if (this.pattern === text) {
      let result = {
        isMatch: true,
        score: 0
      };

      if (includeMatches) {
        result.indices = [[0, text.length - 1]];
      }

      return result
    }

    // Otherwise, use Bitap algorithm
    const {
      location,
      distance,
      threshold,
      findAllMatches,
      minMatchCharLength,
      ignoreLocation
    } = this.options;

    let allIndices = [];
    let totalScore = 0;
    let hasMatches = false;

    this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
      const { isMatch, score, indices } = search(text, pattern, alphabet, {
        location: location + startIndex,
        distance,
        threshold,
        findAllMatches,
        minMatchCharLength,
        includeMatches,
        ignoreLocation
      });

      if (isMatch) {
        hasMatches = true;
      }

      totalScore += score;

      if (isMatch && indices) {
        allIndices = [...allIndices, ...indices];
      }
    });

    let result = {
      isMatch: hasMatches,
      score: hasMatches ? totalScore / this.chunks.length : 1
    };

    if (hasMatches && includeMatches) {
      result.indices = allIndices;
    }

    return result
  }
}

class BaseMatch {
  constructor(pattern) {
    this.pattern = pattern;
  }
  static isMultiMatch(pattern) {
    return getMatch(pattern, this.multiRegex)
  }
  static isSingleMatch(pattern) {
    return getMatch(pattern, this.singleRegex)
  }
  search(/*text*/) {}
}

function getMatch(pattern, exp) {
  const matches = pattern.match(exp);
  return matches ? matches[1] : null
}

// Token: 'file

class ExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'exact'
  }
  static get multiRegex() {
    return /^="(.*)"$/
  }
  static get singleRegex() {
    return /^=(.*)$/
  }
  search(text) {
    const isMatch = text === this.pattern;

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    }
  }
}

// Token: !fire

class InverseExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'inverse-exact'
  }
  static get multiRegex() {
    return /^!"(.*)"$/
  }
  static get singleRegex() {
    return /^!(.*)$/
  }
  search(text) {
    const index = text.indexOf(this.pattern);
    const isMatch = index === -1;

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    }
  }
}

// Token: ^file

class PrefixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'prefix-exact'
  }
  static get multiRegex() {
    return /^\^"(.*)"$/
  }
  static get singleRegex() {
    return /^\^(.*)$/
  }
  search(text) {
    const isMatch = text.startsWith(this.pattern);

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    }
  }
}

// Token: !^fire

class InversePrefixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'inverse-prefix-exact'
  }
  static get multiRegex() {
    return /^!\^"(.*)"$/
  }
  static get singleRegex() {
    return /^!\^(.*)$/
  }
  search(text) {
    const isMatch = !text.startsWith(this.pattern);

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    }
  }
}

// Token: .file$

class SuffixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'suffix-exact'
  }
  static get multiRegex() {
    return /^"(.*)"\$$/
  }
  static get singleRegex() {
    return /^(.*)\$$/
  }
  search(text) {
    const isMatch = text.endsWith(this.pattern);

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [text.length - this.pattern.length, text.length - 1]
    }
  }
}

// Token: !.file$

class InverseSuffixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'inverse-suffix-exact'
  }
  static get multiRegex() {
    return /^!"(.*)"\$$/
  }
  static get singleRegex() {
    return /^!(.*)\$$/
  }
  search(text) {
    const isMatch = !text.endsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    }
  }
}

class FuzzyMatch extends BaseMatch {
  constructor(
    pattern,
    {
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance,
      includeMatches = Config.includeMatches,
      findAllMatches = Config.findAllMatches,
      minMatchCharLength = Config.minMatchCharLength,
      isCaseSensitive = Config.isCaseSensitive,
      ignoreLocation = Config.ignoreLocation
    } = {}
  ) {
    super(pattern);
    this._bitapSearch = new BitapSearch(pattern, {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreLocation
    });
  }
  static get type() {
    return 'fuzzy'
  }
  static get multiRegex() {
    return /^"(.*)"$/
  }
  static get singleRegex() {
    return /^(.*)$/
  }
  search(text) {
    return this._bitapSearch.searchIn(text)
  }
}

// Token: 'file

class IncludeMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return 'include'
  }
  static get multiRegex() {
    return /^'"(.*)"$/
  }
  static get singleRegex() {
    return /^'(.*)$/
  }
  search(text) {
    let location = 0;
    let index;

    const indices = [];
    const patternLen = this.pattern.length;

    // Get all exact matches
    while ((index = text.indexOf(this.pattern, location)) > -1) {
      location = index + patternLen;
      indices.push([index, location - 1]);
    }

    const isMatch = !!indices.length;

    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices
    }
  }
}

// ❗Order is important. DO NOT CHANGE.
const searchers = [
  ExactMatch,
  IncludeMatch,
  PrefixExactMatch,
  InversePrefixExactMatch,
  InverseSuffixExactMatch,
  SuffixExactMatch,
  InverseExactMatch,
  FuzzyMatch
];

const searchersLen = searchers.length;

// Regex to split by spaces, but keep anything in quotes together
const SPACE_RE = / +(?=([^\"]*\"[^\"]*\")*[^\"]*$)/;
const OR_TOKEN = '|';

// Return a 2D array representation of the query, for simpler parsing.
// Example:
// "^core go$ | rb$ | py$ xy$" => [["^core", "go$"], ["rb$"], ["py$", "xy$"]]
function parseQuery(pattern, options = {}) {
  return pattern.split(OR_TOKEN).map((item) => {
    let query = item
      .trim()
      .split(SPACE_RE)
      .filter((item) => item && !!item.trim());

    let results = [];
    for (let i = 0, len = query.length; i < len; i += 1) {
      const queryItem = query[i];

      // 1. Handle multiple query match (i.e, once that are quoted, like `"hello world"`)
      let found = false;
      let idx = -1;
      while (!found && ++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isMultiMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          found = true;
        }
      }

      if (found) {
        continue
      }

      // 2. Handle single query matches (i.e, once that are *not* quoted)
      idx = -1;
      while (++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isSingleMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          break
        }
      }
    }

    return results
  })
}

// These extended matchers can return an array of matches, as opposed
// to a singl match
const MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]);

/**
 * Command-like searching
 * ======================
 *
 * Given multiple search terms delimited by spaces.e.g. `^jscript .python$ ruby !java`,
 * search in a given text.
 *
 * Search syntax:
 *
 * | Token       | Match type                 | Description                            |
 * | ----------- | -------------------------- | -------------------------------------- |
 * | `jscript`   | fuzzy-match                | Items that fuzzy match `jscript`       |
 * | `=scheme`   | exact-match                | Items that are `scheme`                |
 * | `'python`   | include-match              | Items that include `python`            |
 * | `!ruby`     | inverse-exact-match        | Items that do not include `ruby`       |
 * | `^java`     | prefix-exact-match         | Items that start with `java`           |
 * | `!^earlang` | inverse-prefix-exact-match | Items that do not start with `earlang` |
 * | `.js$`      | suffix-exact-match         | Items that end with `.js`              |
 * | `!.go$`     | inverse-suffix-exact-match | Items that do not end with `.go`       |
 *
 * A single pipe character acts as an OR operator. For example, the following
 * query matches entries that start with `core` and end with either`go`, `rb`,
 * or`py`.
 *
 * ```
 * ^core go$ | rb$ | py$
 * ```
 */
class ExtendedSearch {
  constructor(
    pattern,
    {
      isCaseSensitive = Config.isCaseSensitive,
      includeMatches = Config.includeMatches,
      minMatchCharLength = Config.minMatchCharLength,
      ignoreLocation = Config.ignoreLocation,
      findAllMatches = Config.findAllMatches,
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance
    } = {}
  ) {
    this.query = null;
    this.options = {
      isCaseSensitive,
      includeMatches,
      minMatchCharLength,
      findAllMatches,
      ignoreLocation,
      location,
      threshold,
      distance
    };

    this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    this.query = parseQuery(this.pattern, this.options);
  }

  static condition(_, options) {
    return options.useExtendedSearch
  }

  searchIn(text) {
    const query = this.query;

    if (!query) {
      return {
        isMatch: false,
        score: 1
      }
    }

    const { includeMatches, isCaseSensitive } = this.options;

    text = isCaseSensitive ? text : text.toLowerCase();

    let numMatches = 0;
    let allIndices = [];
    let totalScore = 0;

    // ORs
    for (let i = 0, qLen = query.length; i < qLen; i += 1) {
      const searchers = query[i];

      // Reset indices
      allIndices.length = 0;
      numMatches = 0;

      // ANDs
      for (let j = 0, pLen = searchers.length; j < pLen; j += 1) {
        const searcher = searchers[j];
        const { isMatch, indices, score } = searcher.search(text);

        if (isMatch) {
          numMatches += 1;
          totalScore += score;
          if (includeMatches) {
            const type = searcher.constructor.type;
            if (MultiMatchSet.has(type)) {
              allIndices = [...allIndices, ...indices];
            } else {
              allIndices.push(indices);
            }
          }
        } else {
          totalScore = 0;
          numMatches = 0;
          allIndices.length = 0;
          break
        }
      }

      // OR condition, so if TRUE, return
      if (numMatches) {
        let result = {
          isMatch: true,
          score: totalScore / numMatches
        };

        if (includeMatches) {
          result.indices = allIndices;
        }

        return result
      }
    }

    // Nothing was matched
    return {
      isMatch: false,
      score: 1
    }
  }
}

const registeredSearchers = [];

function register(...args) {
  registeredSearchers.push(...args);
}

function createSearcher(pattern, options) {
  for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
    let searcherClass = registeredSearchers[i];
    if (searcherClass.condition(pattern, options)) {
      return new searcherClass(pattern, options)
    }
  }

  return new BitapSearch(pattern, options)
}

const LogicalOperator = {
  AND: '$and',
  OR: '$or'
};

const KeyType = {
  PATH: '$path',
  PATTERN: '$val'
};

const isExpression = (query) =>
  !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);

const isPath = (query) => !!query[KeyType.PATH];

const isLeaf = (query) =>
  !isArray(query) && isObject(query) && !isExpression(query);

const convertToExplicit = (query) => ({
  [LogicalOperator.AND]: Object.keys(query).map((key) => ({
    [key]: query[key]
  }))
});

// When `auto` is `true`, the parse function will infer and initialize and add
// the appropriate `Searcher` instance
function parse(query, options, { auto = true } = {}) {
  const next = (query) => {
    let keys = Object.keys(query);

    const isQueryPath = isPath(query);

    if (!isQueryPath && keys.length > 1 && !isExpression(query)) {
      return next(convertToExplicit(query))
    }

    if (isLeaf(query)) {
      const key = isQueryPath ? query[KeyType.PATH] : keys[0];

      const pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];

      if (!isString(pattern)) {
        throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key))
      }

      const obj = {
        keyId: createKeyId(key),
        pattern
      };

      if (auto) {
        obj.searcher = createSearcher(pattern, options);
      }

      return obj
    }

    let node = {
      children: [],
      operator: keys[0]
    };

    keys.forEach((key) => {
      const value = query[key];

      if (isArray(value)) {
        value.forEach((item) => {
          node.children.push(next(item));
        });
      }
    });

    return node
  };

  if (!isExpression(query)) {
    query = convertToExplicit(query);
  }

  return next(query)
}

// Practical scoring function
function computeScore$1(
  results,
  { ignoreFieldNorm = Config.ignoreFieldNorm }
) {
  results.forEach((result) => {
    let totalScore = 1;

    result.matches.forEach(({ key, norm, score }) => {
      const weight = key ? key.weight : null;

      totalScore *= Math.pow(
        score === 0 && weight ? Number.EPSILON : score,
        (weight || 1) * (ignoreFieldNorm ? 1 : norm)
      );
    });

    result.score = totalScore;
  });
}

function transformMatches(result, data) {
  const matches = result.matches;
  data.matches = [];

  if (!isDefined(matches)) {
    return
  }

  matches.forEach((match) => {
    if (!isDefined(match.indices) || !match.indices.length) {
      return
    }

    const { indices, value } = match;

    let obj = {
      indices,
      value
    };

    if (match.key) {
      obj.key = match.key.src;
    }

    if (match.idx > -1) {
      obj.refIndex = match.idx;
    }

    data.matches.push(obj);
  });
}

function transformScore(result, data) {
  data.score = result.score;
}

function format(
  results,
  docs,
  {
    includeMatches = Config.includeMatches,
    includeScore = Config.includeScore
  } = {}
) {
  const transformers = [];

  if (includeMatches) transformers.push(transformMatches);
  if (includeScore) transformers.push(transformScore);

  return results.map((result) => {
    const { idx } = result;

    const data = {
      item: docs[idx],
      refIndex: idx
    };

    if (transformers.length) {
      transformers.forEach((transformer) => {
        transformer(result, data);
      });
    }

    return data
  })
}

class Fuse {
  constructor(docs, options = {}, index) {
    this.options = { ...Config, ...options };

    if (
      this.options.useExtendedSearch &&
      !true
    ) {
      throw new Error(EXTENDED_SEARCH_UNAVAILABLE)
    }

    this._keyStore = new KeyStore(this.options.keys);

    this.setCollection(docs, index);
  }

  setCollection(docs, index) {
    this._docs = docs;

    if (index && !(index instanceof FuseIndex)) {
      throw new Error(INCORRECT_INDEX_TYPE)
    }

    this._myIndex =
      index ||
      createIndex(this.options.keys, this._docs, {
        getFn: this.options.getFn
      });
  }

  add(doc) {
    if (!isDefined(doc)) {
      return
    }

    this._docs.push(doc);
    this._myIndex.add(doc);
  }

  remove(predicate = (/* doc, idx */) => false) {
    const results = [];

    for (let i = 0, len = this._docs.length; i < len; i += 1) {
      const doc = this._docs[i];
      if (predicate(doc, i)) {
        this.removeAt(i);
        i -= 1;
        len -= 1;

        results.push(doc);
      }
    }

    return results
  }

  removeAt(idx) {
    this._docs.splice(idx, 1);
    this._myIndex.removeAt(idx);
  }

  getIndex() {
    return this._myIndex
  }

  search(query, { limit = -1 } = {}) {
    const {
      includeMatches,
      includeScore,
      shouldSort,
      sortFn,
      ignoreFieldNorm
    } = this.options;

    let results = isString(query)
      ? isString(this._docs[0])
        ? this._searchStringList(query)
        : this._searchObjectList(query)
      : this._searchLogical(query);

    computeScore$1(results, { ignoreFieldNorm });

    if (shouldSort) {
      results.sort(sortFn);
    }

    if (isNumber(limit) && limit > -1) {
      results = results.slice(0, limit);
    }

    return format(results, this._docs, {
      includeMatches,
      includeScore
    })
  }

  _searchStringList(query) {
    const searcher = createSearcher(query, this.options);
    const { records } = this._myIndex;
    const results = [];

    // Iterate over every string in the index
    records.forEach(({ v: text, i: idx, n: norm }) => {
      if (!isDefined(text)) {
        return
      }

      const { isMatch, score, indices } = searcher.searchIn(text);

      if (isMatch) {
        results.push({
          item: text,
          idx,
          matches: [{ score, value: text, norm, indices }]
        });
      }
    });

    return results
  }

  _searchLogical(query) {

    const expression = parse(query, this.options);

    const evaluate = (node, item, idx) => {
      if (!node.children) {
        const { keyId, searcher } = node;

        const matches = this._findMatches({
          key: this._keyStore.get(keyId),
          value: this._myIndex.getValueForItemAtKeyId(item, keyId),
          searcher
        });

        if (matches && matches.length) {
          return [
            {
              idx,
              item,
              matches
            }
          ]
        }

        return []
      }

      /*eslint indent: [2, 2, {"SwitchCase": 1}]*/
      switch (node.operator) {
        case LogicalOperator.AND: {
          const res = [];
          for (let i = 0, len = node.children.length; i < len; i += 1) {
            const child = node.children[i];
            const result = evaluate(child, item, idx);
            if (result.length) {
              res.push(...result);
            } else {
              return []
            }
          }
          return res
        }
        case LogicalOperator.OR: {
          const res = [];
          for (let i = 0, len = node.children.length; i < len; i += 1) {
            const child = node.children[i];
            const result = evaluate(child, item, idx);
            if (result.length) {
              res.push(...result);
              break
            }
          }
          return res
        }
      }
    };

    const records = this._myIndex.records;
    const resultMap = {};
    const results = [];

    records.forEach(({ $: item, i: idx }) => {
      if (isDefined(item)) {
        let expResults = evaluate(expression, item, idx);

        if (expResults.length) {
          // Dedupe when adding
          if (!resultMap[idx]) {
            resultMap[idx] = { idx, item, matches: [] };
            results.push(resultMap[idx]);
          }
          expResults.forEach(({ matches }) => {
            resultMap[idx].matches.push(...matches);
          });
        }
      }
    });

    return results
  }

  _searchObjectList(query) {
    const searcher = createSearcher(query, this.options);
    const { keys, records } = this._myIndex;
    const results = [];

    // List is Array<Object>
    records.forEach(({ $: item, i: idx }) => {
      if (!isDefined(item)) {
        return
      }

      let matches = [];

      // Iterate over every key (i.e, path), and fetch the value at that key
      keys.forEach((key, keyIndex) => {
        matches.push(
          ...this._findMatches({
            key,
            value: item[keyIndex],
            searcher
          })
        );
      });

      if (matches.length) {
        results.push({
          idx,
          item,
          matches
        });
      }
    });

    return results
  }
  _findMatches({ key, value, searcher }) {
    if (!isDefined(value)) {
      return []
    }

    let matches = [];

    if (isArray(value)) {
      value.forEach(({ v: text, i: idx, n: norm }) => {
        if (!isDefined(text)) {
          return
        }

        const { isMatch, score, indices } = searcher.searchIn(text);

        if (isMatch) {
          matches.push({
            score,
            key,
            value: text,
            idx,
            norm,
            indices
          });
        }
      });
    } else {
      const { v: text, n: norm } = value;

      const { isMatch, score, indices } = searcher.searchIn(text);

      if (isMatch) {
        matches.push({ score, key, value: text, norm, indices });
      }
    }

    return matches
  }
}

Fuse.version = '6.4.6';
Fuse.createIndex = createIndex;
Fuse.parseIndex = parseIndex;
Fuse.config = Config;

{
  Fuse.parseQuery = parse;
}

{
  register(ExtendedSearch);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Fuse);


/***/ }),

/***/ "./node_modules/inherits/inherits_browser.js":
/*!***************************************************!*\
  !*** ./node_modules/inherits/inherits_browser.js ***!
  \***************************************************/
/***/ ((module) => {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),

/***/ "./node_modules/nearley/lib/nearley.js":
/*!*********************************************!*\
  !*** ./node_modules/nearley/lib/nearley.js ***!
  \*********************************************/
/***/ (function(module) {

(function(root, factory) {
    if ( true && module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(this, function() {

    function Rule(name, symbols, postprocess) {
        this.id = ++Rule.highestId;
        this.name = name;
        this.symbols = symbols;        // a list of literal | regex class | nonterminal
        this.postprocess = postprocess;
        return this;
    }
    Rule.highestId = 0;

    Rule.prototype.toString = function(withCursorAt) {
        var symbolSequence = (typeof withCursorAt === "undefined")
                             ? this.symbols.map(getSymbolShortDisplay).join(' ')
                             : (   this.symbols.slice(0, withCursorAt).map(getSymbolShortDisplay).join(' ')
                                 + " ● "
                                 + this.symbols.slice(withCursorAt).map(getSymbolShortDisplay).join(' ')     );
        return this.name + " → " + symbolSequence;
    }


    // a State is a rule at a position from a given starting point in the input stream (reference)
    function State(rule, dot, reference, wantedBy) {
        this.rule = rule;
        this.dot = dot;
        this.reference = reference;
        this.data = [];
        this.wantedBy = wantedBy;
        this.isComplete = this.dot === rule.symbols.length;
    }

    State.prototype.toString = function() {
        return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    };

    State.prototype.nextState = function(child) {
        var state = new State(this.rule, this.dot + 1, this.reference, this.wantedBy);
        state.left = this;
        state.right = child;
        if (state.isComplete) {
            state.data = state.build();
            // Having right set here will prevent the right state and its children
            // form being garbage collected
            state.right = undefined;
        }
        return state;
    };

    State.prototype.build = function() {
        var children = [];
        var node = this;
        do {
            children.push(node.right.data);
            node = node.left;
        } while (node.left);
        children.reverse();
        return children;
    };

    State.prototype.finish = function() {
        if (this.rule.postprocess) {
            this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
        }
    };


    function Column(grammar, index) {
        this.grammar = grammar;
        this.index = index;
        this.states = [];
        this.wants = {}; // states indexed by the non-terminal they expect
        this.scannable = []; // list of states that expect a token
        this.completed = {}; // states that are nullable
    }


    Column.prototype.process = function(nextColumn) {
        var states = this.states;
        var wants = this.wants;
        var completed = this.completed;

        for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
            var state = states[w];

            if (state.isComplete) {
                state.finish();
                if (state.data !== Parser.fail) {
                    // complete
                    var wantedBy = state.wantedBy;
                    for (var i = wantedBy.length; i--; ) { // this line is hot
                        var left = wantedBy[i];
                        this.complete(left, state);
                    }

                    // special-case nullables
                    if (state.reference === this.index) {
                        // make sure future predictors of this rule get completed.
                        var exp = state.rule.name;
                        (this.completed[exp] = this.completed[exp] || []).push(state);
                    }
                }

            } else {
                // queue scannable states
                var exp = state.rule.symbols[state.dot];
                if (typeof exp !== 'string') {
                    this.scannable.push(state);
                    continue;
                }

                // predict
                if (wants[exp]) {
                    wants[exp].push(state);

                    if (completed.hasOwnProperty(exp)) {
                        var nulls = completed[exp];
                        for (var i = 0; i < nulls.length; i++) {
                            var right = nulls[i];
                            this.complete(state, right);
                        }
                    }
                } else {
                    wants[exp] = [state];
                    this.predict(exp);
                }
            }
        }
    }

    Column.prototype.predict = function(exp) {
        var rules = this.grammar.byName[exp] || [];

        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            var wantedBy = this.wants[exp];
            var s = new State(r, 0, this.index, wantedBy);
            this.states.push(s);
        }
    }

    Column.prototype.complete = function(left, right) {
        var copy = left.nextState(right);
        this.states.push(copy);
    }


    function Grammar(rules, start) {
        this.rules = rules;
        this.start = start || this.rules[0].name;
        var byName = this.byName = {};
        this.rules.forEach(function(rule) {
            if (!byName.hasOwnProperty(rule.name)) {
                byName[rule.name] = [];
            }
            byName[rule.name].push(rule);
        });
    }

    // So we can allow passing (rules, start) directly to Parser for backwards compatibility
    Grammar.fromCompiled = function(rules, start) {
        var lexer = rules.Lexer;
        if (rules.ParserStart) {
          start = rules.ParserStart;
          rules = rules.ParserRules;
        }
        var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
        var g = new Grammar(rules, start);
        g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
        return g;
    }


    function StreamLexer() {
      this.reset("");
    }

    StreamLexer.prototype.reset = function(data, state) {
        this.buffer = data;
        this.index = 0;
        this.line = state ? state.line : 1;
        this.lastLineBreak = state ? -state.col : 0;
    }

    StreamLexer.prototype.next = function() {
        if (this.index < this.buffer.length) {
            var ch = this.buffer[this.index++];
            if (ch === '\n') {
              this.line += 1;
              this.lastLineBreak = this.index;
            }
            return {value: ch};
        }
    }

    StreamLexer.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak,
      }
    }

    StreamLexer.prototype.formatError = function(token, message) {
        // nb. this gets called after consuming the offending token,
        // so the culprit is index-1
        var buffer = this.buffer;
        if (typeof buffer === 'string') {
            var lines = buffer
                .split("\n")
                .slice(
                    Math.max(0, this.line - 5), 
                    this.line
                );

            var nextLineBreak = buffer.indexOf('\n', this.index);
            if (nextLineBreak === -1) nextLineBreak = buffer.length;
            var col = this.index - this.lastLineBreak;
            var lastLineDigits = String(this.line).length;
            message += " at line " + this.line + " col " + col + ":\n\n";
            message += lines
                .map(function(line, i) {
                    return pad(this.line - lines.length + i + 1, lastLineDigits) + " " + line;
                }, this)
                .join("\n");
            message += "\n" + pad("", lastLineDigits + col) + "^\n";
            return message;
        } else {
            return message + " at index " + (this.index - 1);
        }

        function pad(n, length) {
            var s = String(n);
            return Array(length - s.length + 1).join(" ") + s;
        }
    }

    function Parser(rules, start, options) {
        if (rules instanceof Grammar) {
            var grammar = rules;
            var options = start;
        } else {
            var grammar = Grammar.fromCompiled(rules, start);
        }
        this.grammar = grammar;

        // Read options
        this.options = {
            keepHistory: false,
            lexer: grammar.lexer || new StreamLexer,
        };
        for (var key in (options || {})) {
            this.options[key] = options[key];
        }

        // Setup lexer
        this.lexer = this.options.lexer;
        this.lexerState = undefined;

        // Setup a table
        var column = new Column(grammar, 0);
        var table = this.table = [column];

        // I could be expecting anything.
        column.wants[grammar.start] = [];
        column.predict(grammar.start);
        // TODO what if start rule is nullable?
        column.process();
        this.current = 0; // token index
    }

    // create a reserved token for indicating a parse fail
    Parser.fail = {};

    Parser.prototype.feed = function(chunk) {
        var lexer = this.lexer;
        lexer.reset(chunk, this.lexerState);

        var token;
        while (true) {
            try {
                token = lexer.next();
                if (!token) {
                    break;
                }
            } catch (e) {
                // Create the next column so that the error reporter
                // can display the correctly predicted states.
                var nextColumn = new Column(this.grammar, this.current + 1);
                this.table.push(nextColumn);
                var err = new Error(this.reportLexerError(e));
                err.offset = this.current;
                err.token = e.token;
                throw err;
            }
            // We add new states to table[current+1]
            var column = this.table[this.current];

            // GC unused states
            if (!this.options.keepHistory) {
                delete this.table[this.current - 1];
            }

            var n = this.current + 1;
            var nextColumn = new Column(this.grammar, n);
            this.table.push(nextColumn);

            // Advance all tokens that expect the symbol
            var literal = token.text !== undefined ? token.text : token.value;
            var value = lexer.constructor === StreamLexer ? token.value : token;
            var scannable = column.scannable;
            for (var w = scannable.length; w--; ) {
                var state = scannable[w];
                var expect = state.rule.symbols[state.dot];
                // Try to consume the token
                // either regex or literal
                if (expect.test ? expect.test(value) :
                    expect.type ? expect.type === token.type
                                : expect.literal === literal) {
                    // Add it
                    var next = state.nextState({data: value, token: token, isToken: true, reference: n - 1});
                    nextColumn.states.push(next);
                }
            }

            // Next, for each of the rules, we either
            // (a) complete it, and try to see if the reference row expected that
            //     rule
            // (b) predict the next nonterminal it expects by adding that
            //     nonterminal's start state
            // To prevent duplication, we also keep track of rules we have already
            // added

            nextColumn.process();

            // If needed, throw an error:
            if (nextColumn.states.length === 0) {
                // No states at all! This is not good.
                var err = new Error(this.reportError(token));
                err.offset = this.current;
                err.token = token;
                throw err;
            }

            // maybe save lexer state
            if (this.options.keepHistory) {
              column.lexerState = lexer.save()
            }

            this.current++;
        }
        if (column) {
          this.lexerState = lexer.save()
        }

        // Incrementally keep track of results
        this.results = this.finish();

        // Allow chaining, for whatever it's worth
        return this;
    };

    Parser.prototype.reportLexerError = function(lexerError) {
        var tokenDisplay, lexerMessage;
        // Planning to add a token property to moo's thrown error
        // even on erroring tokens to be used in error display below
        var token = lexerError.token;
        if (token) {
            tokenDisplay = "input " + JSON.stringify(token.text[0]) + " (lexer error)";
            lexerMessage = this.lexer.formatError(token, "Syntax error");
        } else {
            tokenDisplay = "input (lexer error)";
            lexerMessage = lexerError.message;
        }
        return this.reportErrorCommon(lexerMessage, tokenDisplay);
    };

    Parser.prototype.reportError = function(token) {
        var tokenDisplay = (token.type ? token.type + " token: " : "") + JSON.stringify(token.value !== undefined ? token.value : token);
        var lexerMessage = this.lexer.formatError(token, "Syntax error");
        return this.reportErrorCommon(lexerMessage, tokenDisplay);
    };

    Parser.prototype.reportErrorCommon = function(lexerMessage, tokenDisplay) {
        var lines = [];
        lines.push(lexerMessage);
        var lastColumnIndex = this.table.length - 2;
        var lastColumn = this.table[lastColumnIndex];
        var expectantStates = lastColumn.states
            .filter(function(state) {
                var nextSymbol = state.rule.symbols[state.dot];
                return nextSymbol && typeof nextSymbol !== "string";
            });

        if (expectantStates.length === 0) {
            lines.push('Unexpected ' + tokenDisplay + '. I did not expect any more input. Here is the state of my parse table:\n');
            this.displayStateStack(lastColumn.states, lines);
        } else {
            lines.push('Unexpected ' + tokenDisplay + '. Instead, I was expecting to see one of the following:\n');
            // Display a "state stack" for each expectant state
            // - which shows you how this state came to be, step by step.
            // If there is more than one derivation, we only display the first one.
            var stateStacks = expectantStates
                .map(function(state) {
                    return this.buildFirstStateStack(state, []) || [state];
                }, this);
            // Display each state that is expecting a terminal symbol next.
            stateStacks.forEach(function(stateStack) {
                var state = stateStack[0];
                var nextSymbol = state.rule.symbols[state.dot];
                var symbolDisplay = this.getSymbolDisplay(nextSymbol);
                lines.push('A ' + symbolDisplay + ' based on:');
                this.displayStateStack(stateStack, lines);
            }, this);
        }
        lines.push("");
        return lines.join("\n");
    }
    
    Parser.prototype.displayStateStack = function(stateStack, lines) {
        var lastDisplay;
        var sameDisplayCount = 0;
        for (var j = 0; j < stateStack.length; j++) {
            var state = stateStack[j];
            var display = state.rule.toString(state.dot);
            if (display === lastDisplay) {
                sameDisplayCount++;
            } else {
                if (sameDisplayCount > 0) {
                    lines.push('    ^ ' + sameDisplayCount + ' more lines identical to this');
                }
                sameDisplayCount = 0;
                lines.push('    ' + display);
            }
            lastDisplay = display;
        }
    };

    Parser.prototype.getSymbolDisplay = function(symbol) {
        return getSymbolLongDisplay(symbol);
    };

    /*
    Builds a the first state stack. You can think of a state stack as the call stack
    of the recursive-descent parser which the Nearley parse algorithm simulates.
    A state stack is represented as an array of state objects. Within a
    state stack, the first item of the array will be the starting
    state, with each successive item in the array going further back into history.

    This function needs to be given a starting state and an empty array representing
    the visited states, and it returns an single state stack.

    */
    Parser.prototype.buildFirstStateStack = function(state, visited) {
        if (visited.indexOf(state) !== -1) {
            // Found cycle, return null
            // to eliminate this path from the results, because
            // we don't know how to display it meaningfully
            return null;
        }
        if (state.wantedBy.length === 0) {
            return [state];
        }
        var prevState = state.wantedBy[0];
        var childVisited = [state].concat(visited);
        var childResult = this.buildFirstStateStack(prevState, childVisited);
        if (childResult === null) {
            return null;
        }
        return [state].concat(childResult);
    };

    Parser.prototype.save = function() {
        var column = this.table[this.current];
        column.lexerState = this.lexerState;
        return column;
    };

    Parser.prototype.restore = function(column) {
        var index = column.index;
        this.current = index;
        this.table[index] = column;
        this.table.splice(index + 1);
        this.lexerState = column.lexerState;

        // Incrementally keep track of results
        this.results = this.finish();
    };

    // nb. deprecated: use save/restore instead!
    Parser.prototype.rewind = function(index) {
        if (!this.options.keepHistory) {
            throw new Error('set option `keepHistory` to enable rewinding')
        }
        // nb. recall column (table) indicies fall between token indicies.
        //        col 0   --   token 0   --   col 1
        this.restore(this.table[index]);
    };

    Parser.prototype.finish = function() {
        // Return the possible parsings
        var considerations = [];
        var start = this.grammar.start;
        var column = this.table[this.table.length - 1]
        column.states.forEach(function (t) {
            if (t.rule.name === start
                    && t.dot === t.rule.symbols.length
                    && t.reference === 0
                    && t.data !== Parser.fail) {
                considerations.push(t);
            }
        });
        return considerations.map(function(c) {return c.data; });
    };

    function getSymbolLongDisplay(symbol) {
        var type = typeof symbol;
        if (type === "string") {
            return symbol;
        } else if (type === "object") {
            if (symbol.literal) {
                return JSON.stringify(symbol.literal);
            } else if (symbol instanceof RegExp) {
                return 'character matching ' + symbol;
            } else if (symbol.type) {
                return symbol.type + ' token';
            } else if (symbol.test) {
                return 'token matching ' + String(symbol.test);
            } else {
                throw new Error('Unknown symbol type: ' + symbol);
            }
        }
    }

    function getSymbolShortDisplay(symbol) {
        var type = typeof symbol;
        if (type === "string") {
            return symbol;
        } else if (type === "object") {
            if (symbol.literal) {
                return JSON.stringify(symbol.literal);
            } else if (symbol instanceof RegExp) {
                return symbol.toString();
            } else if (symbol.type) {
                return '%' + symbol.type;
            } else if (symbol.test) {
                return '<' + String(symbol.test) + '>';
            } else {
                throw new Error('Unknown symbol type: ' + symbol);
            }
        }
    }

    return {
        Parser: Parser,
        Grammar: Grammar,
        Rule: Rule,
    };

}));


/***/ }),

/***/ "./node_modules/ramda/es/bind.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/bind.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_arity_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_arity.js */ "./node_modules/ramda/es/internal/_arity.js");
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");


/**
 * Creates a function that is bound to a context.
 * Note: `R.bind` does not provide the additional argument-binding capabilities of
 * [Function.prototype.bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind).
 *
 * @func
 * @memberOf R
 * @since v0.6.0
 * @category Function
 * @category Object
 * @sig (* -> *) -> {*} -> (* -> *)
 * @param {Function} fn The function to bind to context
 * @param {Object} thisObj The context to bind `fn` to
 * @return {Function} A function that will execute in the context of `thisObj`.
 * @see R.partial
 * @example
 *
 *      const log = R.bind(console.log, console);
 *      R.pipe(R.assoc('a', 2), R.tap(log), R.assoc('a', 3))({a: 1}); //=> {a: 3}
 *      // logs {a: 2}
 * @symb R.bind(f, o)(a, b) = f.call(o, a, b)
 */

var bind =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function bind(fn, thisObj) {
  return (0,_internal_arity_js__WEBPACK_IMPORTED_MODULE_1__.default)(fn.length, function () {
    return fn.apply(thisObj, arguments);
  });
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (bind);

/***/ }),

/***/ "./node_modules/ramda/es/curryN.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/curryN.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_arity_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./internal/_arity.js */ "./node_modules/ramda/es/internal/_arity.js");
/* harmony import */ var _internal_curry1_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _internal_curryN_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./internal/_curryN.js */ "./node_modules/ramda/es/internal/_curryN.js");




/**
 * Returns a curried equivalent of the provided function, with the specified
 * arity. The curried function has two unusual capabilities. First, its
 * arguments needn't be provided one at a time. If `g` is `R.curryN(3, f)`, the
 * following are equivalent:
 *
 *   - `g(1)(2)(3)`
 *   - `g(1)(2, 3)`
 *   - `g(1, 2)(3)`
 *   - `g(1, 2, 3)`
 *
 * Secondly, the special placeholder value [`R.__`](#__) may be used to specify
 * "gaps", allowing partial application of any combination of arguments,
 * regardless of their positions. If `g` is as above and `_` is [`R.__`](#__),
 * the following are equivalent:
 *
 *   - `g(1, 2, 3)`
 *   - `g(_, 2, 3)(1)`
 *   - `g(_, _, 3)(1)(2)`
 *   - `g(_, _, 3)(1, 2)`
 *   - `g(_, 2)(1)(3)`
 *   - `g(_, 2)(1, 3)`
 *   - `g(_, 2)(_, 3)(1)`
 *
 * @func
 * @memberOf R
 * @since v0.5.0
 * @category Function
 * @sig Number -> (* -> a) -> (* -> a)
 * @param {Number} length The arity for the returned function.
 * @param {Function} fn The function to curry.
 * @return {Function} A new, curried function.
 * @see R.curry
 * @example
 *
 *      const sumArgs = (...args) => R.sum(args);
 *
 *      const curriedAddFourNumbers = R.curryN(4, sumArgs);
 *      const f = curriedAddFourNumbers(1, 2);
 *      const g = f(3);
 *      g(4); //=> 10
 */

var curryN =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function curryN(length, fn) {
  if (length === 1) {
    return (0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_1__.default)(fn);
  }

  return (0,_internal_arity_js__WEBPACK_IMPORTED_MODULE_2__.default)(length, (0,_internal_curryN_js__WEBPACK_IMPORTED_MODULE_3__.default)(length, [], fn));
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (curryN);

/***/ }),

/***/ "./node_modules/ramda/es/defaultTo.js":
/*!********************************************!*\
  !*** ./node_modules/ramda/es/defaultTo.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");

/**
 * Returns the second argument if it is not `null`, `undefined` or `NaN`;
 * otherwise the first argument is returned.
 *
 * @func
 * @memberOf R
 * @since v0.10.0
 * @category Logic
 * @sig a -> b -> a | b
 * @param {a} default The default value.
 * @param {b} val `val` will be returned instead of `default` unless `val` is `null`, `undefined` or `NaN`.
 * @return {*} The second value if it is not `null`, `undefined` or `NaN`, otherwise the default value
 * @example
 *
 *      const defaultTo42 = R.defaultTo(42);
 *
 *      defaultTo42(null);  //=> 42
 *      defaultTo42(undefined);  //=> 42
 *      defaultTo42(false);  //=> false
 *      defaultTo42('Ramda');  //=> 'Ramda'
 *      // parseInt('string') results in NaN
 *      defaultTo42(parseInt('string')); //=> 42
 */

var defaultTo =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function defaultTo(d, v) {
  return v == null || v !== v ? d : v;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (defaultTo);

/***/ }),

/***/ "./node_modules/ramda/es/differenceWith.js":
/*!*************************************************!*\
  !*** ./node_modules/ramda/es/differenceWith.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_includesWith_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_includesWith.js */ "./node_modules/ramda/es/internal/_includesWith.js");
/* harmony import */ var _internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry3.js */ "./node_modules/ramda/es/internal/_curry3.js");


/**
 * Finds the set (i.e. no duplicates) of all elements in the first list not
 * contained in the second list. Duplication is determined according to the
 * value returned by applying the supplied predicate to two list elements.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category Relation
 * @sig ((a, a) -> Boolean) -> [a] -> [a] -> [a]
 * @param {Function} pred A predicate used to test whether two items are equal.
 * @param {Array} list1 The first list.
 * @param {Array} list2 The second list.
 * @return {Array} The elements in `list1` that are not in `list2`.
 * @see R.difference, R.symmetricDifference, R.symmetricDifferenceWith
 * @example
 *
 *      const cmp = (x, y) => x.a === y.a;
 *      const l1 = [{a: 1}, {a: 2}, {a: 3}];
 *      const l2 = [{a: 3}, {a: 4}];
 *      R.differenceWith(cmp, l1, l2); //=> [{a: 1}, {a: 2}]
 */

var differenceWith =
/*#__PURE__*/
(0,_internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__.default)(function differenceWith(pred, first, second) {
  var out = [];
  var idx = 0;
  var firstLen = first.length;

  while (idx < firstLen) {
    if (!(0,_internal_includesWith_js__WEBPACK_IMPORTED_MODULE_1__.default)(pred, first[idx], second) && !(0,_internal_includesWith_js__WEBPACK_IMPORTED_MODULE_1__.default)(pred, first[idx], out)) {
      out.push(first[idx]);
    }

    idx += 1;
  }

  return out;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (differenceWith);

/***/ }),

/***/ "./node_modules/ramda/es/equals.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/equals.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _internal_equals_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_equals.js */ "./node_modules/ramda/es/internal/_equals.js");


/**
 * Returns `true` if its arguments are equivalent, `false` otherwise. Handles
 * cyclical data structures.
 *
 * Dispatches symmetrically to the `equals` methods of both arguments, if
 * present.
 *
 * @func
 * @memberOf R
 * @since v0.15.0
 * @category Relation
 * @sig a -> b -> Boolean
 * @param {*} a
 * @param {*} b
 * @return {Boolean}
 * @example
 *
 *      R.equals(1, 1); //=> true
 *      R.equals(1, '1'); //=> false
 *      R.equals([1, 2, 3], [1, 2, 3]); //=> true
 *
 *      const a = {}; a.v = a;
 *      const b = {}; b.v = b;
 *      R.equals(a, b); //=> true
 */

var equals =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function equals(a, b) {
  return (0,_internal_equals_js__WEBPACK_IMPORTED_MODULE_1__.default)(a, b, [], []);
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (equals);

/***/ }),

/***/ "./node_modules/ramda/es/filter.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/filter.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _internal_dispatchable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_dispatchable.js */ "./node_modules/ramda/es/internal/_dispatchable.js");
/* harmony import */ var _internal_filter_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./internal/_filter.js */ "./node_modules/ramda/es/internal/_filter.js");
/* harmony import */ var _internal_isObject_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./internal/_isObject.js */ "./node_modules/ramda/es/internal/_isObject.js");
/* harmony import */ var _internal_reduce_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./internal/_reduce.js */ "./node_modules/ramda/es/internal/_reduce.js");
/* harmony import */ var _internal_xfilter_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./internal/_xfilter.js */ "./node_modules/ramda/es/internal/_xfilter.js");
/* harmony import */ var _keys_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./keys.js */ "./node_modules/ramda/es/keys.js");







/**
 * Takes a predicate and a `Filterable`, and returns a new filterable of the
 * same type containing the members of the given filterable which satisfy the
 * given predicate. Filterable objects include plain objects or any object
 * that has a filter method such as `Array`.
 *
 * Dispatches to the `filter` method of the second argument, if present.
 *
 * Acts as a transducer if a transformer is given in list position.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig Filterable f => (a -> Boolean) -> f a -> f a
 * @param {Function} pred
 * @param {Array} filterable
 * @return {Array} Filterable
 * @see R.reject, R.transduce, R.addIndex
 * @example
 *
 *      const isEven = n => n % 2 === 0;
 *
 *      R.filter(isEven, [1, 2, 3, 4]); //=> [2, 4]
 *
 *      R.filter(isEven, {a: 1, b: 2, c: 3, d: 4}); //=> {b: 2, d: 4}
 */

var filter =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(
/*#__PURE__*/
(0,_internal_dispatchable_js__WEBPACK_IMPORTED_MODULE_1__.default)(['filter'], _internal_xfilter_js__WEBPACK_IMPORTED_MODULE_2__.default, function (pred, filterable) {
  return (0,_internal_isObject_js__WEBPACK_IMPORTED_MODULE_3__.default)(filterable) ? (0,_internal_reduce_js__WEBPACK_IMPORTED_MODULE_4__.default)(function (acc, key) {
    if (pred(filterable[key])) {
      acc[key] = filterable[key];
    }

    return acc;
  }, {}, (0,_keys_js__WEBPACK_IMPORTED_MODULE_5__.default)(filterable)) : // else
  (0,_internal_filter_js__WEBPACK_IMPORTED_MODULE_6__.default)(pred, filterable);
}));

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (filter);

/***/ }),

/***/ "./node_modules/ramda/es/identity.js":
/*!*******************************************!*\
  !*** ./node_modules/ramda/es/identity.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _internal_identity_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_identity.js */ "./node_modules/ramda/es/internal/_identity.js");


/**
 * A function that does nothing but return the parameter supplied to it. Good
 * as a default or placeholder function.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category Function
 * @sig a -> a
 * @param {*} x The value to return.
 * @return {*} The input value, `x`.
 * @example
 *
 *      R.identity(1); //=> 1
 *
 *      const obj = {};
 *      R.identity(obj) === obj; //=> true
 * @symb R.identity(a) = a
 */

var identity =
/*#__PURE__*/
(0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(_internal_identity_js__WEBPACK_IMPORTED_MODULE_1__.default);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (identity);

/***/ }),

/***/ "./node_modules/ramda/es/internal/_Set.js":
/*!************************************************!*\
  !*** ./node_modules/ramda/es/internal/_Set.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _includes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_includes.js */ "./node_modules/ramda/es/internal/_includes.js");


var _Set =
/*#__PURE__*/
function () {
  function _Set() {
    /* globals Set */
    this._nativeSet = typeof Set === 'function' ? new Set() : null;
    this._items = {};
  }

  // until we figure out why jsdoc chokes on this
  // @param item The item to add to the Set
  // @returns {boolean} true if the item did not exist prior, otherwise false
  //
  _Set.prototype.add = function (item) {
    return !hasOrAdd(item, true, this);
  }; //
  // @param item The item to check for existence in the Set
  // @returns {boolean} true if the item exists in the Set, otherwise false
  //


  _Set.prototype.has = function (item) {
    return hasOrAdd(item, false, this);
  }; //
  // Combines the logic for checking whether an item is a member of the set and
  // for adding a new item to the set.
  //
  // @param item       The item to check or add to the Set instance.
  // @param shouldAdd  If true, the item will be added to the set if it doesn't
  //                   already exist.
  // @param set        The set instance to check or add to.
  // @return {boolean} true if the item already existed, otherwise false.
  //


  return _Set;
}();

function hasOrAdd(item, shouldAdd, set) {
  var type = typeof item;
  var prevSize, newSize;

  switch (type) {
    case 'string':
    case 'number':
      // distinguish between +0 and -0
      if (item === 0 && 1 / item === -Infinity) {
        if (set._items['-0']) {
          return true;
        } else {
          if (shouldAdd) {
            set._items['-0'] = true;
          }

          return false;
        }
      } // these types can all utilise the native Set


      if (set._nativeSet !== null) {
        if (shouldAdd) {
          prevSize = set._nativeSet.size;

          set._nativeSet.add(item);

          newSize = set._nativeSet.size;
          return newSize === prevSize;
        } else {
          return set._nativeSet.has(item);
        }
      } else {
        if (!(type in set._items)) {
          if (shouldAdd) {
            set._items[type] = {};
            set._items[type][item] = true;
          }

          return false;
        } else if (item in set._items[type]) {
          return true;
        } else {
          if (shouldAdd) {
            set._items[type][item] = true;
          }

          return false;
        }
      }

    case 'boolean':
      // set._items['boolean'] holds a two element array
      // representing [ falseExists, trueExists ]
      if (type in set._items) {
        var bIdx = item ? 1 : 0;

        if (set._items[type][bIdx]) {
          return true;
        } else {
          if (shouldAdd) {
            set._items[type][bIdx] = true;
          }

          return false;
        }
      } else {
        if (shouldAdd) {
          set._items[type] = item ? [false, true] : [true, false];
        }

        return false;
      }

    case 'function':
      // compare functions for reference equality
      if (set._nativeSet !== null) {
        if (shouldAdd) {
          prevSize = set._nativeSet.size;

          set._nativeSet.add(item);

          newSize = set._nativeSet.size;
          return newSize === prevSize;
        } else {
          return set._nativeSet.has(item);
        }
      } else {
        if (!(type in set._items)) {
          if (shouldAdd) {
            set._items[type] = [item];
          }

          return false;
        }

        if (!(0,_includes_js__WEBPACK_IMPORTED_MODULE_0__.default)(item, set._items[type])) {
          if (shouldAdd) {
            set._items[type].push(item);
          }

          return false;
        }

        return true;
      }

    case 'undefined':
      if (set._items[type]) {
        return true;
      } else {
        if (shouldAdd) {
          set._items[type] = true;
        }

        return false;
      }

    case 'object':
      if (item === null) {
        if (!set._items['null']) {
          if (shouldAdd) {
            set._items['null'] = true;
          }

          return false;
        }

        return true;
      }

    /* falls through */

    default:
      // reduce the search size of heterogeneous sets by creating buckets
      // for each type.
      type = Object.prototype.toString.call(item);

      if (!(type in set._items)) {
        if (shouldAdd) {
          set._items[type] = [item];
        }

        return false;
      } // scan through all previously applied items


      if (!(0,_includes_js__WEBPACK_IMPORTED_MODULE_0__.default)(item, set._items[type])) {
        if (shouldAdd) {
          set._items[type].push(item);
        }

        return false;
      }

      return true;
  }
} // A simple Set type that honours R.equals semantics


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_Set);

/***/ }),

/***/ "./node_modules/ramda/es/internal/_arity.js":
/*!**************************************************!*\
  !*** ./node_modules/ramda/es/internal/_arity.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _arity)
/* harmony export */ });
function _arity(n, fn) {
  /* eslint-disable no-unused-vars */
  switch (n) {
    case 0:
      return function () {
        return fn.apply(this, arguments);
      };

    case 1:
      return function (a0) {
        return fn.apply(this, arguments);
      };

    case 2:
      return function (a0, a1) {
        return fn.apply(this, arguments);
      };

    case 3:
      return function (a0, a1, a2) {
        return fn.apply(this, arguments);
      };

    case 4:
      return function (a0, a1, a2, a3) {
        return fn.apply(this, arguments);
      };

    case 5:
      return function (a0, a1, a2, a3, a4) {
        return fn.apply(this, arguments);
      };

    case 6:
      return function (a0, a1, a2, a3, a4, a5) {
        return fn.apply(this, arguments);
      };

    case 7:
      return function (a0, a1, a2, a3, a4, a5, a6) {
        return fn.apply(this, arguments);
      };

    case 8:
      return function (a0, a1, a2, a3, a4, a5, a6, a7) {
        return fn.apply(this, arguments);
      };

    case 9:
      return function (a0, a1, a2, a3, a4, a5, a6, a7, a8) {
        return fn.apply(this, arguments);
      };

    case 10:
      return function (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
        return fn.apply(this, arguments);
      };

    default:
      throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
  }
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_arrayFromIterator.js":
/*!**************************************************************!*\
  !*** ./node_modules/ramda/es/internal/_arrayFromIterator.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _arrayFromIterator)
/* harmony export */ });
function _arrayFromIterator(iter) {
  var list = [];
  var next;

  while (!(next = iter.next()).done) {
    list.push(next.value);
  }

  return list;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_checkForMethod.js":
/*!***********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_checkForMethod.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _checkForMethod)
/* harmony export */ });
/* harmony import */ var _isArray_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_isArray.js */ "./node_modules/ramda/es/internal/_isArray.js");

/**
 * This checks whether a function has a [methodname] function. If it isn't an
 * array it will execute that function otherwise it will default to the ramda
 * implementation.
 *
 * @private
 * @param {Function} fn ramda implemtation
 * @param {String} methodname property to check for a custom implementation
 * @return {Object} Whatever the return value of the method is.
 */

function _checkForMethod(methodname, fn) {
  return function () {
    var length = arguments.length;

    if (length === 0) {
      return fn();
    }

    var obj = arguments[length - 1];
    return (0,_isArray_js__WEBPACK_IMPORTED_MODULE_0__.default)(obj) || typeof obj[methodname] !== 'function' ? fn.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length - 1));
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_complement.js":
/*!*******************************************************!*\
  !*** ./node_modules/ramda/es/internal/_complement.js ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _complement)
/* harmony export */ });
function _complement(f) {
  return function () {
    return !f.apply(this, arguments);
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_curry1.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_curry1.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _curry1)
/* harmony export */ });
/* harmony import */ var _isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_isPlaceholder.js */ "./node_modules/ramda/es/internal/_isPlaceholder.js");

/**
 * Optimized internal one-arity curry function.
 *
 * @private
 * @category Function
 * @param {Function} fn The function to curry.
 * @return {Function} The curried function.
 */

function _curry1(fn) {
  return function f1(a) {
    if (arguments.length === 0 || (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a)) {
      return f1;
    } else {
      return fn.apply(this, arguments);
    }
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_curry2.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_curry2.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _curry2)
/* harmony export */ });
/* harmony import */ var _curry1_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_isPlaceholder.js */ "./node_modules/ramda/es/internal/_isPlaceholder.js");


/**
 * Optimized internal two-arity curry function.
 *
 * @private
 * @category Function
 * @param {Function} fn The function to curry.
 * @return {Function} The curried function.
 */

function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        return f2;

      case 1:
        return (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) ? f2 : (0,_curry1_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_b) {
          return fn(a, _b);
        });

      default:
        return (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) && (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) ? f2 : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) ? (0,_curry1_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_a) {
          return fn(_a, b);
        }) : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) ? (0,_curry1_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_b) {
          return fn(a, _b);
        }) : fn(a, b);
    }
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_curry3.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_curry3.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _curry3)
/* harmony export */ });
/* harmony import */ var _curry1_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _curry2_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_isPlaceholder.js */ "./node_modules/ramda/es/internal/_isPlaceholder.js");



/**
 * Optimized internal three-arity curry function.
 *
 * @private
 * @category Function
 * @param {Function} fn The function to curry.
 * @return {Function} The curried function.
 */

function _curry3(fn) {
  return function f3(a, b, c) {
    switch (arguments.length) {
      case 0:
        return f3;

      case 1:
        return (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) ? f3 : (0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_b, _c) {
          return fn(a, _b, _c);
        });

      case 2:
        return (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) && (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) ? f3 : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) ? (0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_a, _c) {
          return fn(_a, b, _c);
        }) : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) ? (0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_b, _c) {
          return fn(a, _b, _c);
        }) : (0,_curry1_js__WEBPACK_IMPORTED_MODULE_2__.default)(function (_c) {
          return fn(a, b, _c);
        });

      default:
        return (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) && (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) && (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(c) ? f3 : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) && (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) ? (0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_a, _b) {
          return fn(_a, _b, c);
        }) : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) && (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(c) ? (0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_a, _c) {
          return fn(_a, b, _c);
        }) : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) && (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(c) ? (0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (_b, _c) {
          return fn(a, _b, _c);
        }) : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(a) ? (0,_curry1_js__WEBPACK_IMPORTED_MODULE_2__.default)(function (_a) {
          return fn(_a, b, c);
        }) : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(b) ? (0,_curry1_js__WEBPACK_IMPORTED_MODULE_2__.default)(function (_b) {
          return fn(a, _b, c);
        }) : (0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(c) ? (0,_curry1_js__WEBPACK_IMPORTED_MODULE_2__.default)(function (_c) {
          return fn(a, b, _c);
        }) : fn(a, b, c);
    }
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_curryN.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_curryN.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _curryN)
/* harmony export */ });
/* harmony import */ var _arity_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_arity.js */ "./node_modules/ramda/es/internal/_arity.js");
/* harmony import */ var _isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_isPlaceholder.js */ "./node_modules/ramda/es/internal/_isPlaceholder.js");


/**
 * Internal curryN function.
 *
 * @private
 * @category Function
 * @param {Number} length The arity of the curried function.
 * @param {Array} received An array of arguments received thus far.
 * @param {Function} fn The function to curry.
 * @return {Function} The curried function.
 */

function _curryN(length, received, fn) {
  return function () {
    var combined = [];
    var argsIdx = 0;
    var left = length;
    var combinedIdx = 0;

    while (combinedIdx < received.length || argsIdx < arguments.length) {
      var result;

      if (combinedIdx < received.length && (!(0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(received[combinedIdx]) || argsIdx >= arguments.length)) {
        result = received[combinedIdx];
      } else {
        result = arguments[argsIdx];
        argsIdx += 1;
      }

      combined[combinedIdx] = result;

      if (!(0,_isPlaceholder_js__WEBPACK_IMPORTED_MODULE_0__.default)(result)) {
        left -= 1;
      }

      combinedIdx += 1;
    }

    return left <= 0 ? fn.apply(this, combined) : (0,_arity_js__WEBPACK_IMPORTED_MODULE_1__.default)(left, _curryN(length, combined, fn));
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_dispatchable.js":
/*!*********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_dispatchable.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _dispatchable)
/* harmony export */ });
/* harmony import */ var _isArray_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_isArray.js */ "./node_modules/ramda/es/internal/_isArray.js");
/* harmony import */ var _isTransformer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_isTransformer.js */ "./node_modules/ramda/es/internal/_isTransformer.js");


/**
 * Returns a function that dispatches with different strategies based on the
 * object in list position (last argument). If it is an array, executes [fn].
 * Otherwise, if it has a function with one of the given method names, it will
 * execute that function (functor case). Otherwise, if it is a transformer,
 * uses transducer [xf] to return a new transformer (transducer case).
 * Otherwise, it will default to executing [fn].
 *
 * @private
 * @param {Array} methodNames properties to check for a custom implementation
 * @param {Function} xf transducer to initialize if object is transformer
 * @param {Function} fn default ramda implementation
 * @return {Function} A function that dispatches on object in list position
 */

function _dispatchable(methodNames, xf, fn) {
  return function () {
    if (arguments.length === 0) {
      return fn();
    }

    var args = Array.prototype.slice.call(arguments, 0);
    var obj = args.pop();

    if (!(0,_isArray_js__WEBPACK_IMPORTED_MODULE_0__.default)(obj)) {
      var idx = 0;

      while (idx < methodNames.length) {
        if (typeof obj[methodNames[idx]] === 'function') {
          return obj[methodNames[idx]].apply(obj, args);
        }

        idx += 1;
      }

      if ((0,_isTransformer_js__WEBPACK_IMPORTED_MODULE_1__.default)(obj)) {
        var transducer = xf.apply(null, args);
        return transducer(obj);
      }
    }

    return fn.apply(this, arguments);
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_equals.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_equals.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _equals)
/* harmony export */ });
/* harmony import */ var _arrayFromIterator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_arrayFromIterator.js */ "./node_modules/ramda/es/internal/_arrayFromIterator.js");
/* harmony import */ var _includesWith_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_includesWith.js */ "./node_modules/ramda/es/internal/_includesWith.js");
/* harmony import */ var _functionName_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./_functionName.js */ "./node_modules/ramda/es/internal/_functionName.js");
/* harmony import */ var _has_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./_has.js */ "./node_modules/ramda/es/internal/_has.js");
/* harmony import */ var _objectIs_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./_objectIs.js */ "./node_modules/ramda/es/internal/_objectIs.js");
/* harmony import */ var _keys_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../keys.js */ "./node_modules/ramda/es/keys.js");
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../type.js */ "./node_modules/ramda/es/type.js");







/**
 * private _uniqContentEquals function.
 * That function is checking equality of 2 iterator contents with 2 assumptions
 * - iterators lengths are the same
 * - iterators values are unique
 *
 * false-positive result will be returned for comparision of, e.g.
 * - [1,2,3] and [1,2,3,4]
 * - [1,1,1] and [1,2,3]
 * */

function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
  var a = (0,_arrayFromIterator_js__WEBPACK_IMPORTED_MODULE_0__.default)(aIterator);

  var b = (0,_arrayFromIterator_js__WEBPACK_IMPORTED_MODULE_0__.default)(bIterator);

  function eq(_a, _b) {
    return _equals(_a, _b, stackA.slice(), stackB.slice());
  } // if *a* array contains any element that is not included in *b*


  return !(0,_includesWith_js__WEBPACK_IMPORTED_MODULE_1__.default)(function (b, aItem) {
    return !(0,_includesWith_js__WEBPACK_IMPORTED_MODULE_1__.default)(eq, aItem, b);
  }, b, a);
}

function _equals(a, b, stackA, stackB) {
  if ((0,_objectIs_js__WEBPACK_IMPORTED_MODULE_2__.default)(a, b)) {
    return true;
  }

  var typeA = (0,_type_js__WEBPACK_IMPORTED_MODULE_3__.default)(a);

  if (typeA !== (0,_type_js__WEBPACK_IMPORTED_MODULE_3__.default)(b)) {
    return false;
  }

  if (a == null || b == null) {
    return false;
  }

  if (typeof a['fantasy-land/equals'] === 'function' || typeof b['fantasy-land/equals'] === 'function') {
    return typeof a['fantasy-land/equals'] === 'function' && a['fantasy-land/equals'](b) && typeof b['fantasy-land/equals'] === 'function' && b['fantasy-land/equals'](a);
  }

  if (typeof a.equals === 'function' || typeof b.equals === 'function') {
    return typeof a.equals === 'function' && a.equals(b) && typeof b.equals === 'function' && b.equals(a);
  }

  switch (typeA) {
    case 'Arguments':
    case 'Array':
    case 'Object':
      if (typeof a.constructor === 'function' && (0,_functionName_js__WEBPACK_IMPORTED_MODULE_4__.default)(a.constructor) === 'Promise') {
        return a === b;
      }

      break;

    case 'Boolean':
    case 'Number':
    case 'String':
      if (!(typeof a === typeof b && (0,_objectIs_js__WEBPACK_IMPORTED_MODULE_2__.default)(a.valueOf(), b.valueOf()))) {
        return false;
      }

      break;

    case 'Date':
      if (!(0,_objectIs_js__WEBPACK_IMPORTED_MODULE_2__.default)(a.valueOf(), b.valueOf())) {
        return false;
      }

      break;

    case 'Error':
      return a.name === b.name && a.message === b.message;

    case 'RegExp':
      if (!(a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode)) {
        return false;
      }

      break;
  }

  var idx = stackA.length - 1;

  while (idx >= 0) {
    if (stackA[idx] === a) {
      return stackB[idx] === b;
    }

    idx -= 1;
  }

  switch (typeA) {
    case 'Map':
      if (a.size !== b.size) {
        return false;
      }

      return _uniqContentEquals(a.entries(), b.entries(), stackA.concat([a]), stackB.concat([b]));

    case 'Set':
      if (a.size !== b.size) {
        return false;
      }

      return _uniqContentEquals(a.values(), b.values(), stackA.concat([a]), stackB.concat([b]));

    case 'Arguments':
    case 'Array':
    case 'Object':
    case 'Boolean':
    case 'Number':
    case 'String':
    case 'Date':
    case 'Error':
    case 'RegExp':
    case 'Int8Array':
    case 'Uint8Array':
    case 'Uint8ClampedArray':
    case 'Int16Array':
    case 'Uint16Array':
    case 'Int32Array':
    case 'Uint32Array':
    case 'Float32Array':
    case 'Float64Array':
    case 'ArrayBuffer':
      break;

    default:
      // Values of other types are only equal if identical.
      return false;
  }

  var keysA = (0,_keys_js__WEBPACK_IMPORTED_MODULE_5__.default)(a);

  if (keysA.length !== (0,_keys_js__WEBPACK_IMPORTED_MODULE_5__.default)(b).length) {
    return false;
  }

  var extendedStackA = stackA.concat([a]);
  var extendedStackB = stackB.concat([b]);
  idx = keysA.length - 1;

  while (idx >= 0) {
    var key = keysA[idx];

    if (!((0,_has_js__WEBPACK_IMPORTED_MODULE_6__.default)(key, b) && _equals(b[key], a[key], extendedStackA, extendedStackB))) {
      return false;
    }

    idx -= 1;
  }

  return true;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_filter.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_filter.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _filter)
/* harmony export */ });
function _filter(fn, list) {
  var idx = 0;
  var len = list.length;
  var result = [];

  while (idx < len) {
    if (fn(list[idx])) {
      result[result.length] = list[idx];
    }

    idx += 1;
  }

  return result;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_functionName.js":
/*!*********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_functionName.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _functionName)
/* harmony export */ });
function _functionName(f) {
  // String(x => x) evaluates to "x => x", so the pattern may not match.
  var match = String(f).match(/^function (\w*)/);
  return match == null ? '' : match[1];
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_has.js":
/*!************************************************!*\
  !*** ./node_modules/ramda/es/internal/_has.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _has)
/* harmony export */ });
function _has(prop, obj) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_identity.js":
/*!*****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_identity.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _identity)
/* harmony export */ });
function _identity(x) {
  return x;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_includes.js":
/*!*****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_includes.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _includes)
/* harmony export */ });
/* harmony import */ var _indexOf_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_indexOf.js */ "./node_modules/ramda/es/internal/_indexOf.js");

function _includes(a, list) {
  return (0,_indexOf_js__WEBPACK_IMPORTED_MODULE_0__.default)(list, a, 0) >= 0;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_includesWith.js":
/*!*********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_includesWith.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _includesWith)
/* harmony export */ });
function _includesWith(pred, x, list) {
  var idx = 0;
  var len = list.length;

  while (idx < len) {
    if (pred(x, list[idx])) {
      return true;
    }

    idx += 1;
  }

  return false;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_indexOf.js":
/*!****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_indexOf.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _indexOf)
/* harmony export */ });
/* harmony import */ var _equals_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../equals.js */ "./node_modules/ramda/es/equals.js");

function _indexOf(list, a, idx) {
  var inf, item; // Array.prototype.indexOf doesn't exist below IE9

  if (typeof list.indexOf === 'function') {
    switch (typeof a) {
      case 'number':
        if (a === 0) {
          // manually crawl the list to distinguish between +0 and -0
          inf = 1 / a;

          while (idx < list.length) {
            item = list[idx];

            if (item === 0 && 1 / item === inf) {
              return idx;
            }

            idx += 1;
          }

          return -1;
        } else if (a !== a) {
          // NaN
          while (idx < list.length) {
            item = list[idx];

            if (typeof item === 'number' && item !== item) {
              return idx;
            }

            idx += 1;
          }

          return -1;
        } // non-zero numbers can utilise Set


        return list.indexOf(a, idx);
      // all these types can utilise Set

      case 'string':
      case 'boolean':
      case 'function':
      case 'undefined':
        return list.indexOf(a, idx);

      case 'object':
        if (a === null) {
          // null can utilise Set
          return list.indexOf(a, idx);
        }

    }
  } // anything else not covered above, defer to R.equals


  while (idx < list.length) {
    if ((0,_equals_js__WEBPACK_IMPORTED_MODULE_0__.default)(list[idx], a)) {
      return idx;
    }

    idx += 1;
  }

  return -1;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isArguments.js":
/*!********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isArguments.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _has_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_has.js */ "./node_modules/ramda/es/internal/_has.js");

var toString = Object.prototype.toString;

var _isArguments =
/*#__PURE__*/
function () {
  return toString.call(arguments) === '[object Arguments]' ? function _isArguments(x) {
    return toString.call(x) === '[object Arguments]';
  } : function _isArguments(x) {
    return (0,_has_js__WEBPACK_IMPORTED_MODULE_0__.default)('callee', x);
  };
}();

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_isArguments);

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isArray.js":
/*!****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isArray.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * Tests whether or not an object is an array.
 *
 * @private
 * @param {*} val The object to test.
 * @return {Boolean} `true` if `val` is an array, `false` otherwise.
 * @example
 *
 *      _isArray([]); //=> true
 *      _isArray(null); //=> false
 *      _isArray({}); //=> false
 */
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Array.isArray || function _isArray(val) {
  return val != null && val.length >= 0 && Object.prototype.toString.call(val) === '[object Array]';
});

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isArrayLike.js":
/*!********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isArrayLike.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _curry1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _isArray_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_isArray.js */ "./node_modules/ramda/es/internal/_isArray.js");
/* harmony import */ var _isString_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./_isString.js */ "./node_modules/ramda/es/internal/_isString.js");



/**
 * Tests whether or not an object is similar to an array.
 *
 * @private
 * @category Type
 * @category List
 * @sig * -> Boolean
 * @param {*} x The object to test.
 * @return {Boolean} `true` if `x` has a numeric length property and extreme indices defined; `false` otherwise.
 * @example
 *
 *      _isArrayLike([]); //=> true
 *      _isArrayLike(true); //=> false
 *      _isArrayLike({}); //=> false
 *      _isArrayLike({length: 10}); //=> false
 *      _isArrayLike({0: 'zero', 9: 'nine', length: 10}); //=> true
 */

var _isArrayLike =
/*#__PURE__*/
(0,_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(function isArrayLike(x) {
  if ((0,_isArray_js__WEBPACK_IMPORTED_MODULE_1__.default)(x)) {
    return true;
  }

  if (!x) {
    return false;
  }

  if (typeof x !== 'object') {
    return false;
  }

  if ((0,_isString_js__WEBPACK_IMPORTED_MODULE_2__.default)(x)) {
    return false;
  }

  if (x.nodeType === 1) {
    return !!x.length;
  }

  if (x.length === 0) {
    return true;
  }

  if (x.length > 0) {
    return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
  }

  return false;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_isArrayLike);

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isInteger.js":
/*!******************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isInteger.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * Determine if the passed argument is an integer.
 *
 * @private
 * @param {*} n
 * @category Type
 * @return {Boolean}
 */
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Number.isInteger || function _isInteger(n) {
  return n << 0 === n;
});

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isObject.js":
/*!*****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isObject.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _isObject)
/* harmony export */ });
function _isObject(x) {
  return Object.prototype.toString.call(x) === '[object Object]';
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isPlaceholder.js":
/*!**********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isPlaceholder.js ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _isPlaceholder)
/* harmony export */ });
function _isPlaceholder(a) {
  return a != null && typeof a === 'object' && a['@@functional/placeholder'] === true;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isString.js":
/*!*****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isString.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _isString)
/* harmony export */ });
function _isString(x) {
  return Object.prototype.toString.call(x) === '[object String]';
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_isTransformer.js":
/*!**********************************************************!*\
  !*** ./node_modules/ramda/es/internal/_isTransformer.js ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _isTransformer)
/* harmony export */ });
function _isTransformer(obj) {
  return obj != null && typeof obj['@@transducer/step'] === 'function';
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_map.js":
/*!************************************************!*\
  !*** ./node_modules/ramda/es/internal/_map.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _map)
/* harmony export */ });
function _map(fn, functor) {
  var idx = 0;
  var len = functor.length;
  var result = Array(len);

  while (idx < len) {
    result[idx] = fn(functor[idx]);
    idx += 1;
  }

  return result;
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_objectIs.js":
/*!*****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_objectIs.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
function _objectIs(a, b) {
  // SameValue algorithm
  if (a === b) {
    // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    return a !== 0 || 1 / a === 1 / b;
  } else {
    // Step 6.a: NaN == NaN
    return a !== a && b !== b;
  }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (typeof Object.is === 'function' ? Object.is : _objectIs);

/***/ }),

/***/ "./node_modules/ramda/es/internal/_pipe.js":
/*!*************************************************!*\
  !*** ./node_modules/ramda/es/internal/_pipe.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _pipe)
/* harmony export */ });
function _pipe(f, g) {
  return function () {
    return g.call(this, f.apply(this, arguments));
  };
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_reduce.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_reduce.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _reduce)
/* harmony export */ });
/* harmony import */ var _isArrayLike_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./_isArrayLike.js */ "./node_modules/ramda/es/internal/_isArrayLike.js");
/* harmony import */ var _xwrap_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_xwrap.js */ "./node_modules/ramda/es/internal/_xwrap.js");
/* harmony import */ var _bind_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../bind.js */ "./node_modules/ramda/es/bind.js");




function _arrayReduce(xf, acc, list) {
  var idx = 0;
  var len = list.length;

  while (idx < len) {
    acc = xf['@@transducer/step'](acc, list[idx]);

    if (acc && acc['@@transducer/reduced']) {
      acc = acc['@@transducer/value'];
      break;
    }

    idx += 1;
  }

  return xf['@@transducer/result'](acc);
}

function _iterableReduce(xf, acc, iter) {
  var step = iter.next();

  while (!step.done) {
    acc = xf['@@transducer/step'](acc, step.value);

    if (acc && acc['@@transducer/reduced']) {
      acc = acc['@@transducer/value'];
      break;
    }

    step = iter.next();
  }

  return xf['@@transducer/result'](acc);
}

function _methodReduce(xf, acc, obj, methodName) {
  return xf['@@transducer/result'](obj[methodName]((0,_bind_js__WEBPACK_IMPORTED_MODULE_0__.default)(xf['@@transducer/step'], xf), acc));
}

var symIterator = typeof Symbol !== 'undefined' ? Symbol.iterator : '@@iterator';
function _reduce(fn, acc, list) {
  if (typeof fn === 'function') {
    fn = (0,_xwrap_js__WEBPACK_IMPORTED_MODULE_1__.default)(fn);
  }

  if ((0,_isArrayLike_js__WEBPACK_IMPORTED_MODULE_2__.default)(list)) {
    return _arrayReduce(fn, acc, list);
  }

  if (typeof list['fantasy-land/reduce'] === 'function') {
    return _methodReduce(fn, acc, list, 'fantasy-land/reduce');
  }

  if (list[symIterator] != null) {
    return _iterableReduce(fn, acc, list[symIterator]());
  }

  if (typeof list.next === 'function') {
    return _iterableReduce(fn, acc, list);
  }

  if (typeof list.reduce === 'function') {
    return _methodReduce(fn, acc, list, 'reduce');
  }

  throw new TypeError('reduce: list must be array or iterable');
}

/***/ }),

/***/ "./node_modules/ramda/es/internal/_xfBase.js":
/*!***************************************************!*\
  !*** ./node_modules/ramda/es/internal/_xfBase.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  init: function () {
    return this.xf['@@transducer/init']();
  },
  result: function (result) {
    return this.xf['@@transducer/result'](result);
  }
});

/***/ }),

/***/ "./node_modules/ramda/es/internal/_xfilter.js":
/*!****************************************************!*\
  !*** ./node_modules/ramda/es/internal/_xfilter.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _curry2_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _xfBase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_xfBase.js */ "./node_modules/ramda/es/internal/_xfBase.js");



var XFilter =
/*#__PURE__*/
function () {
  function XFilter(f, xf) {
    this.xf = xf;
    this.f = f;
  }

  XFilter.prototype['@@transducer/init'] = _xfBase_js__WEBPACK_IMPORTED_MODULE_0__.default.init;
  XFilter.prototype['@@transducer/result'] = _xfBase_js__WEBPACK_IMPORTED_MODULE_0__.default.result;

  XFilter.prototype['@@transducer/step'] = function (result, input) {
    return this.f(input) ? this.xf['@@transducer/step'](result, input) : result;
  };

  return XFilter;
}();

var _xfilter =
/*#__PURE__*/
(0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function _xfilter(f, xf) {
  return new XFilter(f, xf);
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_xfilter);

/***/ }),

/***/ "./node_modules/ramda/es/internal/_xmap.js":
/*!*************************************************!*\
  !*** ./node_modules/ramda/es/internal/_xmap.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _curry2_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _xfBase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./_xfBase.js */ "./node_modules/ramda/es/internal/_xfBase.js");



var XMap =
/*#__PURE__*/
function () {
  function XMap(f, xf) {
    this.xf = xf;
    this.f = f;
  }

  XMap.prototype['@@transducer/init'] = _xfBase_js__WEBPACK_IMPORTED_MODULE_0__.default.init;
  XMap.prototype['@@transducer/result'] = _xfBase_js__WEBPACK_IMPORTED_MODULE_0__.default.result;

  XMap.prototype['@@transducer/step'] = function (result, input) {
    return this.xf['@@transducer/step'](result, this.f(input));
  };

  return XMap;
}();

var _xmap =
/*#__PURE__*/
(0,_curry2_js__WEBPACK_IMPORTED_MODULE_1__.default)(function _xmap(f, xf) {
  return new XMap(f, xf);
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_xmap);

/***/ }),

/***/ "./node_modules/ramda/es/internal/_xwrap.js":
/*!**************************************************!*\
  !*** ./node_modules/ramda/es/internal/_xwrap.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _xwrap)
/* harmony export */ });
var XWrap =
/*#__PURE__*/
function () {
  function XWrap(fn) {
    this.f = fn;
  }

  XWrap.prototype['@@transducer/init'] = function () {
    throw new Error('init not implemented on XWrap');
  };

  XWrap.prototype['@@transducer/result'] = function (acc) {
    return acc;
  };

  XWrap.prototype['@@transducer/step'] = function (acc, x) {
    return this.f(acc, x);
  };

  return XWrap;
}();

function _xwrap(fn) {
  return new XWrap(fn);
}

/***/ }),

/***/ "./node_modules/ramda/es/invertObj.js":
/*!********************************************!*\
  !*** ./node_modules/ramda/es/invertObj.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _keys_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./keys.js */ "./node_modules/ramda/es/keys.js");


/**
 * Returns a new object with the keys of the given object as values, and the
 * values of the given object, which are coerced to strings, as keys. Note
 * that the last key found is preferred when handling the same value.
 *
 * @func
 * @memberOf R
 * @since v0.9.0
 * @category Object
 * @sig {s: x} -> {x: s}
 * @param {Object} obj The object or array to invert
 * @return {Object} out A new object
 * @see R.invert
 * @example
 *
 *      const raceResults = {
 *        first: 'alice',
 *        second: 'jake'
 *      };
 *      R.invertObj(raceResults);
 *      //=> { 'alice': 'first', 'jake':'second' }
 *
 *      // Alternatively:
 *      const raceResults = ['alice', 'jake'];
 *      R.invertObj(raceResults);
 *      //=> { 'alice': '0', 'jake':'1' }
 */

var invertObj =
/*#__PURE__*/
(0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(function invertObj(obj) {
  var props = (0,_keys_js__WEBPACK_IMPORTED_MODULE_1__.default)(obj);
  var len = props.length;
  var idx = 0;
  var out = {};

  while (idx < len) {
    var key = props[idx];
    out[obj[key]] = key;
    idx += 1;
  }

  return out;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (invertObj);

/***/ }),

/***/ "./node_modules/ramda/es/is.js":
/*!*************************************!*\
  !*** ./node_modules/ramda/es/is.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");

/**
 * See if an object (`val`) is an instance of the supplied constructor. This
 * function will check up the inheritance chain, if any.
 *
 * @func
 * @memberOf R
 * @since v0.3.0
 * @category Type
 * @sig (* -> {*}) -> a -> Boolean
 * @param {Object} ctor A constructor
 * @param {*} val The value to test
 * @return {Boolean}
 * @example
 *
 *      R.is(Object, {}); //=> true
 *      R.is(Number, 1); //=> true
 *      R.is(Object, 1); //=> false
 *      R.is(String, 's'); //=> true
 *      R.is(String, new String('')); //=> true
 *      R.is(Object, new String('')); //=> true
 *      R.is(Object, 's'); //=> false
 *      R.is(Number, {}); //=> false
 */

var is =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function is(Ctor, val) {
  return val != null && val.constructor === Ctor || val instanceof Ctor;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (is);

/***/ }),

/***/ "./node_modules/ramda/es/keys.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/keys.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _internal_has_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./internal/_has.js */ "./node_modules/ramda/es/internal/_has.js");
/* harmony import */ var _internal_isArguments_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_isArguments.js */ "./node_modules/ramda/es/internal/_isArguments.js");


 // cover IE < 9 keys issues

var hasEnumBug = !
/*#__PURE__*/
{
  toString: null
}.propertyIsEnumerable('toString');
var nonEnumerableProps = ['constructor', 'valueOf', 'isPrototypeOf', 'toString', 'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString']; // Safari bug

var hasArgsEnumBug =
/*#__PURE__*/
function () {
  'use strict';

  return arguments.propertyIsEnumerable('length');
}();

var contains = function contains(list, item) {
  var idx = 0;

  while (idx < list.length) {
    if (list[idx] === item) {
      return true;
    }

    idx += 1;
  }

  return false;
};
/**
 * Returns a list containing the names of all the enumerable own properties of
 * the supplied object.
 * Note that the order of the output array is not guaranteed to be consistent
 * across different JS platforms.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category Object
 * @sig {k: v} -> [k]
 * @param {Object} obj The object to extract properties from
 * @return {Array} An array of the object's own properties.
 * @see R.keysIn, R.values
 * @example
 *
 *      R.keys({a: 1, b: 2, c: 3}); //=> ['a', 'b', 'c']
 */


var keys = typeof Object.keys === 'function' && !hasArgsEnumBug ?
/*#__PURE__*/
(0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(function keys(obj) {
  return Object(obj) !== obj ? [] : Object.keys(obj);
}) :
/*#__PURE__*/
(0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(function keys(obj) {
  if (Object(obj) !== obj) {
    return [];
  }

  var prop, nIdx;
  var ks = [];

  var checkArgsLength = hasArgsEnumBug && (0,_internal_isArguments_js__WEBPACK_IMPORTED_MODULE_1__.default)(obj);

  for (prop in obj) {
    if ((0,_internal_has_js__WEBPACK_IMPORTED_MODULE_2__.default)(prop, obj) && (!checkArgsLength || prop !== 'length')) {
      ks[ks.length] = prop;
    }
  }

  if (hasEnumBug) {
    nIdx = nonEnumerableProps.length - 1;

    while (nIdx >= 0) {
      prop = nonEnumerableProps[nIdx];

      if ((0,_internal_has_js__WEBPACK_IMPORTED_MODULE_2__.default)(prop, obj) && !contains(ks, prop)) {
        ks[ks.length] = prop;
      }

      nIdx -= 1;
    }
  }

  return ks;
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (keys);

/***/ }),

/***/ "./node_modules/ramda/es/map.js":
/*!**************************************!*\
  !*** ./node_modules/ramda/es/map.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _internal_dispatchable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_dispatchable.js */ "./node_modules/ramda/es/internal/_dispatchable.js");
/* harmony import */ var _internal_map_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./internal/_map.js */ "./node_modules/ramda/es/internal/_map.js");
/* harmony import */ var _internal_reduce_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./internal/_reduce.js */ "./node_modules/ramda/es/internal/_reduce.js");
/* harmony import */ var _internal_xmap_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./internal/_xmap.js */ "./node_modules/ramda/es/internal/_xmap.js");
/* harmony import */ var _curryN_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./curryN.js */ "./node_modules/ramda/es/curryN.js");
/* harmony import */ var _keys_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./keys.js */ "./node_modules/ramda/es/keys.js");







/**
 * Takes a function and
 * a [functor](https://github.com/fantasyland/fantasy-land#functor),
 * applies the function to each of the functor's values, and returns
 * a functor of the same shape.
 *
 * Ramda provides suitable `map` implementations for `Array` and `Object`,
 * so this function may be applied to `[1, 2, 3]` or `{x: 1, y: 2, z: 3}`.
 *
 * Dispatches to the `map` method of the second argument, if present.
 *
 * Acts as a transducer if a transformer is given in list position.
 *
 * Also treats functions as functors and will compose them together.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig Functor f => (a -> b) -> f a -> f b
 * @param {Function} fn The function to be called on every element of the input `list`.
 * @param {Array} list The list to be iterated over.
 * @return {Array} The new list.
 * @see R.transduce, R.addIndex
 * @example
 *
 *      const double = x => x * 2;
 *
 *      R.map(double, [1, 2, 3]); //=> [2, 4, 6]
 *
 *      R.map(double, {x: 1, y: 2, z: 3}); //=> {x: 2, y: 4, z: 6}
 * @symb R.map(f, [a, b]) = [f(a), f(b)]
 * @symb R.map(f, { x: a, y: b }) = { x: f(a), y: f(b) }
 * @symb R.map(f, functor_o) = functor_o.map(f)
 */

var map =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(
/*#__PURE__*/
(0,_internal_dispatchable_js__WEBPACK_IMPORTED_MODULE_1__.default)(['fantasy-land/map', 'map'], _internal_xmap_js__WEBPACK_IMPORTED_MODULE_2__.default, function map(fn, functor) {
  switch (Object.prototype.toString.call(functor)) {
    case '[object Function]':
      return (0,_curryN_js__WEBPACK_IMPORTED_MODULE_3__.default)(functor.length, function () {
        return fn.call(this, functor.apply(this, arguments));
      });

    case '[object Object]':
      return (0,_internal_reduce_js__WEBPACK_IMPORTED_MODULE_4__.default)(function (acc, key) {
        acc[key] = fn(functor[key]);
        return acc;
      }, {}, (0,_keys_js__WEBPACK_IMPORTED_MODULE_5__.default)(functor));

    default:
      return (0,_internal_map_js__WEBPACK_IMPORTED_MODULE_6__.default)(fn, functor);
  }
}));

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (map);

/***/ }),

/***/ "./node_modules/ramda/es/nth.js":
/*!**************************************!*\
  !*** ./node_modules/ramda/es/nth.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _internal_isString_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_isString.js */ "./node_modules/ramda/es/internal/_isString.js");


/**
 * Returns the nth element of the given list or string. If n is negative the
 * element at index length + n is returned.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig Number -> [a] -> a | Undefined
 * @sig Number -> String -> String
 * @param {Number} offset
 * @param {*} list
 * @return {*}
 * @example
 *
 *      const list = ['foo', 'bar', 'baz', 'quux'];
 *      R.nth(1, list); //=> 'bar'
 *      R.nth(-1, list); //=> 'quux'
 *      R.nth(-99, list); //=> undefined
 *
 *      R.nth(2, 'abc'); //=> 'c'
 *      R.nth(3, 'abc'); //=> ''
 * @symb R.nth(-1, [a, b, c]) = c
 * @symb R.nth(0, [a, b, c]) = a
 * @symb R.nth(1, [a, b, c]) = b
 */

var nth =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function nth(offset, list) {
  var idx = offset < 0 ? list.length + offset : offset;
  return (0,_internal_isString_js__WEBPACK_IMPORTED_MODULE_1__.default)(list) ? list.charAt(idx) : list[idx];
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (nth);

/***/ }),

/***/ "./node_modules/ramda/es/path.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/path.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _paths_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./paths.js */ "./node_modules/ramda/es/paths.js");


/**
 * Retrieve the value at a given path.
 *
 * @func
 * @memberOf R
 * @since v0.2.0
 * @category Object
 * @typedefn Idx = String | Int
 * @sig [Idx] -> {a} -> a | Undefined
 * @param {Array} path The path to use.
 * @param {Object} obj The object to retrieve the nested property from.
 * @return {*} The data at `path`.
 * @see R.prop, R.nth
 * @example
 *
 *      R.path(['a', 'b'], {a: {b: 2}}); //=> 2
 *      R.path(['a', 'b'], {c: {b: 2}}); //=> undefined
 *      R.path(['a', 'b', 0], {a: {b: [1, 2, 3]}}); //=> 1
 *      R.path(['a', 'b', -2], {a: {b: [1, 2, 3]}}); //=> 2
 */

var path =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function path(pathAr, obj) {
  return (0,_paths_js__WEBPACK_IMPORTED_MODULE_1__.default)([pathAr], obj)[0];
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (path);

/***/ }),

/***/ "./node_modules/ramda/es/pathOr.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/pathOr.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry3.js */ "./node_modules/ramda/es/internal/_curry3.js");
/* harmony import */ var _defaultTo_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./defaultTo.js */ "./node_modules/ramda/es/defaultTo.js");
/* harmony import */ var _path_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./path.js */ "./node_modules/ramda/es/path.js");



/**
 * If the given, non-null object has a value at the given path, returns the
 * value at that path. Otherwise returns the provided default value.
 *
 * @func
 * @memberOf R
 * @since v0.18.0
 * @category Object
 * @typedefn Idx = String | Int
 * @sig a -> [Idx] -> {a} -> a
 * @param {*} d The default value.
 * @param {Array} p The path to use.
 * @param {Object} obj The object to retrieve the nested property from.
 * @return {*} The data at `path` of the supplied object or the default value.
 * @example
 *
 *      R.pathOr('N/A', ['a', 'b'], {a: {b: 2}}); //=> 2
 *      R.pathOr('N/A', ['a', 'b'], {c: {b: 2}}); //=> "N/A"
 */

var pathOr =
/*#__PURE__*/
(0,_internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__.default)(function pathOr(d, p, obj) {
  return (0,_defaultTo_js__WEBPACK_IMPORTED_MODULE_1__.default)(d, (0,_path_js__WEBPACK_IMPORTED_MODULE_2__.default)(p, obj));
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (pathOr);

/***/ }),

/***/ "./node_modules/ramda/es/paths.js":
/*!****************************************!*\
  !*** ./node_modules/ramda/es/paths.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _internal_isInteger_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_isInteger.js */ "./node_modules/ramda/es/internal/_isInteger.js");
/* harmony import */ var _nth_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./nth.js */ "./node_modules/ramda/es/nth.js");



/**
 * Retrieves the values at given paths of an object.
 *
 * @func
 * @memberOf R
 * @since v0.27.1
 * @category Object
 * @typedefn Idx = [String | Int]
 * @sig [Idx] -> {a} -> [a | Undefined]
 * @param {Array} pathsArray The array of paths to be fetched.
 * @param {Object} obj The object to retrieve the nested properties from.
 * @return {Array} A list consisting of values at paths specified by "pathsArray".
 * @see R.path
 * @example
 *
 *      R.paths([['a', 'b'], ['p', 0, 'q']], {a: {b: 2}, p: [{q: 3}]}); //=> [2, 3]
 *      R.paths([['a', 'b'], ['p', 'r']], {a: {b: 2}, p: [{q: 3}]}); //=> [2, undefined]
 */

var paths =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function paths(pathsArray, obj) {
  return pathsArray.map(function (paths) {
    var val = obj;
    var idx = 0;
    var p;

    while (idx < paths.length) {
      if (val == null) {
        return;
      }

      p = paths[idx];
      val = (0,_internal_isInteger_js__WEBPACK_IMPORTED_MODULE_1__.default)(p) ? (0,_nth_js__WEBPACK_IMPORTED_MODULE_2__.default)(p, val) : val[p];
      idx += 1;
    }

    return val;
  });
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (paths);

/***/ }),

/***/ "./node_modules/ramda/es/pick.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/pick.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");

/**
 * Returns a partial copy of an object containing only the keys specified. If
 * the key does not exist, the property is ignored.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category Object
 * @sig [k] -> {k: v} -> {k: v}
 * @param {Array} names an array of String property names to copy onto a new object
 * @param {Object} obj The object to copy from
 * @return {Object} A new object with only properties from `names` on it.
 * @see R.omit, R.props
 * @example
 *
 *      R.pick(['a', 'd'], {a: 1, b: 2, c: 3, d: 4}); //=> {a: 1, d: 4}
 *      R.pick(['a', 'e', 'f'], {a: 1, b: 2, c: 3, d: 4}); //=> {a: 1}
 */

var pick =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function pick(names, obj) {
  var result = {};
  var idx = 0;

  while (idx < names.length) {
    if (names[idx] in obj) {
      result[names[idx]] = obj[names[idx]];
    }

    idx += 1;
  }

  return result;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (pick);

/***/ }),

/***/ "./node_modules/ramda/es/pipe.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/pipe.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ pipe)
/* harmony export */ });
/* harmony import */ var _internal_arity_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_arity.js */ "./node_modules/ramda/es/internal/_arity.js");
/* harmony import */ var _internal_pipe_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./internal/_pipe.js */ "./node_modules/ramda/es/internal/_pipe.js");
/* harmony import */ var _reduce_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reduce.js */ "./node_modules/ramda/es/reduce.js");
/* harmony import */ var _tail_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./tail.js */ "./node_modules/ramda/es/tail.js");




/**
 * Performs left-to-right function composition. The first argument may have
 * any arity; the remaining arguments must be unary.
 *
 * In some libraries this function is named `sequence`.
 *
 * **Note:** The result of pipe is not automatically curried.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category Function
 * @sig (((a, b, ..., n) -> o), (o -> p), ..., (x -> y), (y -> z)) -> ((a, b, ..., n) -> z)
 * @param {...Function} functions
 * @return {Function}
 * @see R.compose
 * @example
 *
 *      const f = R.pipe(Math.pow, R.negate, R.inc);
 *
 *      f(3, 4); // -(3^4) + 1
 * @symb R.pipe(f, g, h)(a, b) = h(g(f(a, b)))
 */

function pipe() {
  if (arguments.length === 0) {
    throw new Error('pipe requires at least one argument');
  }

  return (0,_internal_arity_js__WEBPACK_IMPORTED_MODULE_0__.default)(arguments[0].length, (0,_reduce_js__WEBPACK_IMPORTED_MODULE_1__.default)(_internal_pipe_js__WEBPACK_IMPORTED_MODULE_2__.default, arguments[0], (0,_tail_js__WEBPACK_IMPORTED_MODULE_3__.default)(arguments)));
}

/***/ }),

/***/ "./node_modules/ramda/es/propOr.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/propOr.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry3.js */ "./node_modules/ramda/es/internal/_curry3.js");
/* harmony import */ var _pathOr_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pathOr.js */ "./node_modules/ramda/es/pathOr.js");


/**
 * If the given, non-null object has an own property with the specified name,
 * returns the value of that property. Otherwise returns the provided default
 * value.
 *
 * @func
 * @memberOf R
 * @since v0.6.0
 * @category Object
 * @sig a -> String -> Object -> a
 * @param {*} val The default value.
 * @param {String} p The name of the property to return.
 * @param {Object} obj The object to query.
 * @return {*} The value of given property of the supplied object or the default value.
 * @example
 *
 *      const alice = {
 *        name: 'ALICE',
 *        age: 101
 *      };
 *      const favorite = R.prop('favoriteLibrary');
 *      const favoriteWithDefault = R.propOr('Ramda', 'favoriteLibrary');
 *
 *      favorite(alice);  //=> undefined
 *      favoriteWithDefault(alice);  //=> 'Ramda'
 */

var propOr =
/*#__PURE__*/
(0,_internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__.default)(function propOr(val, p, obj) {
  return (0,_pathOr_js__WEBPACK_IMPORTED_MODULE_1__.default)(val, [p], obj);
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (propOr);

/***/ }),

/***/ "./node_modules/ramda/es/reduce.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/reduce.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry3.js */ "./node_modules/ramda/es/internal/_curry3.js");
/* harmony import */ var _internal_reduce_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_reduce.js */ "./node_modules/ramda/es/internal/_reduce.js");


/**
 * Returns a single item by iterating through the list, successively calling
 * the iterator function and passing it an accumulator value and the current
 * value from the array, and then passing the result to the next call.
 *
 * The iterator function receives two values: *(acc, value)*. It may use
 * [`R.reduced`](#reduced) to shortcut the iteration.
 *
 * The arguments' order of [`reduceRight`](#reduceRight)'s iterator function
 * is *(value, acc)*.
 *
 * Note: `R.reduce` does not skip deleted or unassigned indices (sparse
 * arrays), unlike the native `Array.prototype.reduce` method. For more details
 * on this behavior, see:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce#Description
 *
 * Dispatches to the `reduce` method of the third argument, if present. When
 * doing so, it is up to the user to handle the [`R.reduced`](#reduced)
 * shortcuting, as this is not implemented by `reduce`.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig ((a, b) -> a) -> a -> [b] -> a
 * @param {Function} fn The iterator function. Receives two values, the accumulator and the
 *        current element from the array.
 * @param {*} acc The accumulator value.
 * @param {Array} list The list to iterate over.
 * @return {*} The final, accumulated value.
 * @see R.reduced, R.addIndex, R.reduceRight
 * @example
 *
 *      R.reduce(R.subtract, 0, [1, 2, 3, 4]) // => ((((0 - 1) - 2) - 3) - 4) = -10
 *      //          -               -10
 *      //         / \              / \
 *      //        -   4           -6   4
 *      //       / \              / \
 *      //      -   3   ==>     -3   3
 *      //     / \              / \
 *      //    -   2           -1   2
 *      //   / \              / \
 *      //  0   1            0   1
 *
 * @symb R.reduce(f, a, [b, c, d]) = f(f(f(a, b), c), d)
 */

var reduce =
/*#__PURE__*/
(0,_internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__.default)(_internal_reduce_js__WEBPACK_IMPORTED_MODULE_1__.default);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (reduce);

/***/ }),

/***/ "./node_modules/ramda/es/reject.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/reject.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_complement_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./internal/_complement.js */ "./node_modules/ramda/es/internal/_complement.js");
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");
/* harmony import */ var _filter_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./filter.js */ "./node_modules/ramda/es/filter.js");



/**
 * The complement of [`filter`](#filter).
 *
 * Acts as a transducer if a transformer is given in list position. Filterable
 * objects include plain objects or any object that has a filter method such
 * as `Array`.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig Filterable f => (a -> Boolean) -> f a -> f a
 * @param {Function} pred
 * @param {Array} filterable
 * @return {Array}
 * @see R.filter, R.transduce, R.addIndex
 * @example
 *
 *      const isOdd = (n) => n % 2 === 1;
 *
 *      R.reject(isOdd, [1, 2, 3, 4]); //=> [2, 4]
 *
 *      R.reject(isOdd, {a: 1, b: 2, c: 3, d: 4}); //=> {b: 2, d: 4}
 */

var reject =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function reject(pred, filterable) {
  return (0,_filter_js__WEBPACK_IMPORTED_MODULE_1__.default)((0,_internal_complement_js__WEBPACK_IMPORTED_MODULE_2__.default)(pred), filterable);
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (reject);

/***/ }),

/***/ "./node_modules/ramda/es/reverse.js":
/*!******************************************!*\
  !*** ./node_modules/ramda/es/reverse.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _internal_isString_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_isString.js */ "./node_modules/ramda/es/internal/_isString.js");


/**
 * Returns a new list or string with the elements or characters in reverse
 * order.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig [a] -> [a]
 * @sig String -> String
 * @param {Array|String} list
 * @return {Array|String}
 * @example
 *
 *      R.reverse([1, 2, 3]);  //=> [3, 2, 1]
 *      R.reverse([1, 2]);     //=> [2, 1]
 *      R.reverse([1]);        //=> [1]
 *      R.reverse([]);         //=> []
 *
 *      R.reverse('abc');      //=> 'cba'
 *      R.reverse('ab');       //=> 'ba'
 *      R.reverse('a');        //=> 'a'
 *      R.reverse('');         //=> ''
 */

var reverse =
/*#__PURE__*/
(0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(function reverse(list) {
  return (0,_internal_isString_js__WEBPACK_IMPORTED_MODULE_1__.default)(list) ? list.split('').reverse().join('') : Array.prototype.slice.call(list, 0).reverse();
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (reverse);

/***/ }),

/***/ "./node_modules/ramda/es/slice.js":
/*!****************************************!*\
  !*** ./node_modules/ramda/es/slice.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_checkForMethod_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_checkForMethod.js */ "./node_modules/ramda/es/internal/_checkForMethod.js");
/* harmony import */ var _internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry3.js */ "./node_modules/ramda/es/internal/_curry3.js");


/**
 * Returns the elements of the given list or string (or object with a `slice`
 * method) from `fromIndex` (inclusive) to `toIndex` (exclusive).
 *
 * Dispatches to the `slice` method of the third argument, if present.
 *
 * @func
 * @memberOf R
 * @since v0.1.4
 * @category List
 * @sig Number -> Number -> [a] -> [a]
 * @sig Number -> Number -> String -> String
 * @param {Number} fromIndex The start index (inclusive).
 * @param {Number} toIndex The end index (exclusive).
 * @param {*} list
 * @return {*}
 * @example
 *
 *      R.slice(1, 3, ['a', 'b', 'c', 'd']);        //=> ['b', 'c']
 *      R.slice(1, Infinity, ['a', 'b', 'c', 'd']); //=> ['b', 'c', 'd']
 *      R.slice(0, -1, ['a', 'b', 'c', 'd']);       //=> ['a', 'b', 'c']
 *      R.slice(-3, -1, ['a', 'b', 'c', 'd']);      //=> ['b', 'c']
 *      R.slice(0, 3, 'ramda');                     //=> 'ram'
 */

var slice =
/*#__PURE__*/
(0,_internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__.default)(
/*#__PURE__*/
(0,_internal_checkForMethod_js__WEBPACK_IMPORTED_MODULE_1__.default)('slice', function slice(fromIndex, toIndex, list) {
  return Array.prototype.slice.call(list, fromIndex, toIndex);
}));

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (slice);

/***/ }),

/***/ "./node_modules/ramda/es/tail.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/tail.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_checkForMethod_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_checkForMethod.js */ "./node_modules/ramda/es/internal/_checkForMethod.js");
/* harmony import */ var _internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");
/* harmony import */ var _slice_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./slice.js */ "./node_modules/ramda/es/slice.js");



/**
 * Returns all but the first element of the given list or string (or object
 * with a `tail` method).
 *
 * Dispatches to the `slice` method of the first argument, if present.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig [a] -> [a]
 * @sig String -> String
 * @param {*} list
 * @return {*}
 * @see R.head, R.init, R.last
 * @example
 *
 *      R.tail([1, 2, 3]);  //=> [2, 3]
 *      R.tail([1, 2]);     //=> [2]
 *      R.tail([1]);        //=> []
 *      R.tail([]);         //=> []
 *
 *      R.tail('abc');  //=> 'bc'
 *      R.tail('ab');   //=> 'b'
 *      R.tail('a');    //=> ''
 *      R.tail('');     //=> ''
 */

var tail =
/*#__PURE__*/
(0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(
/*#__PURE__*/
(0,_internal_checkForMethod_js__WEBPACK_IMPORTED_MODULE_1__.default)('tail',
/*#__PURE__*/
(0,_slice_js__WEBPACK_IMPORTED_MODULE_2__.default)(1, Infinity)));

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (tail);

/***/ }),

/***/ "./node_modules/ramda/es/type.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/type.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry1.js */ "./node_modules/ramda/es/internal/_curry1.js");

/**
 * Gives a single-word string description of the (native) type of a value,
 * returning such answers as 'Object', 'Number', 'Array', or 'Null'. Does not
 * attempt to distinguish user Object types any further, reporting them all as
 * 'Object'.
 *
 * @func
 * @memberOf R
 * @since v0.8.0
 * @category Type
 * @sig (* -> {*}) -> String
 * @param {*} val The value to test
 * @return {String}
 * @example
 *
 *      R.type({}); //=> "Object"
 *      R.type(1); //=> "Number"
 *      R.type(false); //=> "Boolean"
 *      R.type('s'); //=> "String"
 *      R.type(null); //=> "Null"
 *      R.type([]); //=> "Array"
 *      R.type(/[A-z]/); //=> "RegExp"
 *      R.type(() => {}); //=> "Function"
 *      R.type(undefined); //=> "Undefined"
 */

var type =
/*#__PURE__*/
(0,_internal_curry1_js__WEBPACK_IMPORTED_MODULE_0__.default)(function type(val) {
  return val === null ? 'Null' : val === undefined ? 'Undefined' : Object.prototype.toString.call(val).slice(8, -1);
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (type);

/***/ }),

/***/ "./node_modules/ramda/es/uniq.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/uniq.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _identity_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./identity.js */ "./node_modules/ramda/es/identity.js");
/* harmony import */ var _uniqBy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./uniqBy.js */ "./node_modules/ramda/es/uniqBy.js");


/**
 * Returns a new list containing only one copy of each element in the original
 * list. [`R.equals`](#equals) is used to determine equality.
 *
 * @func
 * @memberOf R
 * @since v0.1.0
 * @category List
 * @sig [a] -> [a]
 * @param {Array} list The array to consider.
 * @return {Array} The list of unique items.
 * @example
 *
 *      R.uniq([1, 1, 2, 1]); //=> [1, 2]
 *      R.uniq([1, '1']);     //=> [1, '1']
 *      R.uniq([[42], [42]]); //=> [[42]]
 */

var uniq =
/*#__PURE__*/
(0,_uniqBy_js__WEBPACK_IMPORTED_MODULE_0__.default)(_identity_js__WEBPACK_IMPORTED_MODULE_1__.default);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (uniq);

/***/ }),

/***/ "./node_modules/ramda/es/uniqBy.js":
/*!*****************************************!*\
  !*** ./node_modules/ramda/es/uniqBy.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_Set_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/_Set.js */ "./node_modules/ramda/es/internal/_Set.js");
/* harmony import */ var _internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry2.js */ "./node_modules/ramda/es/internal/_curry2.js");


/**
 * Returns a new list containing only one copy of each element in the original
 * list, based upon the value returned by applying the supplied function to
 * each list element. Prefers the first item if the supplied function produces
 * the same value on two items. [`R.equals`](#equals) is used for comparison.
 *
 * @func
 * @memberOf R
 * @since v0.16.0
 * @category List
 * @sig (a -> b) -> [a] -> [a]
 * @param {Function} fn A function used to produce a value to use during comparisons.
 * @param {Array} list The array to consider.
 * @return {Array} The list of unique items.
 * @example
 *
 *      R.uniqBy(Math.abs, [-1, -5, 2, 10, 1, 2]); //=> [-1, -5, 2, 10]
 */

var uniqBy =
/*#__PURE__*/
(0,_internal_curry2_js__WEBPACK_IMPORTED_MODULE_0__.default)(function uniqBy(fn, list) {
  var set = new _internal_Set_js__WEBPACK_IMPORTED_MODULE_1__.default();
  var result = [];
  var idx = 0;
  var appliedItem, item;

  while (idx < list.length) {
    item = list[idx];
    appliedItem = fn(item);

    if (set.add(appliedItem)) {
      result.push(item);
    }

    idx += 1;
  }

  return result;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (uniqBy);

/***/ }),

/***/ "./node_modules/ramda/es/when.js":
/*!***************************************!*\
  !*** ./node_modules/ramda/es/when.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/_curry3.js */ "./node_modules/ramda/es/internal/_curry3.js");

/**
 * Tests the final argument by passing it to the given predicate function. If
 * the predicate is satisfied, the function will return the result of calling
 * the `whenTrueFn` function with the same argument. If the predicate is not
 * satisfied, the argument is returned as is.
 *
 * @func
 * @memberOf R
 * @since v0.18.0
 * @category Logic
 * @sig (a -> Boolean) -> (a -> a) -> a -> a
 * @param {Function} pred       A predicate function
 * @param {Function} whenTrueFn A function to invoke when the `condition`
 *                              evaluates to a truthy value.
 * @param {*}        x          An object to test with the `pred` function and
 *                              pass to `whenTrueFn` if necessary.
 * @return {*} Either `x` or the result of applying `x` to `whenTrueFn`.
 * @see R.ifElse, R.unless, R.cond
 * @example
 *
 *      // truncate :: String -> String
 *      const truncate = R.when(
 *        R.propSatisfies(R.gt(R.__, 10), 'length'),
 *        R.pipe(R.take(10), R.append('…'), R.join(''))
 *      );
 *      truncate('12345');         //=> '12345'
 *      truncate('0123456789ABC'); //=> '0123456789…'
 */

var when =
/*#__PURE__*/
(0,_internal_curry3_js__WEBPACK_IMPORTED_MODULE_0__.default)(function when(pred, whenTrueFn, x) {
  return pred(x) ? whenTrueFn(x) : x;
});

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (when);

/***/ }),

/***/ "./node_modules/semver-compare/index.js":
/*!**********************************************!*\
  !*** ./node_modules/semver-compare/index.js ***!
  \**********************************************/
/***/ ((module) => {

module.exports = function cmp (a, b) {
    var pa = a.split('.');
    var pb = b.split('.');
    for (var i = 0; i < 3; i++) {
        var na = Number(pa[i]);
        var nb = Number(pb[i]);
        if (na > nb) return 1;
        if (nb > na) return -1;
        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;
    }
    return 0;
};


/***/ }),

/***/ "./node_modules/source-map-resolve/index.js":
/*!**************************************************!*\
  !*** ./node_modules/source-map-resolve/index.js ***!
  \**************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var atob = __webpack_require__(/*! atob */ "./node_modules/atob/browser-atob.js")
var urlLib = __webpack_require__(/*! url */ "?488f")
var pathLib = __webpack_require__(/*! path */ "?282e")
var decodeUriComponentLib = __webpack_require__(/*! decode-uri-component */ "./node_modules/decode-uri-component/index.js")



function resolveUrl(/* ...urls */) {
  return Array.prototype.reduce.call(arguments, function(resolved, nextUrl) {
    return urlLib.resolve(resolved, nextUrl)
  })
}

function convertWindowsPath(aPath) {
  return pathLib.sep === "\\" ? aPath.replace(/\\/g, "/").replace(/^[a-z]:\/?/i, "/") : aPath
}

function customDecodeUriComponent(string) {
  // `decodeUriComponentLib` turns `+` into ` `, but that's not wanted.
  return decodeUriComponentLib(string.replace(/\+/g, "%2B"))
}

function callbackAsync(callback, error, result) {
  setImmediate(function() { callback(error, result) })
}

function parseMapToJSON(string, data) {
  try {
    return JSON.parse(string.replace(/^\)\]\}'/, ""))
  } catch (error) {
    error.sourceMapData = data
    throw error
  }
}

function readSync(read, url, data) {
  var readUrl = customDecodeUriComponent(url)
  try {
    return String(read(readUrl))
  } catch (error) {
    error.sourceMapData = data
    throw error
  }
}



var innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/

var sourceMappingURLRegex = RegExp(
  "(?:" +
    "/\\*" +
    "(?:\\s*\r?\n(?://)?)?" +
    "(?:" + innerRegex.source + ")" +
    "\\s*" +
    "\\*/" +
    "|" +
    "//(?:" + innerRegex.source + ")" +
  ")" +
  "\\s*"
)

function getSourceMappingUrl(code) {
  var match = code.match(sourceMappingURLRegex)
  return match ? match[1] || match[2] || "" : null
}



function resolveSourceMap(code, codeUrl, read, callback) {
  var mapData
  try {
    mapData = resolveSourceMapHelper(code, codeUrl)
  } catch (error) {
    return callbackAsync(callback, error)
  }
  if (!mapData || mapData.map) {
    return callbackAsync(callback, null, mapData)
  }
  var readUrl = customDecodeUriComponent(mapData.url)
  read(readUrl, function(error, result) {
    if (error) {
      error.sourceMapData = mapData
      return callback(error)
    }
    mapData.map = String(result)
    try {
      mapData.map = parseMapToJSON(mapData.map, mapData)
    } catch (error) {
      return callback(error)
    }
    callback(null, mapData)
  })
}

function resolveSourceMapSync(code, codeUrl, read) {
  var mapData = resolveSourceMapHelper(code, codeUrl)
  if (!mapData || mapData.map) {
    return mapData
  }
  mapData.map = readSync(read, mapData.url, mapData)
  mapData.map = parseMapToJSON(mapData.map, mapData)
  return mapData
}

var dataUriRegex = /^data:([^,;]*)(;[^,;]*)*(?:,(.*))?$/

/**
 * The media type for JSON text is application/json.
 *
 * {@link https://tools.ietf.org/html/rfc8259#section-11 | IANA Considerations }
 *
 * `text/json` is non-standard media type
 */
var jsonMimeTypeRegex = /^(?:application|text)\/json$/

/**
 * JSON text exchanged between systems that are not part of a closed ecosystem
 * MUST be encoded using UTF-8.
 *
 * {@link https://tools.ietf.org/html/rfc8259#section-8.1 | Character Encoding}
 */
var jsonCharacterEncoding = "utf-8"

function base64ToBuf(b64) {
  var binStr = atob(b64)
  var len = binStr.length
  var arr = new Uint8Array(len)
  for (var i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i)
  }
  return arr
}

function decodeBase64String(b64) {
  if (typeof TextDecoder === "undefined" || typeof Uint8Array === "undefined") {
    return atob(b64)
  }
  var buf = base64ToBuf(b64);
  // Note: `decoder.decode` method will throw a `DOMException` with the
  // `"EncodingError"` value when an coding error is found.
  var decoder = new TextDecoder(jsonCharacterEncoding, {fatal: true})
  return decoder.decode(buf);
}

function resolveSourceMapHelper(code, codeUrl) {
  codeUrl = convertWindowsPath(codeUrl)

  var url = getSourceMappingUrl(code)
  if (!url) {
    return null
  }

  var dataUri = url.match(dataUriRegex)
  if (dataUri) {
    var mimeType = dataUri[1] || "text/plain"
    var lastParameter = dataUri[2] || ""
    var encoded = dataUri[3] || ""
    var data = {
      sourceMappingURL: url,
      url: null,
      sourcesRelativeTo: codeUrl,
      map: encoded
    }
    if (!jsonMimeTypeRegex.test(mimeType)) {
      var error = new Error("Unuseful data uri mime type: " + mimeType)
      error.sourceMapData = data
      throw error
    }
    try {
      data.map = parseMapToJSON(
        lastParameter === ";base64" ? decodeBase64String(encoded) : decodeURIComponent(encoded),
        data
      )
    } catch (error) {
      error.sourceMapData = data
      throw error
    }
    return data
  }

  var mapUrl = resolveUrl(codeUrl, url)
  return {
    sourceMappingURL: url,
    url: mapUrl,
    sourcesRelativeTo: mapUrl,
    map: null
  }
}



function resolveSources(map, mapUrl, read, options, callback) {
  if (typeof options === "function") {
    callback = options
    options = {}
  }
  var pending = map.sources ? map.sources.length : 0
  var result = {
    sourcesResolved: [],
    sourcesContent:  []
  }

  if (pending === 0) {
    callbackAsync(callback, null, result)
    return
  }

  var done = function() {
    pending--
    if (pending === 0) {
      callback(null, result)
    }
  }

  resolveSourcesHelper(map, mapUrl, options, function(fullUrl, sourceContent, index) {
    result.sourcesResolved[index] = fullUrl
    if (typeof sourceContent === "string") {
      result.sourcesContent[index] = sourceContent
      callbackAsync(done, null)
    } else {
      var readUrl = customDecodeUriComponent(fullUrl)
      read(readUrl, function(error, source) {
        result.sourcesContent[index] = error ? error : String(source)
        done()
      })
    }
  })
}

function resolveSourcesSync(map, mapUrl, read, options) {
  var result = {
    sourcesResolved: [],
    sourcesContent:  []
  }

  if (!map.sources || map.sources.length === 0) {
    return result
  }

  resolveSourcesHelper(map, mapUrl, options, function(fullUrl, sourceContent, index) {
    result.sourcesResolved[index] = fullUrl
    if (read !== null) {
      if (typeof sourceContent === "string") {
        result.sourcesContent[index] = sourceContent
      } else {
        var readUrl = customDecodeUriComponent(fullUrl)
        try {
          result.sourcesContent[index] = String(read(readUrl))
        } catch (error) {
          result.sourcesContent[index] = error
        }
      }
    }
  })

  return result
}

var endingSlash = /\/?$/

function resolveSourcesHelper(map, mapUrl, options, fn) {
  options = options || {}
  mapUrl = convertWindowsPath(mapUrl)
  var fullUrl
  var sourceContent
  var sourceRoot
  for (var index = 0, len = map.sources.length; index < len; index++) {
    sourceRoot = null
    if (typeof options.sourceRoot === "string") {
      sourceRoot = options.sourceRoot
    } else if (typeof map.sourceRoot === "string" && options.sourceRoot !== false) {
      sourceRoot = map.sourceRoot
    }
    // If the sourceRoot is the empty string, it is equivalent to not setting
    // the property at all.
    if (sourceRoot === null || sourceRoot === '') {
      fullUrl = resolveUrl(mapUrl, map.sources[index])
    } else {
      // Make sure that the sourceRoot ends with a slash, so that `/scripts/subdir` becomes
      // `/scripts/subdir/<source>`, not `/scripts/<source>`. Pointing to a file as source root
      // does not make sense.
      fullUrl = resolveUrl(mapUrl, sourceRoot.replace(endingSlash, "/"), map.sources[index])
    }
    sourceContent = (map.sourcesContent || [])[index]
    fn(fullUrl, sourceContent, index)
  }
}



function resolve(code, codeUrl, read, options, callback) {
  if (typeof options === "function") {
    callback = options
    options = {}
  }
  if (code === null) {
    var mapUrl = codeUrl
    var data = {
      sourceMappingURL: null,
      url: mapUrl,
      sourcesRelativeTo: mapUrl,
      map: null
    }
    var readUrl = customDecodeUriComponent(mapUrl)
    read(readUrl, function(error, result) {
      if (error) {
        error.sourceMapData = data
        return callback(error)
      }
      data.map = String(result)
      try {
        data.map = parseMapToJSON(data.map, data)
      } catch (error) {
        return callback(error)
      }
      _resolveSources(data)
    })
  } else {
    resolveSourceMap(code, codeUrl, read, function(error, mapData) {
      if (error) {
        return callback(error)
      }
      if (!mapData) {
        return callback(null, null)
      }
      _resolveSources(mapData)
    })
  }

  function _resolveSources(mapData) {
    resolveSources(mapData.map, mapData.sourcesRelativeTo, read, options, function(error, result) {
      if (error) {
        return callback(error)
      }
      mapData.sourcesResolved = result.sourcesResolved
      mapData.sourcesContent  = result.sourcesContent
      callback(null, mapData)
    })
  }
}

function resolveSync(code, codeUrl, read, options) {
  var mapData
  if (code === null) {
    var mapUrl = codeUrl
    mapData = {
      sourceMappingURL: null,
      url: mapUrl,
      sourcesRelativeTo: mapUrl,
      map: null
    }
    mapData.map = readSync(read, mapUrl, mapData)
    mapData.map = parseMapToJSON(mapData.map, mapData)
  } else {
    mapData = resolveSourceMapSync(code, codeUrl, read)
    if (!mapData) {
      return null
    }
  }
  var result = resolveSourcesSync(mapData.map, mapData.sourcesRelativeTo, read, options)
  mapData.sourcesResolved = result.sourcesResolved
  mapData.sourcesContent  = result.sourcesContent
  return mapData
}



module.exports = {
  resolveSourceMap:     resolveSourceMap,
  resolveSourceMapSync: resolveSourceMapSync,
  resolveSources:       resolveSources,
  resolveSourcesSync:   resolveSourcesSync,
  resolve:              resolve,
  resolveSync:          resolveSync,
  parseMapToJSON:       parseMapToJSON
}


/***/ }),

/***/ "./node_modules/source-map/lib/array-set.js":
/*!**************************************************!*\
  !*** ./node_modules/source-map/lib/array-set.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = __webpack_require__(/*! ./util */ "./node_modules/source-map/lib/util.js");
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

exports.ArraySet = ArraySet;


/***/ }),

/***/ "./node_modules/source-map/lib/base64-vlq.js":
/*!***************************************************!*\
  !*** ./node_modules/source-map/lib/base64-vlq.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = __webpack_require__(/*! ./base64 */ "./node_modules/source-map/lib/base64.js");

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
exports.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};


/***/ }),

/***/ "./node_modules/source-map/lib/base64.js":
/*!***********************************************!*\
  !*** ./node_modules/source-map/lib/base64.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
exports.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
exports.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};


/***/ }),

/***/ "./node_modules/source-map/lib/binary-search.js":
/*!******************************************************!*\
  !*** ./node_modules/source-map/lib/binary-search.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};


/***/ }),

/***/ "./node_modules/source-map/lib/mapping-list.js":
/*!*****************************************************!*\
  !*** ./node_modules/source-map/lib/mapping-list.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = __webpack_require__(/*! ./util */ "./node_modules/source-map/lib/util.js");

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA ||
         util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
function MappingList() {
  this._array = [];
  this._sorted = true;
  // Serves as infimum
  this._last = {generatedLine: -1, generatedColumn: 0};
}

/**
 * Iterate through internal items. This method takes the same arguments that
 * `Array.prototype.forEach` takes.
 *
 * NOTE: The order of the mappings is NOT guaranteed.
 */
MappingList.prototype.unsortedForEach =
  function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

/**
 * Add the given source mapping.
 *
 * @param Object aMapping
 */
MappingList.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};

/**
 * Returns the flat, sorted array of mappings. The mappings are sorted by
 * generated position.
 *
 * WARNING: This method returns internal data without copying, for
 * performance. The return value must NOT be mutated, and should be treated as
 * an immutable borrow. If you want to take ownership, you must make your own
 * copy.
 */
MappingList.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};

exports.MappingList = MappingList;


/***/ }),

/***/ "./node_modules/source-map/lib/quick-sort.js":
/*!***************************************************!*\
  !*** ./node_modules/source-map/lib/quick-sort.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
exports.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};


/***/ }),

/***/ "./node_modules/source-map/lib/source-map-consumer.js":
/*!************************************************************!*\
  !*** ./node_modules/source-map/lib/source-map-consumer.js ***!
  \************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = __webpack_require__(/*! ./util */ "./node_modules/source-map/lib/util.js");
var binarySearch = __webpack_require__(/*! ./binary-search */ "./node_modules/source-map/lib/binary-search.js");
var ArraySet = __webpack_require__(/*! ./array-set */ "./node_modules/source-map/lib/array-set.js").ArraySet;
var base64VLQ = __webpack_require__(/*! ./base64-vlq */ "./node_modules/source-map/lib/base64-vlq.js");
var quickSort = __webpack_require__(/*! ./quick-sort */ "./node_modules/source-map/lib/quick-sort.js").quickSort;

function SourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
}

SourceMapConsumer.fromSourceMap = function(aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
}

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      source = util.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number is 1-based.
 *   - column: Optional. the column number in the original source.
 *    The column number is 0-based.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *    line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *    The column number is 0-based.
 */
SourceMapConsumer.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util.getArg(aArgs, 'column', 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

exports.SourceMapConsumer = SourceMapConsumer;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  var version = util.getArg(sourceMap, 'version');
  var sources = util.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util.getArg(sourceMap, 'names', []);
  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util.getArg(sourceMap, 'mappings');
  var file = util.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  if (sourceRoot) {
    sourceRoot = util.normalize(sourceRoot);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
        ? util.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this._absoluteSources = this._sources.toArray().map(function (s) {
    return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

/**
 * Utility function to find the index of a source.  Returns -1 if not
 * found.
 */
BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
  var relativeSource = aSource;
  if (this.sourceRoot != null) {
    relativeSource = util.relative(this.sourceRoot, relativeSource);
  }

  if (this._sources.has(relativeSource)) {
    return this._sources.indexOf(relativeSource);
  }

  // Maybe aSource is an absolute URL as returned by |sources|.  In
  // this case we can't simply undo the transform.
  var i;
  for (i = 0; i < this._absoluteSources.length; ++i) {
    if (this._absoluteSources[i] == aSource) {
      return i;
    }
  }

  return -1;
};

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @param String aSourceMapURL
 *        The URL at which the source map can be found (optional)
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map(function (s) {
      return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    });

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._absoluteSources.slice();
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util.compareByGeneratedPositionsDeflated,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }
        var name = util.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    var index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util.relative(this.sourceRoot, relativeSource);
    }

    var url;
    if (this.sourceRoot != null
        && (url = util.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util.getArg(aArgs, 'source');
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    var needle = {
      source: source,
      originalLine: util.getArg(aArgs, 'line'),
      originalColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util.compareByOriginalPositions,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  var version = util.getArg(sourceMap, 'version');
  var sections = util.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util.getArg(s, 'offset');
    var offsetLine = util.getArg(offset, 'line');
    var offsetColumn = util.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer(util.getArg(s, 'map'), aSourceMapURL)
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based. 
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(util.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util.compareByOriginalPositions);
  };

exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;


/***/ }),

/***/ "./node_modules/source-map/lib/source-map-generator.js":
/*!*************************************************************!*\
  !*** ./node_modules/source-map/lib/source-map-generator.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var base64VLQ = __webpack_require__(/*! ./base64-vlq */ "./node_modules/source-map/lib/base64-vlq.js");
var util = __webpack_require__(/*! ./util */ "./node_modules/source-map/lib/util.js");
var ArraySet = __webpack_require__(/*! ./array-set */ "./node_modules/source-map/lib/array-set.js").ArraySet;
var MappingList = __webpack_require__(/*! ./mapping-list */ "./node_modules/source-map/lib/mapping-list.js").MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
function SourceMapGenerator(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util.getArg(aArgs, 'file', null);
  this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
  this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
  this._sources = new ArraySet();
  this._names = new ArraySet();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}

SourceMapGenerator.prototype._version = 3;

/**
 * Creates a new SourceMapGenerator based on a SourceMapConsumer
 *
 * @param aSourceMapConsumer The SourceMap.
 */
SourceMapGenerator.fromSourceMap =
  function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function (mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

/**
 * Add a single mapping from original source line and column to the generated
 * source's line and column for this source map being created. The mapping
 * object should have the following properties:
 *
 *   - generated: An object with the generated line and column positions.
 *   - original: An object with the original line and column positions.
 *   - source: The original source file (relative to the sourceRoot).
 *   - name: An optional original token name for this mapping.
 */
SourceMapGenerator.prototype.addMapping =
  function SourceMapGenerator_addMapping(aArgs) {
    var generated = util.getArg(aArgs, 'generated');
    var original = util.getArg(aArgs, 'original', null);
    var source = util.getArg(aArgs, 'source', null);
    var name = util.getArg(aArgs, 'name', null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

/**
 * Set the source content for a source file.
 */
SourceMapGenerator.prototype.setSourceContent =
  function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

/**
 * Applies the mappings of a sub-source-map for a specific source file to the
 * source map being generated. Each mapping to the supplied source file is
 * rewritten using the supplied source map. Note: The resolution for the
 * resulting mappings is the minimium of this map and the supplied map.
 *
 * @param aSourceMapConsumer The source map to be applied.
 * @param aSourceFile Optional. The filename of the source file.
 *        If omitted, SourceMapConsumer's file property will be used.
 * @param aSourceMapPath Optional. The dirname of the path to the source map
 *        to be applied. If relative, it is relative to the SourceMapConsumer.
 *        This parameter is needed when the two source maps aren't in the same
 *        directory, and the source map to be applied contains relative source
 *        paths. If so, those relative source paths need to be rewritten
 *        relative to the SourceMapGenerator.
 */
SourceMapGenerator.prototype.applySourceMap =
  function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = new ArraySet();
    var newNames = new ArraySet();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function (mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util.join(aSourceMapPath, mapping.source)
          }
          if (sourceRoot != null) {
            mapping.source = util.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile = util.join(aSourceMapPath, sourceFile);
        }
        if (sourceRoot != null) {
          sourceFile = util.relative(sourceRoot, sourceFile);
        }
        this.setSourceContent(sourceFile, content);
      }
    }, this);
  };

/**
 * A mapping can have one of the three levels of data:
 *
 *   1. Just the generated position.
 *   2. The Generated position, original position, and original source.
 *   3. Generated and original position, original source, as well as a name
 *      token.
 *
 * To maintain consistency, we validate that any new mapping being added falls
 * in to one of these categories.
 */
SourceMapGenerator.prototype._validateMapping =
  function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                              aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
        throw new Error(
            'original.line and original.column are not numbers -- you probably meant to omit ' +
            'the original mapping entirely and only map the generated position. If so, pass ' +
            'null for the original mapping instead of an object with empty or null values.'
        );
    }

    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) {
      // Case 1.
      return;
    }
    else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
             && aOriginal && 'line' in aOriginal && 'column' in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) {
      // Cases 2 and 3.
      return;
    }
    else {
      throw new Error('Invalid mapping: ' + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

/**
 * Serialize the accumulated mappings in to the stream of base 64 VLQs
 * specified by the source map format.
 */
SourceMapGenerator.prototype._serializeMappings =
  function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = '';
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = ''

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ';';
          previousGeneratedLine++;
        }
      }
      else {
        if (i > 0) {
          if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ',';
        }
      }

      next += base64VLQ.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64VLQ.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64VLQ.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

SourceMapGenerator.prototype._generateSourcesContent =
  function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function (source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util.relative(aSourceRoot, source);
      }
      var key = util.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

/**
 * Externalize the source map.
 */
SourceMapGenerator.prototype.toJSON =
  function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

/**
 * Render the source map being generated to a string.
 */
SourceMapGenerator.prototype.toString =
  function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };

exports.SourceMapGenerator = SourceMapGenerator;


/***/ }),

/***/ "./node_modules/source-map/lib/source-node.js":
/*!****************************************************!*\
  !*** ./node_modules/source-map/lib/source-node.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var SourceMapGenerator = __webpack_require__(/*! ./source-map-generator */ "./node_modules/source-map/lib/source-map-generator.js").SourceMapGenerator;
var util = __webpack_require__(/*! ./util */ "./node_modules/source-map/lib/util.js");

// Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
// operating systems these days (capturing the result).
var REGEX_NEWLINE = /(\r?\n)/;

// Newline character code for charCodeAt() comparisons
var NEWLINE_CODE = 10;

// Private symbol for identifying `SourceNode`s when multiple versions of
// the source-map library are loaded. This MUST NOT CHANGE across
// versions!
var isSourceNode = "$$$isSourceNode$$$";

/**
 * SourceNodes provide a way to abstract over interpolating/concatenating
 * snippets of generated JavaScript source code while maintaining the line and
 * column information associated with the original source code.
 *
 * @param aLine The original line number.
 * @param aColumn The original column number.
 * @param aSource The original source's filename.
 * @param aChunks Optional. An array of strings which are snippets of
 *        generated JS, or other SourceNodes.
 * @param aName The original identifier.
 */
function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
  this.children = [];
  this.sourceContents = {};
  this.line = aLine == null ? null : aLine;
  this.column = aColumn == null ? null : aColumn;
  this.source = aSource == null ? null : aSource;
  this.name = aName == null ? null : aName;
  this[isSourceNode] = true;
  if (aChunks != null) this.add(aChunks);
}

/**
 * Creates a SourceNode from generated code and a SourceMapConsumer.
 *
 * @param aGeneratedCode The generated code
 * @param aSourceMapConsumer The SourceMap for the generated code
 * @param aRelativePath Optional. The path that relative sources in the
 *        SourceMapConsumer should be relative to.
 */
SourceNode.fromStringWithSourceMap =
  function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    var node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      // The last line of a file might not have a newline.
      var newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    var lastMapping = null;

    aSourceMapConsumer.eachMapping(function (mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          var nextLine = remainingLines[remainingLinesIndex] || '';
          var code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        var nextLine = remainingLines[remainingLinesIndex] || '';
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function (sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        var source = aRelativePath
          ? util.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  };

/**
 * Add a chunk of generated JS to this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.add = function SourceNode_add(aChunk) {
  if (Array.isArray(aChunk)) {
    aChunk.forEach(function (chunk) {
      this.add(chunk);
    }, this);
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    if (aChunk) {
      this.children.push(aChunk);
    }
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Add a chunk of generated JS to the beginning of this source node.
 *
 * @param aChunk A string snippet of generated JS code, another instance of
 *        SourceNode, or an array where each member is one of those things.
 */
SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
  if (Array.isArray(aChunk)) {
    for (var i = aChunk.length-1; i >= 0; i--) {
      this.prepend(aChunk[i]);
    }
  }
  else if (aChunk[isSourceNode] || typeof aChunk === "string") {
    this.children.unshift(aChunk);
  }
  else {
    throw new TypeError(
      "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
    );
  }
  return this;
};

/**
 * Walk over the tree of JS snippets in this node and its children. The
 * walking function is called once for each snippet of JS and is passed that
 * snippet and the its original associated source's line/column location.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walk = function SourceNode_walk(aFn) {
  var chunk;
  for (var i = 0, len = this.children.length; i < len; i++) {
    chunk = this.children[i];
    if (chunk[isSourceNode]) {
      chunk.walk(aFn);
    }
    else {
      if (chunk !== '') {
        aFn(chunk, { source: this.source,
                     line: this.line,
                     column: this.column,
                     name: this.name });
      }
    }
  }
};

/**
 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
 * each of `this.children`.
 *
 * @param aSep The separator.
 */
SourceNode.prototype.join = function SourceNode_join(aSep) {
  var newChildren;
  var i;
  var len = this.children.length;
  if (len > 0) {
    newChildren = [];
    for (i = 0; i < len-1; i++) {
      newChildren.push(this.children[i]);
      newChildren.push(aSep);
    }
    newChildren.push(this.children[i]);
    this.children = newChildren;
  }
  return this;
};

/**
 * Call String.prototype.replace on the very right-most source snippet. Useful
 * for trimming whitespace from the end of a source node, etc.
 *
 * @param aPattern The pattern to replace.
 * @param aReplacement The thing to replace the pattern with.
 */
SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
  var lastChild = this.children[this.children.length - 1];
  if (lastChild[isSourceNode]) {
    lastChild.replaceRight(aPattern, aReplacement);
  }
  else if (typeof lastChild === 'string') {
    this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
  }
  else {
    this.children.push(''.replace(aPattern, aReplacement));
  }
  return this;
};

/**
 * Set the source content for a source file. This will be added to the SourceMapGenerator
 * in the sourcesContent field.
 *
 * @param aSourceFile The filename of the source file
 * @param aSourceContent The content of the source file
 */
SourceNode.prototype.setSourceContent =
  function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
  };

/**
 * Walk over the tree of SourceNodes. The walking function is called for each
 * source file content and is passed the filename and source content.
 *
 * @param aFn The traversal function.
 */
SourceNode.prototype.walkSourceContents =
  function SourceNode_walkSourceContents(aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    var sources = Object.keys(this.sourceContents);
    for (var i = 0, len = sources.length; i < len; i++) {
      aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  };

/**
 * Return the string representation of this source node. Walks over the tree
 * and concatenates all the various snippets together to one string.
 */
SourceNode.prototype.toString = function SourceNode_toString() {
  var str = "";
  this.walk(function (chunk) {
    str += chunk;
  });
  return str;
};

/**
 * Returns the string representation of this source node along with a source
 * map.
 */
SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
  var generated = {
    code: "",
    line: 1,
    column: 0
  };
  var map = new SourceMapGenerator(aArgs);
  var sourceMappingActive = false;
  var lastOriginalSource = null;
  var lastOriginalLine = null;
  var lastOriginalColumn = null;
  var lastOriginalName = null;
  this.walk(function (chunk, original) {
    generated.code += chunk;
    if (original.source !== null
        && original.line !== null
        && original.column !== null) {
      if(lastOriginalSource !== original.source
         || lastOriginalLine !== original.line
         || lastOriginalColumn !== original.column
         || lastOriginalName !== original.name) {
        map.addMapping({
          source: original.source,
          original: {
            line: original.line,
            column: original.column
          },
          generated: {
            line: generated.line,
            column: generated.column
          },
          name: original.name
        });
      }
      lastOriginalSource = original.source;
      lastOriginalLine = original.line;
      lastOriginalColumn = original.column;
      lastOriginalName = original.name;
      sourceMappingActive = true;
    } else if (sourceMappingActive) {
      map.addMapping({
        generated: {
          line: generated.line,
          column: generated.column
        }
      });
      lastOriginalSource = null;
      sourceMappingActive = false;
    }
    for (var idx = 0, length = chunk.length; idx < length; idx++) {
      if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
        generated.line++;
        generated.column = 0;
        // Mappings end at eol
        if (idx + 1 === length) {
          lastOriginalSource = null;
          sourceMappingActive = false;
        } else if (sourceMappingActive) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
      } else {
        generated.column++;
      }
    }
  });
  this.walkSourceContents(function (sourceFile, sourceContent) {
    map.setSourceContent(sourceFile, sourceContent);
  });

  return { code: generated.code, map: map };
};

exports.SourceNode = SourceNode;


/***/ }),

/***/ "./node_modules/source-map/lib/util.js":
/*!*********************************************!*\
  !*** ./node_modules/source-map/lib/util.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports) => {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
}
exports.parseSourceMapInput = parseSourceMapInput;

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  sourceURL = sourceURL || '';

  if (sourceRoot) {
    // This follows what Chrome does.
    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
      sourceRoot += '/';
    }
    // The spec says:
    //   Line 4: An optional source root, useful for relocating source
    //   files on a server or removing repeated values in the
    //   “sources” entry.  This value is prepended to the individual
    //   entries in the “source” field.
    sourceURL = sourceRoot + sourceURL;
  }

  // Historically, SourceMapConsumer did not take the sourceMapURL as
  // a parameter.  This mode is still somewhat supported, which is why
  // this code block is conditional.  However, it's preferable to pass
  // the source map URL to SourceMapConsumer, so that this function
  // can implement the source URL resolution algorithm as outlined in
  // the spec.  This block is basically the equivalent of:
  //    new URL(sourceURL, sourceMapURL).toString()
  // ... except it avoids using URL, which wasn't available in the
  // older releases of node still supported by this library.
  //
  // The spec says:
  //   If the sources are not absolute URLs after prepending of the
  //   “sourceRoot”, the sources are resolved relative to the
  //   SourceMap (like resolving script src in a html document).
  if (sourceMapURL) {
    var parsed = urlParse(sourceMapURL);
    if (!parsed) {
      throw new Error("sourceMapURL could not be parsed");
    }
    if (parsed.path) {
      // Strip the last path component, but keep the "/".
      var index = parsed.path.lastIndexOf('/');
      if (index >= 0) {
        parsed.path = parsed.path.substring(0, index + 1);
      }
    }
    sourceURL = join(urlGenerate(parsed), sourceURL);
  }

  return normalize(sourceURL);
}
exports.computeSourceURL = computeSourceURL;


/***/ }),

/***/ "./node_modules/source-map/source-map.js":
/*!***********************************************!*\
  !*** ./node_modules/source-map/source-map.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = __webpack_require__(/*! ./lib/source-map-generator */ "./node_modules/source-map/lib/source-map-generator.js").SourceMapGenerator;
exports.SourceMapConsumer = __webpack_require__(/*! ./lib/source-map-consumer */ "./node_modules/source-map/lib/source-map-consumer.js").SourceMapConsumer;
exports.SourceNode = __webpack_require__(/*! ./lib/source-node */ "./node_modules/source-map/lib/source-node.js").SourceNode;


/***/ }),

/***/ "./src/lib/html-tagged-template.js":
/*!*****************************************!*\
  !*** ./src/lib/html-tagged-template.js ***!
  \*****************************************/
/***/ (() => {

(function(window) {
    "use strict"

    // test for es6 support of needed functionality
    try {
        // spread operator and template strings support
        (function testSpreadOpAndTemplate() {
            const tag = function tag() {
                return
            }
            // We don't need this value - we're just checking if its attempted creation causes any errors
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            tag`test`
        })()

        // template tag and Array.from support
        if (
            !(
                "content" in document.createElement("template") &&
                "from" in Array
            )
        ) {
            throw new Error()
        }
    } catch (e) {
        // missing support;
        console.log(
            "Your browser does not support the needed functionality to use the html tagged template",
        )
        return
    }

    if (typeof window.html === "undefined") {
        // --------------------------------------------------
        // constants
        // --------------------------------------------------

        const SUBSTITUTION_INDEX = "substitutionindex:" // tag names are always all lowercase
        const SUBSTITUTION_REGEX = new RegExp(
            SUBSTITUTION_INDEX + "([0-9]+):",
            "g",
        )

        // rejection string is used to replace xss attacks that cannot be escaped either
        // because the escaped string is still executable
        // (e.g. setTimeout(/* escaped string */)) or because it produces invalid results
        // (e.g. <h${xss}> where xss='><script>alert(1337)</script')
        // @see https://developers.google.com/closure/templates/docs/security#in_tags_and_attrs
        const REJECTION_STRING = "zXssPreventedz"

        // which characters should be encoded in which contexts
        const ENCODINGS = {
            attribute: {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
            },
            uri: {
                "&": "&amp;",
            },
        }

        // which attributes are DOM Level 0 events
        // taken from https://en.wikipedia.org/wiki/DOM_events#DOM_Level_0
        const DOM_EVENTS = [
            "onclick",
            "ondblclick",
            "onmousedown",
            "onmouseup",
            "onmouseover",
            "onmousemove",
            "onmouseout",
            "ondragstart",
            "ondrag",
            "ondragenter",
            "ondragleave",
            "ondragover",
            "ondrop",
            "ondragend",
            "onkeydown",
            "onkeypress",
            "onkeyup",
            "onload",
            "onunload",
            "onabort",
            "onerror",
            "onresize",
            "onscroll",
            "onselect",
            "onchange",
            "onsubmit",
            "onreset",
            "onfocus",
            "onblur",
            "onpointerdown",
            "onpointerup",
            "onpointercancel",
            "onpointermove",
            "onpointerover",
            "onpointerout",
            "onpointerenter",
            "onpointerleave",
            "ongotpointercapture",
            "onlostpointercapture",
            "oncut",
            "oncopy",
            "onpaste",
            "onbeforecut",
            "onbeforecopy",
            "onbeforepaste",
            "onafterupdate",
            "onbeforeupdate",
            "oncellchange",
            "ondataavailable",
            "ondatasetchanged",
            "ondatasetcomplete",
            "onerrorupdate",
            "onrowenter",
            "onrowexit",
            "onrowsdelete",
            "onrowinserted",
            "oncontextmenu",
            "ondrag",
            "ondragstart",
            "ondragenter",
            "ondragover",
            "ondragleave",
            "ondragend",
            "ondrop",
            "onselectstart",
            "help",
            "onbeforeunload",
            "onstop",
            "beforeeditfocus",
            "onstart",
            "onfinish",
            "onbounce",
            "onbeforeprint",
            "onafterprint",
            "onpropertychange",
            "onfilterchange",
            "onreadystatechange",
            "onlosecapture",
            "DOMMouseScroll",
            "ondragdrop",
            "ondragenter",
            "ondragexit",
            "ondraggesture",
            "ondragover",
            "onclose",
            "oncommand",
            "oninput",
            "DOMMenuItemActive",
            "DOMMenuItemInactive",
            "oncontextmenu",
            "onoverflow",
            "onoverflowchanged",
            "onunderflow",
            "onpopuphidden",
            "onpopuphiding",
            "onpopupshowing",
            "onpopupshown",
            "onbroadcast",
            "oncommandupdate",
        ]

        // which attributes take URIs
        // taken from https://www.w3.org/TR/html4/index/attributes.html
        const URI_ATTRIBUTES = [
            "action",
            "background",
            "cite",
            "classid",
            "codebase",
            "data",
            "href",
            "longdesc",
            "profile",
            "src",
            "usemap",
        ]

        const ENCODINGS_REGEX = {
            attribute: new RegExp(
                "[" + Object.keys(ENCODINGS.attribute).join("") + "]",
                "g",
            ),
            uri: new RegExp(
                "[" + Object.keys(ENCODINGS.uri).join("") + "]",
                "g",
            ),
        }

        // find all attributes after the first whitespace (which would follow the tag
        // name. Only used when the DOM has been clobbered to still parse attributes
        const ATTRIBUTE_PARSER_REGEX = /\s([^">=\s]+)(?:="[^"]+")?/g

        // test if a javascript substitution is wrapped with quotes
        const WRAPPED_WITH_QUOTES_REGEX = /^('|")[\s\S]*\1$/

        // allow custom attribute names that start or end with url or ui to do uri escaping
        // @see https://developers.google.com/closure/templates/docs/security#in_urls
        const CUSTOM_URI_ATTRIBUTES_REGEX = /\bur[il]|ur[il]s?$/i

        // --------------------------------------------------
        // private functions
        // --------------------------------------------------

        /**
         * Escape HTML entities in an attribute.
         * @private
         *
         * @param {string} str - String to escape.
         *
         * @returns {string}
         */
        function encodeAttributeHTMLEntities(str) {
            return str.replace(ENCODINGS_REGEX.attribute, function(match) {
                return ENCODINGS.attribute[match]
            })
        }

        /**
         * Escape entities in a URI.
         * @private
         *
         * @param {string} str - URI to escape.
         *
         * @returns {string}
         */
        function encodeURIEntities(str) {
            return str.replace(ENCODINGS_REGEX.uri, function(match) {
                return ENCODINGS.uri[match]
            })
        }

        // --------------------------------------------------
        // html tagged template function
        // --------------------------------------------------

        /**
         * Safely convert a DOM string into DOM nodes using by using E4H and contextual
         * auto-escaping techniques to prevent xss attacks.
         *
         * @param {string[]} strings - Safe string literals.
         * @param {*} values - Unsafe substitution expressions.
         *
         * @returns {HTMLElement|DocumentFragment}
         */
        window.html = function(strings, ...values) {
            // break early if called with empty content
            if (!strings[0] && values.length === 0) {
                return
            }

            /**
             * Replace a string with substitution placeholders with its substitution values.
             * @private
             *
             * @param {string} match - Matched substitution placeholder.
             * @param {string} index - Substitution placeholder index.
             */
            function replaceSubstitution(match, index) {
                return values[parseInt(index, 10)]
            }

            // insert placeholders into the generated string so we can run it through the
            // HTML parser without any malicious content.
            // (this particular placeholder will even work when used to create a DOM element)
            let str = strings[0]
            for (let i = 0; i < values.length; i++) {
                str += SUBSTITUTION_INDEX + i + ":" + strings[i + 1]
            }

            // template tags allow any HTML (even <tr> elements out of context)
            // @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
            const template = document.createElement("template")
            template.innerHTML = str

            // find all substitution values and safely encode them using DOM APIs and
            // contextual auto-escaping
            const walker = document.createNodeIterator(
                template.content,
                NodeFilter.SHOW_ALL,
            )
            let node
            while ((node = walker.nextNode())) {
                let tag = null
                const attributesToRemove = []

                // --------------------------------------------------
                // node name substitution
                // --------------------------------------------------

                let nodeName = node.nodeName.toLowerCase()
                if (nodeName.indexOf(SUBSTITUTION_INDEX) !== -1) {
                    nodeName = nodeName.replace(
                        SUBSTITUTION_REGEX,
                        replaceSubstitution,
                    )

                    // createElement() should not need to be escaped to prevent XSS?

                    // this will throw an error if the tag name is invalid (e.g. xss tried
                    // to escape out of the tag using '><script>alert(1337)</script><')
                    // instead of replacing the tag name we'll just let the error be thrown
                    tag = document.createElement(nodeName)

                    // mark that this node needs to be cleaned up later with the newly
                    // created node
                    node._replacedWith = tag

                    // use insertBefore() instead of replaceChild() so that the node Iterator
                    // doesn't think the new tag should be the next node
                    node.parentNode.insertBefore(tag, node)

                // special case for script tags:
                // using innerHTML with a string that contains a script tag causes the script
                // tag to not be executed when added to the DOM. We'll need to create a script
                // tag and append its contents which will make it execute correctly.
                // @see http://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
                } else if (node.nodeName === "SCRIPT") {
                    const script = document.createElement("script")
                    tag = script

                    node._replacedWith = script
                    node.parentNode.insertBefore(script, node)
                }

                // --------------------------------------------------
                // attribute substitution
                // --------------------------------------------------

                let attributes
                if (node.attributes) {
                    // if the attributes property is not of type NamedNodeMap then the DOM
                    // has been clobbered. E.g. <form><input name="attributes"></form>.
                    // We'll manually build up an array of objects that mimic the Attr
                    // object so the loop will still work as expected.
                    if (!(node.attributes instanceof NamedNodeMap)) {
                        // first clone the node so we can isolate it from any children
                        const temp = node.cloneNode()

                        // parse the node string for all attributes
                        const attributeMatches = temp.outerHTML.match(
                            ATTRIBUTE_PARSER_REGEX,
                        )

                        // get all attribute names and their value
                        attributes = []
                        for (const attribute of attributeMatches.length) {
                            const attributeName = attribute
                                .trim()
                                .split("=")[0]
                            const attributeValue = node.getAttribute(
                                attributeName,
                            )

                            attributes.push({
                                name: attributeName,
                                value: attributeValue,
                            })
                        }
                    } else {
                        // Windows 10 Firefox 44 will shift the attributes NamedNodeMap and
                        // push the attribute to the end when using setAttribute(). We'll have
                        // to clone the NamedNodeMap so the order isn't changed for setAttribute()
                        attributes = Array.from(node.attributes)
                    }

                    for (const attribute of attributes) {
                        let name = attribute.name
                        let value = attribute.value
                        let hasSubstitution = false

                        // name has substitution
                        if (name.indexOf(SUBSTITUTION_INDEX) !== -1) {
                            name = name.replace(
                                SUBSTITUTION_REGEX,
                                replaceSubstitution,
                            )

                            // ensure substitution was with a non-empty string
                            if (name && typeof name === "string") {
                                hasSubstitution = true
                            }

                            // remove old attribute
                            attributesToRemove.push(attribute.name)
                        }

                        // value has substitution - only check if name exists (only happens
                        // when name is a substitution with an empty value)
                        if (name && value.indexOf(SUBSTITUTION_INDEX) !== -1) {
                            hasSubstitution = true

                            // if an uri attribute has been rejected
                            let isRejected = false

                            value = value.replace(SUBSTITUTION_REGEX, function(
                                match,
                                index,
                                offset,
                            ) {
                                if (isRejected) {
                                    return ""
                                }

                                let substitutionValue =
                                    values[parseInt(index, 10)]

                                // contextual auto-escaping:
                                // if attribute is a DOM Level 0 event then we need to ensure it
                                // is quoted
                                if (
                                    DOM_EVENTS.indexOf(name) !== -1 &&
                                    typeof substitutionValue === "string" &&
                                    !WRAPPED_WITH_QUOTES_REGEX.test(
                                        substitutionValue,
                                    )
                                ) {
                                    substitutionValue =
                                        '"' + substitutionValue + '"'

                                // contextual auto-escaping:
                                // if the attribute is a uri attribute then we need to uri encode it and
                                // remove bad protocols
                                } else if (
                                    URI_ATTRIBUTES.indexOf(name) !== -1 ||
                                    CUSTOM_URI_ATTRIBUTES_REGEX.test(name)
                                ) {
                                    // percent encode if the value is inside of a query parameter
                                    const queryParamIndex = value.indexOf("=")
                                    if (
                                        queryParamIndex !== -1 &&
                                        offset > queryParamIndex
                                    ) {
                                        substitutionValue = encodeURIComponent(
                                            substitutionValue,
                                        )

                                    // entity encode if value is part of the URL
                                    } else {
                                        substitutionValue = encodeURI(
                                            encodeURIEntities(
                                                substitutionValue,
                                            ),
                                        )

                                        // only allow the : when used after http or https otherwise reject
                                        // the entire url (will not allow any 'javascript:' or filter
                                        // evasion techniques)
                                        if (
                                            offset === 0 &&
                                            substitutionValue.indexOf(":") !==
                                                -1
                                        ) {
                                            const authorized_protocols = [
                                                "http://",
                                                "https://",
                                                "moz-extension://",
                                                "about://",
                                                "data:image/png;base64",
                                                "data:image/gif;base64",
                                                "data:image/jpg;base64",
                                                "data:image/jpeg;base64",
                                                "data:image/x-icon;base64",
                                            ]
                                            // If substitutionValue doesn't start with any of the authorized protocols
                                            if (
                                                !authorized_protocols.find(p =>
                                                    substitutionValue.startsWith(
                                                        p,
                                                    ),
                                                )
                                            ) {
                                                isRejected = true
                                            }
                                        }
                                    }

                                // contextual auto-escaping:
                                // HTML encode attribute value if it is not a URL or URI to prevent
                                // DOM Level 0 event handlers from executing xss code
                                } else if (
                                    typeof substitutionValue === "string"
                                ) {
                                    substitutionValue = encodeAttributeHTMLEntities(
                                        substitutionValue,
                                    )
                                }

                                return substitutionValue
                            })

                            if (isRejected) {
                                value = "#" + REJECTION_STRING
                            }
                        }

                        // add the attribute to the new tag or replace it on the current node
                        // setAttribute() does not need to be escaped to prevent XSS since it does
                        // all of that for us
                        // @see https://www.mediawiki.org/wiki/DOM-based_XSS
                        if (tag || hasSubstitution) {
                            const el = tag || node

                            // optional attribute
                            if (name.substr(-1) === "?") {
                                el.removeAttribute(name)

                                if (value === "true") {
                                    name = name.slice(0, -1)
                                    el.setAttribute(name, "")
                                }
                            } else {
                                el.setAttribute(name, value)
                            }
                        }
                    }
                }

                // remove placeholder attributes outside of the attribute loop since it
                // will modify the attributes NamedNodeMap indices.
                // @see https://github.com/straker/html-tagged-template/issues/13
                attributesToRemove.forEach(function(attribute) {
                    node.removeAttribute(attribute)
                })

                // append the current node to a replaced parent
                let parentNode
                if (node.parentNode && node.parentNode._replacedWith) {
                    parentNode = node.parentNode
                    node.parentNode._replacedWith.appendChild(node)
                }

                // remove the old node from the DOM
                if (
                    (node._replacedWith && node.childNodes.length === 0) ||
                    (parentNode && parentNode.childNodes.length === 0)
                ) {
                    (parentNode || node).remove()
                }

                // --------------------------------------------------
                // text content substitution
                // --------------------------------------------------

                if (
                    node.nodeType === 3 &&
                    node.nodeValue.indexOf(SUBSTITUTION_INDEX) !== -1
                ) {
                    const nodeValue = node.nodeValue.replace(
                        SUBSTITUTION_REGEX,
                        replaceSubstitution,
                    )

                    // createTextNode() should not need to be escaped to prevent XSS?
                    const text = document.createTextNode(nodeValue)

                    // since the parent node has already gone through the iterator, we can use
                    // replaceChild() here
                    node.parentNode.replaceChild(text, node)
                }
            }

            // return the documentFragment for multiple nodes
            if (template.content.childNodes.length > 1) {
                return template.content
            }

            return template.content.firstChild
        }
    }
})(window)


/***/ }),

/***/ "./compiler/metadata/AllMetadata.ts":
/*!******************************************!*\
  !*** ./compiler/metadata/AllMetadata.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "SymbolMetadata": () => (/* reexport safe */ _SymbolMetadata__WEBPACK_IMPORTED_MODULE_0__.SymbolMetadata),
/* harmony export */   "ClassMetadata": () => (/* reexport safe */ _ClassMetadata__WEBPACK_IMPORTED_MODULE_1__.ClassMetadata),
/* harmony export */   "FileMetadata": () => (/* reexport safe */ _FileMetadata__WEBPACK_IMPORTED_MODULE_2__.FileMetadata),
/* harmony export */   "ProgramMetadata": () => (/* reexport safe */ _ProgramMetadata__WEBPACK_IMPORTED_MODULE_3__.ProgramMetadata)
/* harmony export */ });
/* harmony import */ var _SymbolMetadata__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./SymbolMetadata */ "./compiler/metadata/SymbolMetadata.ts");
/* harmony import */ var _ClassMetadata__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ClassMetadata */ "./compiler/metadata/ClassMetadata.ts");
/* harmony import */ var _FileMetadata__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./FileMetadata */ "./compiler/metadata/FileMetadata.ts");
/* harmony import */ var _ProgramMetadata__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./ProgramMetadata */ "./compiler/metadata/ProgramMetadata.ts");






/***/ }),

/***/ "./compiler/metadata/ClassMetadata.ts":
/*!********************************************!*\
  !*** ./compiler/metadata/ClassMetadata.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ClassMetadata": () => (/* binding */ ClassMetadata)
/* harmony export */ });
class ClassMetadata {
    constructor(members = new Map()) {
        this.members = members;
    }
    setMember(name, s) {
        this.members.set(name, s);
    }
    getMember(name) {
        return this.members.get(name);
    }
    getMembers() {
        return this.members.keys();
    }
    toConstructor() {
        return (`new ClassMetadata(new Map<string, SymbolMetadata>([` +
            Array.from(this.members.entries())
                .map(([n, m]) => `[${JSON.stringify(n)}, ${m.toConstructor()}]`)
                .join(",\n") +
            `]))`);
    }
}


/***/ }),

/***/ "./compiler/metadata/FileMetadata.ts":
/*!*******************************************!*\
  !*** ./compiler/metadata/FileMetadata.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "FileMetadata": () => (/* binding */ FileMetadata)
/* harmony export */ });
class FileMetadata {
    constructor(classes = new Map(), functions = new Map()) {
        this.classes = classes;
        this.functions = functions;
    }
    setClass(name, c) {
        this.classes.set(name, c);
    }
    getClass(name) {
        return this.classes.get(name);
    }
    getClasses() {
        return Array.from(this.classes.keys());
    }
    setFunction(name, f) {
        this.functions.set(name, f);
    }
    getFunction(name) {
        return this.functions.get(name);
    }
    getFunctions() {
        return Array.from(this.functions.entries());
    }
    getFunctionNames() {
        return Array.from(this.functions.keys());
    }
    toConstructor() {
        return (`new FileMetadata(new Map<string, ClassMetadata>([` +
            Array.from(this.classes.entries())
                .map(([n, c]) => `[${JSON.stringify(n)}, ${c.toConstructor()}]`)
                .join(",\n") +
            `]), new Map<string, SymbolMetadata>([` +
            Array.from(this.functions.entries())
                .map(([n, f]) => `[${JSON.stringify(n)}, ${f.toConstructor()}]`)
                .join(",\n") +
            `]))`);
    }
}


/***/ }),

/***/ "./compiler/metadata/ProgramMetadata.ts":
/*!**********************************************!*\
  !*** ./compiler/metadata/ProgramMetadata.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ProgramMetadata": () => (/* binding */ ProgramMetadata)
/* harmony export */ });
class ProgramMetadata {
    constructor(files = new Map()) {
        this.files = files;
    }
    setFile(name, file) {
        this.files.set(name, file);
    }
    getFile(name) {
        return this.files.get(name);
    }
    toConstructor() {
        return (`new ProgramMetadata(new Map<string, FileMetadata>([` +
            Array.from(this.files.entries())
                .map(([n, f]) => `[${JSON.stringify(n)}, ${f.toConstructor()}]`)
                .join(",\n") +
            `]))`);
    }
}


/***/ }),

/***/ "./compiler/metadata/SymbolMetadata.ts":
/*!*********************************************!*\
  !*** ./compiler/metadata/SymbolMetadata.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "SymbolMetadata": () => (/* binding */ SymbolMetadata)
/* harmony export */ });
class SymbolMetadata {
    constructor(doc, type, hidden = false) {
        this.doc = doc;
        this.type = type;
        this.hidden = hidden;
    }
    toConstructor() {
        return `new SymbolMetadata(${JSON.stringify(this.doc)}, ${this.type.toConstructor()}, ${this.hidden})`;
    }
}


/***/ }),

/***/ "./compiler/types/AllTypes.ts":
/*!************************************!*\
  !*** ./compiler/types/AllTypes.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AnyType": () => (/* reexport safe */ _AnyType__WEBPACK_IMPORTED_MODULE_0__.AnyType),
/* harmony export */   "BooleanType": () => (/* reexport safe */ _BooleanType__WEBPACK_IMPORTED_MODULE_1__.BooleanType),
/* harmony export */   "FunctionType": () => (/* reexport safe */ _FunctionType__WEBPACK_IMPORTED_MODULE_2__.FunctionType),
/* harmony export */   "NumberType": () => (/* reexport safe */ _NumberType__WEBPACK_IMPORTED_MODULE_3__.NumberType),
/* harmony export */   "ObjectType": () => (/* reexport safe */ _ObjectType__WEBPACK_IMPORTED_MODULE_4__.ObjectType),
/* harmony export */   "StringType": () => (/* reexport safe */ _StringType__WEBPACK_IMPORTED_MODULE_5__.StringType),
/* harmony export */   "TypeReferenceType": () => (/* reexport safe */ _TypeReferenceType__WEBPACK_IMPORTED_MODULE_6__.TypeReferenceType),
/* harmony export */   "VoidType": () => (/* reexport safe */ _VoidType__WEBPACK_IMPORTED_MODULE_7__.VoidType),
/* harmony export */   "ArrayType": () => (/* reexport safe */ _ArrayType__WEBPACK_IMPORTED_MODULE_8__.ArrayType),
/* harmony export */   "LiteralTypeType": () => (/* reexport safe */ _LiteralTypeType__WEBPACK_IMPORTED_MODULE_9__.LiteralTypeType),
/* harmony export */   "TupleType": () => (/* reexport safe */ _TupleType__WEBPACK_IMPORTED_MODULE_10__.TupleType),
/* harmony export */   "UnionType": () => (/* reexport safe */ _UnionType__WEBPACK_IMPORTED_MODULE_11__.UnionType)
/* harmony export */ });
/* harmony import */ var _AnyType__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AnyType */ "./compiler/types/AnyType.ts");
/* harmony import */ var _BooleanType__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./BooleanType */ "./compiler/types/BooleanType.ts");
/* harmony import */ var _FunctionType__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./FunctionType */ "./compiler/types/FunctionType.ts");
/* harmony import */ var _NumberType__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./NumberType */ "./compiler/types/NumberType.ts");
/* harmony import */ var _ObjectType__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ObjectType */ "./compiler/types/ObjectType.ts");
/* harmony import */ var _StringType__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./StringType */ "./compiler/types/StringType.ts");
/* harmony import */ var _TypeReferenceType__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./TypeReferenceType */ "./compiler/types/TypeReferenceType.ts");
/* harmony import */ var _VoidType__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./VoidType */ "./compiler/types/VoidType.ts");
/* harmony import */ var _ArrayType__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./ArrayType */ "./compiler/types/ArrayType.ts");
/* harmony import */ var _LiteralTypeType__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./LiteralTypeType */ "./compiler/types/LiteralTypeType.ts");
/* harmony import */ var _TupleType__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./TupleType */ "./compiler/types/TupleType.ts");
/* harmony import */ var _UnionType__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./UnionType */ "./compiler/types/UnionType.ts");














/***/ }),

/***/ "./compiler/types/AnyType.ts":
/*!***********************************!*\
  !*** ./compiler/types/AnyType.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AnyType": () => (/* binding */ AnyType)
/* harmony export */ });
class AnyType {
    constructor(isDotDotDot = false, isQuestion = false) {
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "any";
    }
    toConstructor() {
        return `new AnyType(${!this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return this.kind;
    }
    convert(argument) {
        return argument;
    }
}


/***/ }),

/***/ "./compiler/types/ArrayType.ts":
/*!*************************************!*\
  !*** ./compiler/types/ArrayType.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ArrayType": () => (/* binding */ ArrayType)
/* harmony export */ });
class ArrayType {
    constructor(elemType, isDotDotDot = false, isQuestion = false) {
        this.elemType = elemType;
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "array";
    }
    toConstructor() {
        return `new ArrayType(${this.elemType.toConstructor()}, ${this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return `${this.elemType.toString()}[]`;
    }
    convert(argument) {
        if (!Array.isArray(argument)) {
            try {
                argument = JSON.parse(argument);
            }
            catch (e) {
                throw new Error(`Can't convert ${argument} to array:`);
            }
            if (!Array.isArray(argument)) {
                throw new Error(`Can't convert ${argument} to array:`);
            }
        }
        return argument.map(v => this.elemType.convert(v));
    }
}


/***/ }),

/***/ "./compiler/types/BooleanType.ts":
/*!***************************************!*\
  !*** ./compiler/types/BooleanType.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BooleanType": () => (/* binding */ BooleanType)
/* harmony export */ });
class BooleanType {
    constructor(isDotDotDot = false, isQuestion = false) {
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "boolean";
    }
    toConstructor() {
        return `new BooleanType(${this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return this.kind;
    }
    convert(argument) {
        if (argument === "true") {
            return true;
        }
        else if (argument === "false") {
            return false;
        }
        throw new Error("Can't convert ${argument} to boolean");
    }
}


/***/ }),

/***/ "./compiler/types/FunctionType.ts":
/*!****************************************!*\
  !*** ./compiler/types/FunctionType.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "FunctionType": () => (/* binding */ FunctionType)
/* harmony export */ });
class FunctionType {
    constructor(args, ret, isDotDotDot = false, isQuestion = false) {
        this.args = args;
        this.ret = ret;
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "function";
    }
    toConstructor() {
        return (`new FunctionType([` +
            // Convert every argument type to its string constructor representation
            this.args.map(cur => cur.toConstructor()) +
            `], ${this.ret.toConstructor()}, ${this.isDotDotDot}, ${this.isQuestion})`);
    }
    toString() {
        return `(${this.args.map(a => a.toString()).join(", ")}) => ${this.ret.toString()}`;
    }
    convert(argument) {
        // Possible strategies:
        // - eval()
        // - window[argument]
        // - tri.excmds[argument]
        throw new Error(`Conversion to function not implemented: ${argument}`);
    }
}


/***/ }),

/***/ "./compiler/types/LiteralTypeType.ts":
/*!*******************************************!*\
  !*** ./compiler/types/LiteralTypeType.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LiteralTypeType": () => (/* binding */ LiteralTypeType)
/* harmony export */ });
class LiteralTypeType {
    constructor(value, isDotDotDot = false, isQuestion = false) {
        this.value = value;
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "LiteralType";
    }
    toConstructor() {
        return `new LiteralTypeType(${JSON.stringify(this.value)}, ${this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return JSON.stringify(this.value);
    }
    convert(argument) {
        if (argument === this.value) {
            return argument;
        }
        throw new Error(`Argument does not match expected value (${this.value}): ${argument}`);
    }
}


/***/ }),

/***/ "./compiler/types/NumberType.ts":
/*!**************************************!*\
  !*** ./compiler/types/NumberType.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NumberType": () => (/* binding */ NumberType)
/* harmony export */ });
class NumberType {
    constructor(isDotDotDot = false, isQuestion = false) {
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "number";
    }
    toConstructor() {
        return `new NumberType(${this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return this.kind;
    }
    convert(argument) {
        const n = parseFloat(argument);
        if (!Number.isNaN(n)) {
            return n;
        }
        throw new Error(`Can't convert to number: ${argument}`);
    }
}


/***/ }),

/***/ "./compiler/types/ObjectType.ts":
/*!**************************************!*\
  !*** ./compiler/types/ObjectType.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ObjectType": () => (/* binding */ ObjectType)
/* harmony export */ });
class ObjectType {
    // Note: a map that has an empty key ("") uses the corresponding type as default type
    constructor(members = new Map(), isDotDotDot = false, isQuestion = false) {
        this.members = members;
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "object";
    }
    toConstructor() {
        return `new ObjectType(new Map<string, Type>([` +
            Array.from(this.members.entries()).map(([n, m]) => `[${JSON.stringify(n)}, ${m.toConstructor()}]`)
                .join(", ") +
            `]), ${this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return this.kind;
    }
    convertMember(memberName, memberValue) {
        let type = this.members.get(memberName[0]);
        if (!type) {
            // No type, try to get the default type
            type = this.members.get("");
            if (!type) {
                // No info for this member and no default type, anything goes
                return memberValue;
            }
        }
        if (type.kind === "object") {
            return type.convertMember(memberName.slice(1), memberValue);
        }
        return type.convert(memberValue);
    }
    convert(argument) {
        try {
            return JSON.parse(argument);
        }
        catch (e) {
            throw new Error(`Can't convert to object: ${argument}`);
        }
    }
}


/***/ }),

/***/ "./compiler/types/StringType.ts":
/*!**************************************!*\
  !*** ./compiler/types/StringType.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "StringType": () => (/* binding */ StringType)
/* harmony export */ });
class StringType {
    constructor(isDotDotDot = false, isQuestion = false) {
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "string";
    }
    toConstructor() {
        return `new StringType(${this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return this.kind;
    }
    convert(argument) {
        if (typeof argument === "string") {
            return argument;
        }
        throw new Error(`Can't convert to string: ${argument}`);
    }
}


/***/ }),

/***/ "./compiler/types/TupleType.ts":
/*!*************************************!*\
  !*** ./compiler/types/TupleType.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TupleType": () => (/* binding */ TupleType)
/* harmony export */ });
class TupleType {
    constructor(elemTypes, isDotDotDot = false, isQuestion = false) {
        this.elemTypes = elemTypes;
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "tuple";
    }
    toConstructor() {
        return (`new TupleType([` +
            // Convert every element type to its constructor representation
            this.elemTypes.map(cur => cur.toConstructor()).join(",\n") +
            `], ${this.isDotDotDot}, ${this.isQuestion})`);
    }
    toString() {
        return `[${this.elemTypes.map(e => e.toString()).join(", ")}]`;
    }
    convert(argument) {
        if (!Array.isArray(argument)) {
            try {
                argument = JSON.parse(argument);
            }
            catch (e) {
                throw new Error(`Can't convert to tuple: ${argument}`);
            }
            if (!Array.isArray(argument)) {
                throw new Error(`Can't convert to tuple: ${argument}`);
            }
        }
        if (argument.length !== this.elemTypes.length) {
            throw new Error(`Error converting tuple: number of elements and type mismatch ${argument}`);
        }
        return argument.map((v, i) => this.elemTypes[i].convert(v));
    }
}


/***/ }),

/***/ "./compiler/types/TypeReferenceType.ts":
/*!*********************************************!*\
  !*** ./compiler/types/TypeReferenceType.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TypeReferenceType": () => (/* binding */ TypeReferenceType)
/* harmony export */ });
class TypeReferenceType {
    constructor(kind, args, isDotDotDot = false, isQuestion = false) {
        this.kind = kind;
        this.args = args;
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
    }
    toConstructor() {
        return (`new TypeReferenceType(${JSON.stringify(this.kind)}, [` +
            // Turn every type argument into its constructor representation
            this.args.map(cur => cur.toConstructor()).join(",\n") +
            `], ${this.isDotDotDot}, ${this.isQuestion})`);
    }
    toString() {
        return `${this.kind}<${this.args.map(a => a.toString()).join(", ")}>`;
    }
    convert(argument) {
        throw new Error("Conversion of simple type references not implemented.");
    }
}


/***/ }),

/***/ "./compiler/types/UnionType.ts":
/*!*************************************!*\
  !*** ./compiler/types/UnionType.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "UnionType": () => (/* binding */ UnionType)
/* harmony export */ });
class UnionType {
    constructor(types, isDotDotDot = false, isQuestion = false) {
        this.types = types;
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "union";
    }
    toConstructor() {
        return (`new UnionType([` +
            // Convert every type to its string constructor representation
            this.types.map(cur => cur.toConstructor()).join(",\n") +
            `], ${this.isDotDotDot}, ${this.isQuestion})`);
    }
    toString() {
        return this.types.map(t => t.toString()).join(" | ");
    }
    convert(argument) {
        for (const t of this.types) {
            try {
                return t.convert(argument);
            }
            catch (e) { }
        }
        throw new Error(`Can't convert "${argument}" to any of: ${this.types}`);
    }
}


/***/ }),

/***/ "./compiler/types/VoidType.ts":
/*!************************************!*\
  !*** ./compiler/types/VoidType.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "VoidType": () => (/* binding */ VoidType)
/* harmony export */ });
class VoidType {
    constructor(isDotDotDot = false, isQuestion = false) {
        this.isDotDotDot = isDotDotDot;
        this.isQuestion = isQuestion;
        this.kind = "void";
    }
    toConstructor() {
        return `new VoidType(${this.isDotDotDot}, ${this.isQuestion})`;
    }
    toString() {
        return this.kind;
    }
    convert(argument) {
        return null;
    }
}


/***/ }),

/***/ "./src/.metadata.generated.ts":
/*!************************************!*\
  !*** ./src/.metadata.generated.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "everything": () => (/* binding */ everything),
/* harmony export */   "staticThemes": () => (/* binding */ staticThemes)
/* harmony export */ });
/* harmony import */ var _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../compiler/types/AllTypes */ "./compiler/types/AllTypes.ts");
/* harmony import */ var _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../compiler/metadata/AllMetadata */ "./compiler/metadata/AllMetadata.ts");


let everything = new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.ProgramMetadata(new Map([["src/excmds.ts", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.FileMetadata(new Map([]), new Map([["getNativeVersion", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], false, false), false, false), true)], ["getRssLinks", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false, false)], false, false), false, false), true)], ["rssexec", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Execute [[rsscmd]] for an rss link.\n\nIf `url` is undefined, Tridactyl will look for rss links in the current\npage. If it doesn't find any, it will display an error message. If it finds\nmultiple urls, it will offer completions in order for you to select the link\nyou're interested in. If a single rss feed is found, it will automatically\nbe selected.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["fillinput", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Fills the element matched by `selector` with content and falls back to the last used input if the element can't be found. You probably don't want this; it's used internally for [[editor]].\n\nThat said, `bind gs fillinput null [Tridactyl](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/) is my favourite add-on` could probably come in handy.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["getInput", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("HTMLElement", [], false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), true)],
            ["getinput", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), true)],
            ["getInputSelector", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), true)],
            ["addTridactylEditorClass", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Element", [], false, false), false, false), true)],
            ["removeTridactylEditorClass", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["editor", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Opens your favourite editor (which is currently gVim) and fills the last used input with whatever you write into that file.\n**Requires that the native messenger is installed, see [[native]] and [[nativeinstall]]**.\n\nUses the `editorcmd` config option, default = `auto` looks through a list defined in lib/native.ts try find a sensible combination. If it's a bit slow, or chooses the wrong editor, or gives up completely, set editorcmd to something you want. The command must stay in the foreground until the editor exits.\n\nThe editorcmd needs to accept a filename, stay in the foreground while it's edited, save the file and exit. By default the filename is added to the end of editorcmd, if you require control over the position of that argument, the first occurrence of %f in editorcmd is replaced with the filename. %l, if it exists, is replaced with the line number of the cursor and %c with the column number. For example:\n```\nset editorcmd terminator -u -e \"vim %f '+normal!%lGzv%c|'\"\n```\n\nYou're probably better off using the default insert mode bind of `<C-i>` (Ctrl-i) to access this.\n\nThis function returns a tuple containing the path to the file that was opened by the editor and its content. This enables creating commands such as the following one, which deletes the temporary file created by the editor:\n```\nalias editor_rm composite editor | jsb -p tri.native.run(`rm -f '${JS_ARG[0]}'`)\nbind --mode=insert <C-i> editor_rm\nbind --mode=input <C-i> editor_rm\n```", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false)], false, false)], false, false), false, false), false)],
            ["guiset_quiet", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[guiset]] but quieter.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["guiset", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Change which parts of the Firefox user interface are shown. **NB: This feature is experimental and might break stuff.**\n\nMight mangle your userChrome. Requires native messenger, and you must restart Firefox each time to see any changes (this can be done using [[restart]]). <!-- (unless you enable addon debugging and refresh using the browser toolbox) -->\n\nAlso flips the preference `toolkit.legacyUserProfileCustomizations.stylesheets` to true so that FF will read your userChrome.\n\nView available rules and options [here](/static/docs/modules/_src_lib_css_util_.html#potentialrules) and [here](/static/docs/modules/_src_lib_css_util_.html#metarules).\n\nExample usage: `guiset gui none`, `guiset gui full`, `guiset tabs autohide`.\n\nSome of the available options:\n\n- gui\n      - full\n      - none\n\n- tabs\n      - always\n      - autohide\n\n- navbar\n      - always\n      - autohide\n      - none\n\n- hoverlink (the little link that appears when you hover over a link)\n      - none\n      - left\n      - right\n      - top-left\n      - top-right\n\n- statuspanel (hoverlink + the indicator that appears when a website is loading)\n      - none\n      - left\n      - right\n      - top-left\n      - top-right\n\nIf you want to use guiset in your tridactylrc, you might want to use [[guiset_quiet]] instead.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["cssparse", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["loadtheme", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), true)],
            ["unloadtheme", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), true)],
            ["colourscheme", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Changes the current theme.\n\nIf THEMENAME is any of the themes that can be found in the [Tridactyl repo](https://github.com/tridactyl/tridactyl/tree/master/src/static/themes) (e.g. 'dark'), the theme will be loaded from Tridactyl's internal storage.\n\nIf THEMENAME is set to any other value except `--url`, Tridactyl will attempt to use its native binary (see [[native]]) in order to load a CSS file named THEMENAME from disk. The CSS file has to be in a directory named \"themes\" and this directory has to be in the same directory as your tridactylrc. If this fails, Tridactyl will attempt to load the theme from its internal storage.\n\nLastly, themes can be loaded from URLs with `:colourscheme --url [url] [themename]`. They are stored internally - if you want to update the theme run the whole command again.\n\nNote that the theme name should NOT contain any dot.\n\nExample: `:colourscheme mysupertheme`\nOn linux, this will load ~/.config/tridactyl/themes/mysupertheme.css\n\n__NB__: due to Tridactyl's architecture, the theme will take a small amount of time to apply as each page is loaded. If this annoys you, you may use [userContent.css](http://kb.mozillazine.org/index.php?title=UserContent.css&printable=yes) to make changes to Tridactyl earlier. For example, users using the dark theme may like to put\n\n```\n:root {\n     --tridactyl-bg: black !important;\n     --tridactyl-fg: white !important;\n}\n```\n\nin their `userContent.css`. Follow [issue #2510](https://github.com/tridactyl/tridactyl/issues/2510) if you would like to find out when we have made a more user-friendly solution.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["setpref", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Write a setting to your user.js file. Requires a [[restart]] after running to take effect.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["removepref", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Remove a setting from your user.js file.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["fixamo_quiet", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[fixamo]] but quieter.\n\nNow purely a placebo as [[fixamo]] has been removed.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["fixamo", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Used to simply set\n```js\n  \"privacy.resistFingerprinting.block_mozAddonManager\":true\n  \"extensions.webextensions.restrictedDomains\":\"\"\n```\nin about:config via user.js so that Tridactyl (and other extensions!) can be used on addons.mozilla.org and other sites.\n\nRemoved at the request of the Firefox Security team. Replacements exist in our exemplar RC file.\n\nRequires `native` and a `restart`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["nativeopen", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Uses the native messenger to open URLs.\n\n**Be *seriously* careful with this:**\n\n1. the implementation basically execs `firefox --new-tab <your shell escaped string here>`\n2. you can use it to open any URL you can open in the Firefox address bar,\n    including ones that might cause side effects (firefox does not guarantee\n    that about: pages ignore query strings).\n\nYou've been warned.\n\nThis uses the [[browser]] setting to know which binary to call. If you need to pass additional arguments to firefox (e.g. '--new-window'), make sure they appear before the url.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["exclaim", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Run command in /bin/sh (unless you're on Windows), and print the output in the command line. Non-zero exit codes and stderr are ignored, currently.\n\nRequires the native messenger, obviously.\n\nIf you want to use a different shell, just prepend your command with whatever the invocation is and keep in mind that most shells require quotes around the command to be executed, e.g. `:exclaim xonsh -c \"1+2\"`.\n\nAliased to `!` but the exclamation mark **must be followed with a space**.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["exclaim_quiet", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like exclaim, but without any output to the command line.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], false, false), false, false), false)],
            ["native", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Tells you if the native messenger is installed and its version.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["nativeinstall", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Copies the installation command for the native messenger to the clipboard and asks the user to run it in their shell.\n\nThe native messenger's source code may be found here: https://github.com/tridactyl/native_messenger/blob/master/src/native_main.nim\n\nIf your corporate IT policy disallows execution of binaries which have not been whitelisted but allows Python scripts, you may instead use the old native messenger by running `install.sh` or `win_install.ps1` from https://github.com/tridactyl/tridactyl/tree/master/native - the main downside is that it is significantly slower.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["mktridactylrc", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Writes current config to a file.\n\nNB: an RC file is not required for your settings to persist: all settings are stored in a local Firefox storage database by default as soon as you set them.\n\nWith no arguments supplied the excmd will try to find an appropriate\nconfig path and write the rc file to there. Any argument given to the\nexcmd excluding the `-f` flag will be treated as a path to write the rc\nfile to relative to the native messenger's location (`~/.local/share/tridactyl/`). By default, it silently refuses to overwrite existing files.\n\nThe RC file will be split into sections that will be created if a config\nproperty is discovered within one of them:\n- General settings\n- Binds\n- Aliases\n- Autocmds\n- Autocontainers\n- Logging\n\nNote:\n- Subconfig paths fall back to using `js tri.config.set(key: obj)` notation.\n- This method is also used as a fallback mechanism for objects that didn't hit\n  any of the heuristics.\n\nAvailable flags:\n- `-f` will overwrite the config file if it exists.\n- `--clipboard` write config to clipboard - no [[native]] required", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["source", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Runs an RC file from disk or a URL\n\nThis function accepts a flag: `--url` to load a RC from a URL.\n\nIf no argument given, it will try to open ~/.tridactylrc, ~/.config/tridactyl/tridactylrc or $XDG_CONFIG_HOME/tridactyl/tridactylrc in reverse order. You may use a `_` in place of a leading `.` if you wish, e.g, if you use Windows.\n\nIf no url is specified with the `--url` flag, the current page's URL is used to locate the RC file. Ensure the URL you pass (or page you are on) is a \"raw\" RC file, e.g. https://raw.githubusercontent.com/tridactyl/tridactyl/master/.tridactylrc and not https://github.com/tridactyl/tridactyl/blob/master/.tridactylrc.\n\nTridactyl won't run on many raw pages due to a Firefox bug with Content Security Policy, so you may need to use the `source --url [URL]` form.\n\nOn Windows, the `~` expands to `%USERPROFILE%`.\n\nThe RC file is just a bunch of Tridactyl excmds (i.e, the stuff on this help page). Settings persist in local storage. There's an [example file](https://raw.githubusercontent.com/tridactyl/tridactyl/master/.tridactylrc) if you want it.\n\nThere is a [bug](https://github.com/tridactyl/tridactyl/issues/1409) where not all lines of the RC file are executed if you use `sanitise` at the top of it. We instead recommend you put `:bind ZZ composite sanitise tridactyllocal; qall` in your RC file and use `ZZ` to exit Firefox.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["source_quiet", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Same as [[source]] but suppresses all errors", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["updatenative", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Updates the native messenger if it is installed, using our GitHub repo. This is run every time Tridactyl is updated.\n\nIf you want to disable this, or point it to your own native messenger, edit the `nativeinstallcmd` setting.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["restart", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Restarts firefox with the same commandline arguments.\n\nWarning: This can kill your tabs, especially if you :restart several times\nin a row", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["saveas", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Download the current document.\n\nIf you have the native messenger v>=0.1.9 installed, the function accepts an optional argument, filename, which can be:\n- An absolute path\n- A path starting with ~, which will be expanded to your home directory\n- A relative path, relative to the native messenger executable (e.g. ~/.local/share/tridactyl on linux).\nIf filename is not given, a download dialogue will be opened. If filename is a directory, the file will be saved inside of it, its name being inferred from the URL. If the directories mentioned in the path do not exist or if a file already exists at this path, the file will be kept in your downloads folder and an error message will be given.\n\n**NB**: if a non-default save location is chosen, Firefox's download manager will say the file is missing. It is not - it is where you asked it to be saved.\n\nFlags:\n- `--overwrite`: overwrite the destination file.\n- `--cleanup`: removes the downloaded source file e.g. `$HOME/Downlods/downloaded.doc` if moving it to the desired directory fails.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["tabSetActive", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), true)],
            ["getJumpPageId", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("This is used as an ID for the current page in the jumplist.\nIt has a potentially confusing behavior: if you visit site A, then site B, then visit site A again, the jumplist that was created for your first visit on A will be re-used for your second visit.\nAn ideal solution would be to have a counter that is incremented every time a new page is visited within the tab and use that as the return value for getJumpPageId but this doesn't seem to be trivial to implement.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), true)],
            ["saveJumps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), true)],
            ["curJumps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Returns a promise for an object containing the jumplist of all pages accessed in the current tab.\nThe keys of the object currently are the page's URL, however this might change some day. Use [[getJumpPageId]] to access the jumplist of a specific page.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), true)],
            ["jumpnext", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Calls [[jumpprev]](-n)", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["jumpprev", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Similar to Pentadactyl or vim's jump list.\n\nWhen you scroll on a page, either by using the mouse or Tridactyl's key bindings, your position in the page will be saved after jumpdelay milliseconds (`:get jumpdelay` to know how many milliseconds that is). If you scroll again, you'll be able to go back to your previous position by using `:jumpprev 1`. If you need to go forward in the jumplist, use `:jumpprev -1`.\n\nKnown bug: Tridactyl will use the same jumplist for multiple visits to a same website in the same tab, see [github issue 834](https://github.com/tridactyl/tridactyl/issues/834).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["addJump", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Called on 'scroll' events.\nIf you want to have a function that moves within the page but doesn't add a\nlocation to the jumplist, make sure to set JUMPED to true before moving\naround.\nThe setTimeout call is required because sometimes a user wants to move\nsomewhere by pressing 'j' multiple times and we don't want to add the\nin-between locations to the jump list", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["unfocus", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Blur (unfocus) the active element", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["scrollpx", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Scrolls the window or any scrollable child element by a pixels on the horizontal axis and b pixels on the vertical axis.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["scrollto", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("If two numbers are given, treat as x and y values to give to window.scrollTo\nIf one number is given, scroll to that percentage along a chosen axis, defaulting to the y-axis. If the number has 'c' appended to it, it will be interpreted in radians.\n\nNote that if `a` is 0 or 100 and if the document is not scrollable in the given direction, Tridactyl will attempt to scroll the first scrollable element until it reaches the very bottom of that element.\n\nExamples:\n\n- `scrollto 50` -> scroll halfway down the page.\n- `scrollto 3.14c` -> scroll approximately 49.97465213% of the way down the page.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("x", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("y", false, false)], false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["scrollline", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Scrolls the document of its first scrollable child element by n lines.\n\nThe height of a line is defined by the site's CSS. If Tridactyl can't get it, it'll default to 22 pixels.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["scrollpage", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Scrolls the document by n pages.\nThe height of a page is the current height of the window.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["find", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Rudimentary find mode, left unbound by default as we don't currently support `incsearch`. Suggested binds:\n\n     bind / fillcmdline find\n     bind ? fillcmdline find -?\n     bind n findnext 1\n     bind N findnext -1\n     bind ,<Space> nohlsearch\n\nArgument: A string you want to search for.\n\nThis function accepts two flags: `-?` to search from the bottom rather than the top and `-: n` to jump directly to the nth match.\n\nThe behavior of this function is affected by the following setting:\n\n`findcase`: either \"smart\", \"sensitive\" or \"insensitive\". If \"smart\", find will be case-sensitive if the pattern contains uppercase letters.\n\nKnown bugs: find will currently happily jump to a non-visible element, and pressing n or N without having searched for anything will cause an error.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["findnext", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Jump to the next searched pattern.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["clearsearchhighlight", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["history", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["forward", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Navigate forward one page in history.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["back", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Navigate back one page in history.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["reload", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Reload the next n tabs, starting with activeTab, possibly bypassingCache", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], false, false), false, false), false)],
            ["reloadall", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Reloads all tabs, bypassing the cache if hard is set to true", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], false, false), false, false), false)],
            ["reloadallbut", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Reloads all tabs except the current one, bypassing the cache if hard is set to true\nYou probably want to use [[reloaddead]] instead if you just want to be able to ensure Tridactyl is loaded in all tabs where it can be", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], false, false), false, false), false)],
            ["reloaddead", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Reloads all tabs which Tridactyl isn't loaded in", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TupleType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false)], false, false), false, false), false)],
            ["reloadhard", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Reload the next n tabs, starting with activeTab. bypass cache for all", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], false, false), false, false), false)],
            ["open", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Open a new page in the current tab.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["bmarks", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Works exactly like [[open]], but only suggests bookmarks.\n\nIf you want to use optional flags, you should run `:set completions.Bmark.autoselect false` to prevent the spacebar from inserting the URL of the top bookmark.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["open_quiet", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[open]] but doesn't make a new entry in history.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["url2args", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("If the url of the current document matches one of your search engines, will convert it to a list of arguments that open/tabopen will understand. If the url doesn't match any search engine, returns the url without modifications.\n\nFor example, if you have searchurls.gi set to \"https://www.google.com/search?q=%s&tbm=isch\", using this function on a page you opened using \"gi butterflies\" will return \"gi butterflies\".\n\nThis is useful when combined with fillcmdline, for example like this: `bind O composite url2args | fillcmdline open`.\n\nNote that this might break with search engines that redirect you to other pages/add GET parameters that do not exist in your searchurl.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], false, false), false, false), false)],
            ["removeSource", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["viewsource", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Display the (HTML) source of the current page.\n\nBehaviour can be changed by the 'viewsource' setting.\n\nIf the 'viewsource' setting is set to 'default' rather than 'tridactyl',\nthe url the source of which should be displayed can be given as argument.\nOtherwise, the source of the current document will be displayed.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["home", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Go to the homepages you have set with `set homepages [\"url1\", \"url2\"]`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["help", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Show this page.\n\n`:help something` jumps to the entry for something. Something can be an excmd, an alias for an excmd, a binding or a setting.\n\nOn the ex command page, the \"nmaps\" list is a list of all the bindings for the command you're seeing and the \"exaliases\" list lists all its aliases.\n\nIf there's a conflict (e.g. you have a \"go\" binding that does something, a \"go\" excmd that does something else and a \"go\" setting that does a third thing), the binding is chosen first, then the setting, then the excmd. In such situations, if you want to let Tridactyl know you're looking for something specfic, you can specify the following flags as first arguments:\n\n`-a`: look for an alias\n`-b`: look for a binding\n`-e`: look for an ex command\n`-s`: look for a setting\n\nIf the keyword you gave to `:help` is actually an alias for a composite command (see [[composite]]) , you will be taken to the help section for the first command of the pipeline. You will be able to see the whole pipeline by hovering your mouse over the alias in the \"exaliases\" list. Unfortunately there currently is no way to display these HTML tooltips from the keyboard.\n\ne.g. `:help bind`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["apropos", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Search through the help pages. Accepts the same flags as [[help]]. Only useful in interactive usage with completions; the command itself is just a wrapper for [[help]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["tutor", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Start the tutorial", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["credits", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Display Tridactyl's contributors in order of commits in a user-friendly fashion", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["no_mouse_mode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Cover the current page in an overlay to prevent clicking on links with the mouse to force yourself to use hint mode. Get rid of it by reloading the page.\n\nTo bring back mouse control, use [[mouse_mode]] or refresh the page.\n\nSuggested usage: `autocmd DocLoad .* no_mouse_mode`\n\n\"There is no mouse\".", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["neo_mouse_mode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Matrix variant of [[no_mouse_mode]]\n\n\"There is no mouse\".\n\nCoincidentally added to Tridactyl at the same time as we reached 1337 stars on GitHub.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["snow_mouse_mode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Christmas variant of [[no_mouse_mode]] (if you live in $DEFAULT hemisphere).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["pied_piper_mouse_mode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Music variant of [[no_mouse_mode]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["mouse_mode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Revert any variant of the [[no_mouse_mode]]\n\nSuggested usage: `bind <C-\\> mouse_mode` with the autocmd mentioned in [[no_mouse_mode]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["findRelLink", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("RegExp", [], false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("HTMLAnchorElement", [], false, false), false, false), true)],
            ["selectLast", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("HTMLElement", [], false, false), false, false), true)],
            ["followpage", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Find a likely next/previous link and follow it\n\nIf a link or anchor element with rel=rel exists, use that, otherwise fall back to:\n\n    1) find the last anchor on the page with innerText matching the appropriate `followpagepattern`.\n    2) call [[urlincrement]] with 1 or -1\n\nIf you want to support e.g. French:\n\n```\nset followpagepatterns.next ^(next|newer|prochain)\\b|»|>>\nset followpagepatterns.prev ^(prev(ious)?|older|précédent)\\b|«|<<\n```", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("next", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("prev", false, false)], false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["urlincrement", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Increment the current tab URL", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["urlroot", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Go to the root domain of the current URL", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["urlparent", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Go to the parent URL of the current tab's URL", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["urlmodify", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Open a URL made by modifying the current URL\n\nThere are several modes:\n\n* Text replace mode:   `urlmodify -t <old> <new>`\n\n   Replaces the first instance of the text `old` with `new`.\n      * `http://example.com` -> (`-t exa peta`) -> `http://petample.com`\n\n* Regex replacment mode: `urlmodify -r <regexp> <new> [flags]`\n\n   Replaces the first match of the `regexp` with `new`. You can use\n   flags `i` and `g` to match case-insensitively and to match\n   all instances respectively\n      * `http://example.com` -> (`-r [ea] X g`) -> `http://XxXmplX.com`\n\n* Query set mode: `urlmodify -s <query> <value>`\n\n   Sets the value of a query to be a specific one. If the query already\n   exists, it will be replaced.\n      * `http://e.com?id=abc` -> (`-s foo bar`) -> `http://e.com?id=abc&foo=bar\n\n* Query replace mode: `urlmodify -q <query> <new_val>`\n\n   Replace the value of a query with a new one:\n      * `http://e.com?id=foo` -> (`-q id bar`) -> `http://e.com?id=bar\n\n* Query delete mode: `urlmodify -Q <query>`\n\n   Deletes the given query (and the value if any):\n      * `http://e.com?id=foo&page=1` -> (`-Q id`) -> `http://e.com?page=1`\n\n* Graft mode: `urlmodify -g <graft_point> <new_path_tail>`\n\n   \"Grafts\" a new tail on the URL path, possibly removing some of the old\n   tail. Graft point indicates where the old URL is truncated before adding\n   the new path.\n\n   * `graft_point` >= 0 counts path levels, starting from the left\n   (beginning). 0 will append from the \"root\", and no existing path will\n   remain, 1 will keep one path level, and so on.\n   * `graft_point` < 0 counts from the right (i.e. the end of the current\n   path). -1 will append to the existing path, -2 will remove the last path\n   level, and so on.\n\n   ```plaintext\n   http://website.com/this/is/the/path/component\n   Graft point:       ^    ^  ^   ^    ^        ^\n   From left:         0    1  2   3    4        5\n   From right:       -6   -5 -4  -3   -2       -1\n   ```\n\n   Examples:\n\n   * `http://e.com/issues/42` -> (`-g 0 foo`) -> `http://e.com/foo`\n   * `http://e.com/issues/42` -> (`-g 1 foo`) -> `http://e.com/issues/foo`\n   * `http://e.com/issues/42` -> (`-g -1 foo`) -> `http://e.com/issues/42/foo`\n   * `http://e.com/issues/42` -> (`-g -2 foo`) -> `http://e.com/issues/foo`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-t", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-r", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-s", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-q", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-Q", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-g", false, false)], false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["urlmodify_js", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[urlmodify]] but returns the modified URL for use with [[js]] and [[composite]]\n\nE.g.\n\n`:composite urlmodify_js -t www. old. | tabopen `", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-t", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-r", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-s", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-q", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-Q", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-g", false, false)], false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["geturlsforlinks", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Returns the url of links that have a matching rel.\n\nDon't bind to this: it's an internal function.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), true)],
            ["zoom", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Sets the current page's zoom level anywhere between 30% and 300%.\n\nIf you overshoot the level while using relative adjustments i.e. level > 300% or level < 30% the zoom level will be set to it's maximum or minimum position. Relative adjustments are made * in percentage points, i.e. `:zoom +10 true` increases the zoom level from 50% to 60% or from * 200% to 210%.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["reader", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Opens the current page in Firefox's reader mode.\nYou currently cannot use Tridactyl while in reader mode.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["loadaucmds", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("UriChange", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("DocStart", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("DocLoad", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("DocEnd", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("TabEnter", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("TabLeft", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("FullscreenEnter", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("FullscreenLeft", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("FullscreenChange", false, false)], false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["focusinput", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Focus the last used input on the page", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["changelistjump", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Focus the tab which contains the last focussed input element. If you're lucky, it will focus the right input, too.\n\nCurrently just goes to the last focussed input; being able to jump forwards and backwards is planned.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["focusbyid", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["tabIndexSetActive", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), true)],
            ["tabnext", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Switch to the next tab, wrapping round.\n\nIf increment is specified, move that many tabs forwards.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["tabnext_gt", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Switch to the next tab, wrapping round.\n\nIf an index is specified, go to the tab with that number (this mimics the\nbehaviour of `{count}gt` in vim, except that this command will accept a\ncount that is out of bounds (and will mod it so that it is within bounds as\nper [[tabmove]], etc)).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["tabprev", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Switch to the previous tab, wrapping round.\n\nIf increment is specified, move that many tabs backwards.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["tabpush", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Pushes the current tab to another window. Only works for windows of the same type\n(can't push a non-private tab to a private window or a private tab to\na non-private window).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["tabaudio", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Switch to the tab currently playing audio, if any.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["winmerge", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Moves all of the targetted window's tabs to the current window. Only works for windows of the same type\n(can't merge a non-private tab with a private window).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["parseWinTabIndex", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Given a string of the format windowIndex.tabIndex, returns a tuple of\nnumbers corresponding to the window index and tab index or the current\nwindow and tab if the string doesn't have the right format.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false, false)], false, false), false, false), false)],
            ["tabgrab", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Moves a tab identified by a windowIndex.tabIndex id to the current window.\nOnly works for windows of the same type (can't grab a non-private tab from a\nprivate window and can't grab a private tab from a non-private window).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false), false, false)], false, false)], false, false), false, false), false)],
            ["tabopen", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[open]], but in a new tab. If no address is given, it will open the newtab page, which can be set with `set newtab [url]`\n\nUse the `-c` flag followed by a container name to open a tab in said container. Tridactyl will try to fuzzy match a name if an exact match is not found (opening the tab in no container can be enforced with \"firefox-default\" or \"none\"). If any autocontainer directives are configured and -c is not set, Tridactyl will try to use the right container automatically using your configurations.\n\nUse the `-b` flag to open the tab in the background.\n\nUse the `-w` flag to wait for the web page to load before \"returning\". This only makes sense for use with [[composite]], which waits for each command to return before moving on to the next one, e.g. `composite tabopen -b -w news.bbc.co.uk ; tabnext`.\n\nThese three can be combined in any order, but need to be placed as the first arguments.\n\nUnlike Firefox's Ctrl-t shortcut, this opens tabs immediately after the\ncurrently active tab rather than at the end of the tab list because that is\nthe authors' preference.\n\nIf you would rather the Firefox behaviour `set tabopenpos last`. This\npreference also affects the clipboard, quickmarks, home, help, etc.\n\nIf you would rather the URL be opened as if you'd middle clicked it, `set\ntabopenpos related`.\n\nHinting is controlled by `relatedopenpos`\n\nAlso see the [[searchengine]] and [[searchurls]] settings.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["tabqueue", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Passes its first argument to `tabopen -b`. Once the tab opened by `tabopen\n-b` is activated/selected/focused, opens its second argument with `tabopen\n-b`. Once the second tab is activated/selected/focused, opens its third\nargument with `tabopen -b` and so on and so forth until all arguments have\nbeen opened in a new tab or until a tab is closed without being\nactivated/selected/focused.\n\nExample usage:\n   `tabqueue http://example.org http://example.com http://example.net`\n   `composite hint -qpipe a href | tabqueue`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["idFromIndex", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Resolve a tab index to the tab id of the corresponding tab in this window.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], false, false), false, false), true)],
            ["tabFromIndex", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[idFromIndex]] but returns the whole tab object", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), true)],
            ["tabonly", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Close all other tabs in this window", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["tabduplicate", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Duplicate a tab.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["tabdetach", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Detach a tab, opening it in a new window.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Window", [], false, false)], false, false), false, false), false)],
            ["getSortedWinTabs", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Get list of tabs sorted by most recent use", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false), false, false)], false, false), false, false), true)],
            ["fullscreen", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Toggle fullscreen state", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Window", [], false, false)], false, false), false, false), false)],
            ["tabclose", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Close a tab.\n\nKnown bug: autocompletion will make it impossible to close more than one tab at once if the list of numbers looks enough like an open tab's title or URL.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["tabcloseallto", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Close all tabs to the side specified", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["undo", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Restore the most recently closed item.\nThe default behaviour is to restore the most recently closed tab in the\ncurrent window unless the most recently closed item is a window.\n\nSupplying either \"tab\" or \"window\" as an argument will specifically only\nrestore an item of the specified type. Supplying \"tab_strict\" only restores\ntabs that were open in the current window.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], false, false), false, false), false)],
            ["tabmove", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Move the current tab to be just in front of the index specified.\n\nKnown bug: This supports relative movement with `tabmove +pos` and `tabmove -pos`, but autocomplete doesn't know that yet and will override positive and negative indexes.\n\nPut a space in front of tabmove if you want to disable completion and have the relative indexes at the command line.\n\nBinds are unaffected.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false), false, false)], false, false)], false, false), false, false), false)],
            ["tabsort", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Move tabs in current window according to various criteria:\n\n- `--containers` groups tabs by containers\n- `--title` sorts tabs by title\n- `--url` sorts tabs by url (the default)\n- `(tab1, tab2) => true|false`\n      - sort by arbitrary comparison function. `tab{1,2}` are objects with properties described here: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["pin", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Pin the current tab", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["mute", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Mute current tab or all tabs.\n\nPassing \"all\" to the excmd will operate on  the mute state of all tabs.\nPassing \"unmute\" to the excmd will unmute.\nPassing \"toggle\" to the excmd will toggle the state of `browser.tabs.tab.MutedInfo`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["winopen", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[tabopen]], but in a new window.\n\n`winopen -private [...]` will open the result in a private window (and won't store the command in your ex-history ;) ).\n\n`winopen -popup [...]` will open it in a popup window. You can combine the two for a private popup.\n\n`winopen -c containername [...]` will open the result in a container while ignoring other options given. See [[tabopen]] for more details on containers.\n\nExample: `winopen -popup -private ddg.gg`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["winclose", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Close a window.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], false, false), false, false), false)],
            ["qall", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Close all windows", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], false, false), false, false), false)],
            ["containerclose", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Closes all tabs open in the same container across all windows.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["containercreate", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Creates a new container. Note that container names must be unique and that the checks are case-insensitive.\n\nFurther reading https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/contextualIdentities/ContextualIdentity\n\nExample usage:\n    - `:containercreate tridactyl green dollar`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["containerdelete", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Delete a container. Closes all tabs associated with that container beforehand. Note: container names are case-insensitive.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["containerupdate", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Update a container's information. Note that none of the parameters are optional and that container names are case-insensitive.\n\nExample usage:\n\n- Changing the container name: `:containerupdate banking blockchain green dollar`\n\n- Changing the container icon: `:containerupdate banking banking green briefcase`\n\n- Changing the container color: `:containerupdate banking banking purple dollar`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["viewcontainers", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Shows a list of the current containers in Firefox's native JSON viewer in the current tab.\n\nNB: Tridactyl cannot run on this page!", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["recontain", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Opens the current tab in another container.\n\nThis is probably not a good idea if you care about tracking protection!\nTransfering URLs from one container to another allows websites to track\nyou across those containers.\n\nRead more here:\nhttps://github.com/mozilla/multi-account-containers/wiki/Moving-between-containers", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["version", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["mode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Switch mode.\n\nFor now you probably shouldn't manually switch to other modes than `normal` and `ignore`. Make sure you're aware of the key bindings (ignoremaps) that will allow you to go come back to normal mode from ignore mode before you run `:mode ignore` otherwise you're going to have a hard time re-enabling Tridactyl.\n\nExample:\n     - `mode ignore` to ignore almost all keys.\n\nIf you're looking for a way to temporarily disable Tridactyl, `mode ignore` might be what you're looking for.\n\nNote that when in ignore mode, Tridactyl will not switch to insert mode when focusing text areas/inputs. This is by design.\n\n**New feature:** you can add modes as simply as adding binds with `bind --mode=[newmodename]` and then enter the mode with `mode [newmodename]`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["getnexttabs", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false, false)], false, false), false, false), true)],
            ["repeat", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Repeats a `cmd` `n` times.\nIf `cmd` doesn't exist, re-executes the last exstr that was executed in the tab.\nExecutes the command once if `n` isn't defined either.\n\nThis re-executes the last *exstr*, not the last *excmd*. Some excmds operate internally by constructing and evaluating exstrs, others by directly invoking excmds without going through the exstr parser. For example, aucmds and keybindings evaluate exstrs and are repeatable, while commands like `:bmarks` directly invoke `:tabopen` and you'll repeat the `:bmarks` rather than the internal `:tabopen`.\n\nIt's difficult to execute this in the background script (`:jsb`, `:run_excmd`, `:autocmd TriStart`, `:source`), but if you you do, it will re-execute the last exstr that was executed in the background script. What this may have been is unpredictable and not precisely encouraged.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["composite", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Split `cmds` on pipes (|) and treat each as its own command. Return values are passed as the last argument of the next ex command, e.g,\n\n`composite echo yes | fillcmdline` becomes `fillcmdline yes`. A more complicated example is the ex alias, `command current_url composite get_current_url | fillcmdline_notrail `, which is used in, e.g. `bind T current_url tabopen`.\n\nWorkaround: this should clearly be in the parser, but we haven't come up with a good way to deal with |s in URLs, search terms, etc. yet.\n\n`cmds` are also split with semicolons (;) and don't pass things along to each other.\n\nIf you wish to have a command that has semi-colons in it (e.g. some JavaScript or `hint -;`), first bind a [[command]] to it. For example, `command hint_focus -;`, and then `composite hint_focus; !s xdotool key Menu`.\n\nThe behaviour of combining ; and | in the same composite command is left as an exercise for the reader.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["shellescape", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Escape command for safe use in shell with composite. E.g: `composite js MALICIOUS_WEBSITE_FUNCTION() | shellescape | exclaim ls`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["escapehatch", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Magic escape hatch: if Tridactyl can't run in the current tab, return to a tab in the current window where Tridactyl can run, making such a tab if it doesn't currently exist. If Tridactyl can run in the current tab, return focus to the document body from e.g. the URL bar or a video player.\n\nOnly useful if called from a background context, e.g. at the end of an RC file to ensure that when you start the browser you don't get trapped on an about: page, or via `bind --mode=browser escapehatch` (bound to `<C-,>` by default).\n\nNB: when called via `bind --mode=browser`, we return focus from the address bar by opening and closing the \"sidebar\" (which is used exclusively for this purpose). If escapehatch is called in any other way, we cannot do this as Mozilla thinks it might [spook](https://extensionworkshop.com/documentation/publish/add-on-policies/#no-surprises) [you](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/User_actions) : ).\n\nThis sidebar hack will close other sidebars such a TreestyleTabs. You can disable it with `:set escapehatchsidebarhack false`, but Tridactyl will no longer be able to get focus back from certain places such as the address bar.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["sleep", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Sleep time_ms milliseconds.\nThis is probably only useful for composite commands that need to wait until the previous asynchronous command has finished running.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["showcmdline", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["hidecmdline", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["fillcmdline", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Set the current value of the commandline to string *with* a trailing space", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["fillcmdline_notrail", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Set the current value of the commandline to string *without* a trailing space", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["fillcmdline_nofocus", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Show and fill the command line without focusing it", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["fillcmdline_tmp", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Shows str in the command line for ms milliseconds. Recommended duration: 3000ms.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["yank", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Copy `content` to clipboard without feedback. Use `clipboard yank` for interactive use.\n\ne.g. `yank bob` puts \"bob\" in the clipboard; `composite js document.title | yank` puts the document title in the clipboard.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false)], false, false), false, false), false)],
            ["setclip", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Copies a string to the clipboard/selection buffer depending on the user's preferences.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false)], false, false), false, false), true)],
            ["setclip_webapi", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Copies a string to the clipboard using the Clipboard API.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["getclip", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Fetches the content of the clipboard/selection buffer depending on user's preferences\n\nExposed for use with [[composite]], e.g. `composite getclip | fillcmdline`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("clipboard", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("selection", false, false)], false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["getclip_webapi", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Gets the clipboard content using the Clipboard API.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], false, false), false, false), true)],
            ["clipboard", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Use the system clipboard.\n\nIf `excmd === \"open\"`, call [[open]] with the contents of the clipboard. Similarly for [[tabopen]].\n\nIf `excmd === \"yank\"`, copy the current URL, or if given, the value of toYank, into the system clipboard.\n\nIf `excmd === \"yankcanon\"`, copy the canonical URL of the current page if it exists, otherwise copy the current URL.\n\nIf `excmd === \"yankshort\"`, copy the shortlink version of the current URL, and fall back to the canonical then actual URL. Known to work on https://yankshort.neocities.org/.\n\nIf `excmd === \"yanktitle\"`, copy the title of the open page.\n\nIf `excmd === \"yankmd\"`, copy the title and url of the open page formatted in Markdown for easy use on sites such as reddit. `yankorg` is similar but for Emacs orgmode.\n\nIf you're on Linux and the native messenger is installed, Tridactyl will call an external binary (either xclip or xsel) to read or write to your X selection buffer. If you want another program to be used, set \"externalclipboardcmd\" to its name and make sure it has the same interface as xsel/xclip (\"-i\"/\"-o\" and reading from stdin).\n\nWhen doing a read operation (i.e. open or tabopen), if \"putfrom\" is set to \"selection\", the X selection buffer will be read instead of the clipboard. Set \"putfrom\" to \"clipboard\" to use the clipboard.\n\nWhen doing a write operation, if \"yankto\" is set to \"selection\", only the X selection buffer will be written to. If \"yankto\" is set to \"both\", both the X selection and the clipboard will be written to. If \"yankto\" is set to \"clipboard\", only the clipboard will be written to.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("open", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("yank", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("yankshort", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("yankcanon", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("yanktitle", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("yankmd", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("yankorg", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("xselpaste", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("tabopen", false, false)], false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["yankimage", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Copy an image to the clipboard.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["tab", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Change active tab.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["taball", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Wrapper for [[tab]] with multi-window completions", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["tab_helper", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Helper to change active tab. Used by [[tab]] and [[taball]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["command", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Similar to vim's `:command`. Maps one ex-mode command to another.\nIf command already exists, this will override it, and any new commands\nadded in a future release will be SILENTLY overridden. Aliases are\nexpanded recursively.\n\nExamples:\n  - `command t tabopen`\n  - `command tn tabnext_gt`\n  - `command hello t` This will expand recursively into 'hello'->'tabopen'\n\nCommands/aliases are expanded as in a shell, so, given the commands above,\nentering `:tn 43` will expand to `:tabnext_gt 43`. You can use this to create\nyour own ex-commands in conjunction with [[js]], specifically `js -p` and `js -d`.\n\nNote that this is only for excmd -> excmd mappings. To map a normal-mode\ncommand to an excommand, see [[bind]].\n\nSee also:\n  - [[comclear]]", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["comclear", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Similar to vim's `comclear` command. Clears an excmd alias defined by\n`command`.\n\nFor example: `comclear helloworld` will reverse any changes caused\nby `command helloworld xxx`\n\nSee also:\n  - [[command]]", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["bind", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Bind a sequence of keys to an excmd or view bound sequence.\n\nThis is an easier-to-implement bodge while we work on vim-style maps.\n\nExamples:\n\n    - `bind G fillcmdline tabopen google`\n    - `bind D composite tabclose | tab #` -> close current tab and switch to most recent previous tab\n    - `bind j scrollline 20`\n    - `bind F hint -b`\n\nYou can view binds by omitting the command line:\n\n    - `bind j`\n    - `bind k`\n\nYou can bind to modifiers and special keys by enclosing them with angle brackets, for example `bind <C-\\>z fullscreen`, `unbind <F1>` (a favourite of people who use TreeStyleTabs :) ), or `bind <Backspace> forward`.\n\nModifiers are truncated to a single character, so Ctrl -> C, Alt -> A, and Shift -> S. Shift is a bit special as it is only required if Shift does not change the key inputted, e.g. `<S-ArrowDown>` is OK, but `<S-a>` should just be `A`.\n\nYou can view all special key names here: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values\n\nUse [[composite]] if you want to execute multiple excmds. Use\n[[fillcmdline]] to put a string in the cmdline and focus the cmdline\n(otherwise the string is executed immediately).\n\nYou can bind to other modes with `bind --mode={insert|ignore|normal|input|ex|hint} ...`, e.g, `bind --mode=insert emacs qall` (NB: unlike vim, all preceeding characters will not be input), or `bind --mode=hint <C-[> hint.reset`.\n\n`bind --mode=browser [key sequence] [ex command]` binds to a special mode which can be accessed all the time in all browser tabs - even tabs in which Tridactyl cannot run. It comes with a few caveats:\n\n- you may only have a few browser-mode binds at once. At the time of writing, this is 8, with 3 initially taken by Tridactyl. If you desperately need more, file an [[issue]].\n- the key sequence must consist of a single, simple key with at least one and no more than two modifiers. An error will be thrown if you try to bind to an invalid key sequence.\n- the `ex command` you bind to may not work fully unless you are on a tab which Tridactyl has access to. Generally, browser-wide actions like making or closing tabs will work but tab-specific actions like scrolling down or entering hint mode will not.\n\nA list of editor functions can be found\n[here](/static/docs/modules/_src_lib_editor_.html).\n\nSee also:\n\n    - [[unbind]]\n    - [[reset]]", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["bindurl", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Like [[bind]] but for a specific url pattern (also see [[seturl]]).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["keymap", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Makes one key equivalent to another for the purposes of most of our parsers. Useful for international keyboard layouts. See user-provided examples for various layouts on our wiki: https://github.com/tridactyl/tridactyl/wiki/Internationalisation\n\ne.g,\n     keymap ę e\n\nSee `:help keytranslatemodes` to enable keymaps in modes other than normal mode.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["searchsetkeyword", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["validateSetArgs", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Validates arguments for set/seturl", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false, false), true)],
            ["seturl", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Usage: `seturl [pattern] key values`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["set", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Set a key value pair in config.\n\nUse to set any values found [here](/static/docs/classes/_src_lib_config_.default_config.html).\n\nArrays should be set using JS syntax, e.g. `:set blacklistkeys [\"/\",\",\"]`.\n\ne.g.\n    set searchurls.google https://www.google.com/search?q=\n    set logging.messaging info\n\nIf no value is given, the value of the of the key will be displayed.\n\nSee also: [[unset]]", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["firefoxsyncpull", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Replaces your local configuration with that stored in the Firefox Sync area.\n\nIt does not merge your configurations: it overwrites.\n\nAlso see [[firefoxsyncpush]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["firefoxsyncpush", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Pushes your local configuration to the Firefox Sync area.\n\nIt does not merge your configurations: it overwrites.\n\nAlso see [[firefoxsyncpull]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["autocmd", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Set autocmds to run when certain events happen.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["autocontain", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Automatically open a domain and all its subdomains in a specified container.\n\n__NB:__ You should use this command with an -s (sane mode) or -u (URL mode) flag. Usage without a flag uses an incorrect regular expression which may cause weird behaviour and has been left in for compatibility reasons.\n\nThis function accepts a `-u` flag to treat the pattern as a URL rather than a domain.\nFor example: `autocontain -u ^https?://([^/]*\\\\.|)youtube\\\\.com/ google` is equivalent to `autocontain -s youtube\\.com google`\n\nFor declaring containers that do not yet exist, consider using `auconcreatecontainer true` in your tridactylrc.\nThis allows Tridactyl to automatically create containers from your autocontain directives. Note that they will be random icons and colors.\n\nThe domain is passed through as a regular expression so there are a few gotchas to be aware of:\n* Unescaped periods will match *anything*. `autocontain -s google.co.uk work` will match `google!co$uk`. Escape your periods [twice](https://javascript.info/regexp-escaping#new-regexp) (i.e. `\\\\.` rather than `\\.`) or accept that you might get some false positives.\n* You can use regex in your pattern. `autocontain -s google\\\\.(co\\\\.uk|com) work` will match either `google.co.uk` or `google.com`.\n\nThis *should* now peacefully coexist with the Temporary Containers and Multi-Account Containers addons. Do not trust this claim. If a fight starts the participants will try to open infinite tabs. It is *strongly* recommended that you use a tridactylrc so that you can abort a sorceror's-apprentice scenario by killing firefox, commenting out all of autocontainer directives in your rc file, and restarting firefox to clean up the mess. There are a number of strange behaviors resulting from limited coordination between extensions. Redirects can be particularly surprising; for example, with `:autocontain -s will-redirect.example.org example` set and `will-redirect.example.org` redirecting to `redirected.example.org`, navigating to `will-redirect.example.org` will result in the new tab being in the `example` container under some conditions and in the `firefox-default` container under others.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["autocmddelete", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Remove autocmds", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["blacklistadd", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Helper function to put Tridactyl into ignore mode on the provided URL.\n\nSimply creates a DocStart [[autocmd]] that runs `mode ignore`. NB: ignore mode does have a few keybinds by default - see `:viewconfig ignoremaps`. These can be unbound with, e.g. `:unbind --mode=ignore <C-o>`, or `:unbindurl [url] --mode=ignore <C-o>`.\n\nRemove sites from the blacklist with `blacklistremove [url]` or `autocmddelete DocStart [url]`.\n\nIf you're looking for a way to temporarily disable Tridactyl, this might be what you're looking for.\n\n<!-- this should probably be moved to an ex alias once configuration has better help --!>", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["unbind", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Unbind a sequence of keys so that they do nothing at all.\n\nSee also:\n\n    - [[bind]]\n    - [[reset]]", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["unbindurl", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Unbind a sequence of keys you have set with [[bindurl]]. Note that this **kills** a bind, which means Tridactyl will pass it to the page on `pattern`. If instead you want to use the default setting again, use [[reseturl]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["reset", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Restores a sequence of keys to their default value.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["reseturl", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Restores a sequence of keys to their value in the global config for a specific URL pattern.\n\nSee also:\n  - [[bind]]\n  - [[unbind]]\n  - [[reset]]\n  - [[bindurl]]\n  - [[unbindurl]]\n  - [[seturl]]\n  - [[unseturl]]", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["sanitise", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Deletes various bits of Firefox or Tridactyl data\n\nThe list of possible arguments can be found here:\nhttps://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/browsingData/DataTypeSet\n\nAdditional Tridactyl-specific arguments are:\n- `commandline`: Removes the in-memory commandline history.\n- `tridactyllocal`: Removes all tridactyl storage local to this machine. Use it with\n    commandline if you want to delete your commandline history.\n- `tridactylsync`: Removes all tridactyl storage associated with your Firefox Account (i.e, all user configuration, by default).\nThese arguments aren't affected by the timespan parameter.\n\nTimespan parameter:\n-t [0-9]+(m|h|d|w)\n\nExamples:\n\n- `sanitise all` -> Deletes __everything__, including any saved usernames / passwords(!)\n- `sanitise history` -> Deletes all history\n- `sanitise commandline tridactyllocal tridactylsync` -> Deletes every bit of data Tridactyl holds\n- `sanitise cookies -t 3d` -> Deletes cookies that were set during the last three days.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["quickmark", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Bind a quickmark for the current URL or space-separated list of URLs to a key on the keyboard.\n\nAfterwards use go[key], gn[key], or gw[key] to [[open]], [[tabopen]], or\n[[winopen]] the URL respectively.\n\nExample:\n- `quickmark m https://mail.google.com/mail/u/0/#inbox`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["get", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Puts the contents of config value with keys `keys` into the commandline and the background page console\n\nIt's a bit rubbish, but we don't have a good way to provide feedback to the commandline yet.\n\nYou can view the log entry in the browser console (Ctrl-Shift-j).\n\nFor example, you might try `get nmaps` to see all of your current binds.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["viewconfig", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Opens the current configuration in Firefox's native JSON viewer in a new tab.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["jsonview", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("View a JSON object in Firefox's JSON viewer.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false)], false, false), false, false), false)],
            ["unseturl", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Reset a site-specific setting.\n\nusage: `unseturl [pattern] key`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["unset", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Reset a config setting to default", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["setnull", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("\"Delete\" a default setting. E.g. `setnull searchurls.github` means `open github test` would search your default search engine for \"github test\".", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["hint", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Hint a page.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["rot13", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Perform rot13.\n\nTransforms all text nodes in the current tab via rot13. Only characters in\nthe ASCII range are considered.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["jumble", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Perform text jumbling (reibadailty).\n\nShuffles letters except for first and last in all words in text nodes in the current tab. Only characters in\nthe ASCII range are considered.\n\nInspired by: https://www.newscientist.com/letter/mg16221887-600-reibadailty/", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["run_exstr", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Hacky ex string parser.\n\nUse it for fire-and-forget running of background commands in content.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["gobble", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Initialize gobble mode.\n\nIt will read `nChars` input keys, append them to `endCmd` and execute that\nstring.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["nmode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Initialize n [mode] mode.\n\nIn this special mode, a series of key sequences are executed as bindings from a different mode, as specified by the\n`mode` argument. After the count of accepted sequences is `n`, the finalizing ex command given as the `endexArr`\nargument is executed, which defaults to `mode ignore`.\n\nExample: `:nmode normal 1 mode ignore`\nThis looks up the next key sequence in the normal mode bindings, executes it, and switches the mode to `ignore`.\nIf the key sequence does not match a binding, it will be silently passed through to Firefox, but it will be counted\nfor the termination condition.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["tssReadFromCss", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Read text content of elements matching the given selector", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), false)],
            ["ttsread", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Read the given text using the browser's text to speech functionality and\nthe settings currently set", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-t", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("-c", false, false)], false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["ttsvoices", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Show a list of the voices available to the TTS system. These can be\nset in the config using `ttsvoice`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["ttscontrol", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Cancel current reading and clear pending queue\n\nArguments:\n   - stop:    cancel current and pending utterances", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["buildFilterConfigs", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Build a set of FilterConfigs from a list of human-input filter\nspecs.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false, false), true)],
            ["perfdump", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Dump the raw json for our performance counters. Filters with\ntrailing slashes are class names, :start | :end | :measure specify\nwhat type of sample to pass through, and all others are function\nnames. All filters must match for a sample to be dumped.\n\nTridactyl does not collect performance information by default. To\nget this data you'll have to set the configuration option\n`perfcounters` to `\"true\"`. You may also want to examine the value\nof `perfsamples`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["perfhistogram", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Pretty-print a histogram of execution durations for you. Arguments\nare as above, with the addition that this automatically filters to\ncounter samples of type :measure.\n\nNote that this will display its output by opening a data: url with\ntext in the place of your current tab.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["bmark", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Add or remove a bookmark.\n\nOptionally, you may give the bookmark a title. If no URL is given, a bookmark is added for the current page.\n\nIf a bookmark already exists for the URL, it is removed, even if a title is given.\n\nDoes not support creation of folders: you'll need to use the Firefox menus for that.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("BookmarkTreeNode", [], false, false)], false, false), false, false), false)],
            ["echo", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), false)],
            ["js_helper", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("helper function for js and jsb\n\n-p to take a single extra argument located at the end of str[]\n-d[delimiter character] to take a space-separated array of arguments after the delimiter\n-s to load js script of a source file from the config path", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), true)],
            ["js", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Lets you execute JavaScript in the page context. If you want to get the result back, use\n\n     `composite js ... | fillcmdline`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["jsb", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Lets you execute JavaScript in the background context. All the help from [[js]] applies. Gives you a different `tri` object which has access to more excmds and web-extension APIs.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["issue", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Opens a new tab the url of which is \"https://github.com/tridactyl/tridactyl/issues/new\" and automatically fill add tridactyl, firefox and os version to the issue.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Tab", [], false, false)], false, false), false, false), false)],
            ["updatecheck", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Checks if there are any stable updates available for Tridactyl.\n\nRelated settings:\n\n- `update.nag = true | false` - checks for updates on Tridactyl start.\n- `update.nagwait = 7` - waits 7 days before nagging you to update.\n- `update.checkintervalsecs = 86400` - waits 24 hours between checking for an update.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("manual", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("auto_polite", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("auto_impolite", false, false)], false, true)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, false)], false, false), false, false), false)],
            ["keyfeed", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Feed some keys to Tridactyl's parser. E.g. `keyfeed jkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjkjjkj`.\n\nNB:\n\n- Does _not_ function like Vim's noremap - `bind j keyfeed j` will cause an infinite loop.\n- Doesn't work in exmode - i.e. `keyfeed t<CR>` won't work.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["extoptions", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Opens optionsUrl for the selected extension in a popup window.\n\nNB: Tridactyl cannot run on this page!", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["elementunhide", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Restore the most recently hidden element. Repeated invocations restore the next-most-recently-hidden element.\n\n(Elements can be hidden with `;K` and `:hint -K`.)", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)]]))],
    ["src/lib/config.ts", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.FileMetadata(new Map([["default_config", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.ClassMetadata(new Map([["configversion", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Internal version number Tridactyl uses to know whether it needs to update from old versions of the configuration.\n\nChanging this might do weird stuff.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)], ["subconfigs", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Internal field to handle site-specific configs. Use :seturl/:unseturl to change these values.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([["", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("DeepPartial", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("default_config", [], false, false)], false, false)]]), false, false), false)], ["priority", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Internal field to handle site-specific config priorities. Use :seturl/:unseturl to change this value.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)], ["exmaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("exmaps contains all of the bindings for the command line.\nYou can of course bind regular ex commands but also [editor functions](/static/docs/modules/_src_lib_editor_.html) and [commandline-specific functions](/static/docs/modules/_src_commandline_frame_.html).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["ignoremaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("ignoremaps contain all of the bindings for \"ignore mode\".\n\nThey consist of key sequences mapped to ex commands.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["imaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("imaps contain all of the bindings for \"insert mode\".\n\nOn top of regular ex commands, you can also bind [editor functions](/static/docs/modules/_src_lib_editor_.html) in insert mode.\n\nThey consist of key sequences mapped to ex commands.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["inputmaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("inputmaps contain all of the bindings for \"input mode\".\n\nOn top of regular ex commands, you can also bind [editor functions](/static/docs/modules/_src_lib_editor_.html) in input mode.\n\nThey consist of key sequences mapped to ex commands.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["nmaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("nmaps contain all of the bindings for \"normal mode\".\n\nThey consist of key sequences mapped to ex commands.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["vmaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["hintmaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["browsermaps", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Browser-wide binds accessible in all modes and on pages where Tridactyl \"cannot run\".\n<!-- Note to developers: binds here need to also be listed in manifest.json -->", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)], ["leavegithubalone", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to allow pages (not necessarily github) to override `/`, which is a default Firefox binding.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["blacklistkeys", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Which keys to protect from pages that try to override them. Requires [[leavegithubalone]] to be set to false.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), false)], ["autocmds", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Autocommands that run when certain events happen, and other conditions are met.\n\nRelated ex command: `autocmd`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["keytranslatemap", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Map for translating keys directly into other keys in normal-ish modes. For example, if you have an entry in this config option mapping `п` to `g`, then you could type `пп` instead of `gg` or `пi` instead of `gi` or `;п` instead of `;g`. This is primarily useful for international users who don't want to deal with rebuilding their bindings every time tridactyl ships a new default keybind. It's not as good as shipping properly internationalized sets of default bindings, but it's probably as close as we're going to get on a small open-source project like this.\n\nNote that the current implementation does not allow you to \"chain\" keys, for example, \"a\"=>\"b\" and \"b\"=>\"c\" for \"a\"=>\"c\". You can, however, swap or rotate keys, so \"a\"=>\"b\" and \"b\"=>\"a\" will work the way you'd expect, as will \"a\"=>\"b\" and \"b\"=>\"c\" and \"c\"=>\"a\".", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["keytranslatemodes", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to use the keytranslatemap in various maps.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([["", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                                    new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false)]]), false, false), false)], ["autocontain", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Automatically place these sites in the named container.\n\nEach key corresponds to a URL fragment which, if contained within the page URL, the site will be opened in a container tab instead.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false)],
                    ["autocontainmode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Strict mode will always ensure a domain is open in the correct container, replacing the current tab if necessary.\n\nRelaxed mode is less aggressive and instead treats container domains as a default when opening a new tab.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("strict", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("relaxed", false, false)], false, false), false)], ["exaliases", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Aliases for the commandline.\n\nYou can make a new one with `command alias ex-command`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)],
                    ["followpagepatterns", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Used by `]]` and `[[` to look for links containing these words.\n\nEdit these if you want to add, e.g. other language support.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)], ["searchengine", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("The default search engine used by `open search`. If empty string, your browser's default search engine will be used. If set to something, Tridactyl will first look at your [[searchurls]] and then at the search engines for which you have defined a keyword on `about:preferences#search`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)], ["searchurls", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Definitions of search engines for use via `open [keyword]`.\n\n`%s` will be replaced with your whole query and `%s1`, `%s2`, ..., `%sn` will be replaced with the first, second and nth word of your query. If there are none of these patterns in your search urls, your query will simply be appended to the searchurl.\n\nExamples:\n- When running `open gi cute puppies`, with a `gi` searchurl defined with `set searchurls.gi https://www.google.com/search?q=%s&tbm=isch`, tridactyl will navigate to `https://www.google.com/search?q=cute puppies&tbm=isch`.\n- When running `tabopen translate en ja Tridactyl`, with a `translate` searchurl defined with `set searchurls.translate https://translate.google.com/#view=home&op=translate&sl=%s1&tl=%s2&text=%s3`, tridactyl will navigate to `https://translate.google.com/#view=home&op=translate&sl=en&tl=ja&text=Tridactyl`.\n\n[[setnull]] can be used to \"delete\" the default search engines. E.g. `setnull searchurls.google`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)], ["newtab", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("URL the newtab will redirect to.\n\nAll usual rules about things you can open with `open` apply, with the caveat that you'll get interesting results if you try to use something that needs `nativeopen`: so don't try `about:newtab` or a `file:///` URI. You should instead use a data URI - https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs - or host a local webserver (e.g. Caddy).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["viewsource", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether `:viewsource` will use our own page that you can use Tridactyl binds on, or Firefox's default viewer, which you cannot use Tridactyl on.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("tridactyl", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("default", false, false)], false, false), false)],
                    ["homepages", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Pages opened with `gH`. In order to set this value, use `:set homepages [\"example.org\", \"example.net\", \"example.com\"]` and so on.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), false)],
                    ["hintchars", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Characters to use in hint mode.\n\nThey are used preferentially from left to right.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["hintfiltermode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("The type of hinting to use. `vimperator` will allow you to filter links based on their names by typing non-hint chars. It is recommended that you use this in conjuction with the [[hintchars]] setting, which you should probably set to e.g, `5432167890`. ´vimperator-reflow´ additionally updates the hint labels after filtering.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("simple", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("vimperator", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("vimperator-reflow", false, false)], false, false), false)],
                    ["hintnames", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to optimise for the shortest possible names for each hint, or to use a simple numerical ordering. If set to `numeric`, overrides `hintchars` setting.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("short", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("numeric", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("uniform", false, false)], false, false), false)],
                    ["hintuppercase", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to display the names for hints in uppercase.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["hintdelay", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("The delay in milliseconds in `vimperator` style hint modes after selecting a hint before you are returned to normal mode.\n\nThe point of this is to prevent accidental execution of normal mode binds due to people typing more than is necessary to choose a hint.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["hintshift", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Controls whether hints should be shifted in quick-hints mode.\n\nHere's what it means: let's say you have hints from a to z but are only\ninterested in every second hint. You first press `a`, then `c`.\nTridactyl will realize that you skipped over `b`, and so that the next\nhint you're going to trigger is probably `e`. Tridactyl will shift all\nhint names so that `e` becomes `c`, `d` becomes `b`, `c` becomes `a` and\nso on.\nThis means that once you pressed `c`, you can keep on pressing `c` to\ntrigger every second hint. Only makes sense with hintnames = short.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["hintautoselect", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Controls whether hints should be followed automatically.\n\nIf set to `false`, hints will only be followed upon confirmation. This applies to cases when there is only a single match or only one link on the page.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["allowautofocus", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Controls whether the page can focus elements for you via js\n\nNB: will break fancy editors such as CodeMirror on Jupyter. Simply use `seturl` to whitelist pages you need it on.\n\nBest used in conjunction with browser.autofocus in `about:config`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["preventautofocusjackhammer", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Uses a loop to prevent focus until you interact with a page. Only recommended for use via `seturl` for problematic sites as it can be a little heavy on CPU if running on all tabs. Should be used in conjuction with [[allowautofocus]]", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["smoothscroll", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to use Tridactyl's (bad) smooth scrolling.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["scrollduration", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("How viscous you want smooth scrolling to feel.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["tabopenpos", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Where to open tabs opened with `tabopen` - to the right of the current tab, or at the end of the tabs.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("next", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("last", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("related", false, false)], false, false), false)],
                    ["tabclosepinned", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("When enabled (the default), running tabclose will close the tabs whether they are pinned or not. When disabled, tabclose will fail with an error if a tab is pinned.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["tabsort", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Controls which tab order to use when opening the tab/buffer list. Either mru = sort by most recent tab or default = by tab index", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("default", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("mru", false, false)], false, false), false)],
                    ["relatedopenpos", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Where to open tabs opened with hinting - as if it had been middle clicked, to the right of the current tab, or at the end of the tabs.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("next", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("last", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("related", false, false)], false, false), false)],
                    ["ttsvoice", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("The name of the voice to use for text-to-speech. You can get the list of installed voices by running the following snippet: `js alert(window.speechSynthesis.getVoices().reduce((a, b) => a + \" \" + b.name))`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["ttsvolume", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Controls text-to-speech volume. Has to be a number between 0 and 1.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["ttsrate", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Controls text-to-speech speed. Has to be a number between 0.1 and 10.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["ttspitch", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Controls text-to-speech pitch. Has to be between 0 and 2.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["gimode", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("When set to \"nextinput\", pressing `<Tab>` after gi selects the next input.\n\nWhen set to \"firefox\", `<Tab>` behaves like normal, focusing the next tab-indexed element regardless of type.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("nextinput", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("firefox", false, false)], false, false), false)],
                    ["cursorpos", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Decides where to place the cursor when selecting non-empty input fields", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("beginning", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("end", false, false)], false, false), false)],
                    ["theme", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("The theme to use.\n\nPermitted values: run `:composite js tri.styling.THEMES | fillcmdline` to find out.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)], ["customthemes", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Storage for custom themes\n\nMaps theme names to CSS. Predominantly used automatically by [[colourscheme]] to store themes read from disk, as documented by [[colourscheme]]. Setting this manually is untested but might work provided that [[colourscheme]] is then used to change the theme to the right theme name.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)], ["modeindicator", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to display the mode indicator or not.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)], ["modeindicatormodes", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to display the mode indicator in various modes. Ignored if modeindicator set to false.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([["", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                                    new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false)]]), false, false), false)], ["jumpdelay", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Milliseconds before registering a scroll in the jumplist", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)], ["logging", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Logging levels. Unless you're debugging Tridactyl, it's unlikely you'll ever need to change these.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([["", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("never", false, false),
                                    new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("error", false, false),
                                    new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("warning", false, false),
                                    new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("info", false, false),
                                    new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("debug", false, false)], false, false)]]), false, false), false)], ["noiframe", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Disables the commandline iframe. Dangerous setting, use [[seturl]] to set it. If you ever set this setting to \"true\" globally and then want to set it to false again, you can do this by opening Tridactyl's preferences page from about:addons.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["noiframeon", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), false)],
                    ["editorcmd", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Insert / input mode edit-in-$EDITOR command to run\nThis has to be a command that stays in the foreground for the whole editing session\n\"auto\" will attempt to find a sane editor in your path.\nPlease send your requests to have your favourite terminal moved further up the list to /dev/null.\n          (but we are probably happy to add your terminal to the list if it isn't already there.)\n\nExample values:\n- linux: `xterm -e vim`\n- windows: `start cmd.exe /c \\\"vim\\\"`.\n\nAlso see [:editor](/static/docs/modules/_src_excmds_.html#editor).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["rsscmd", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Command that should be run by the [[rssexec]] ex command. Has the\nfollowing format:\n- %u: url\n- %t: title\n- %y: type (rss, atom, xml...)\nWarning: This is a very large footgun. %u will be inserted without any\nkind of escaping, hence you must obey the following rules if you care\nabout security:\n- Do not use a composite command. If you need a composite command,\ncreate an alias.\n- Do not use `js` or `jsb`. If you need to use them, create an alias.\n- Do not insert any %u, %t or %y in shell commands run by the native\nmessenger. Use pipes instead.\n\nHere's an example of how to save an rss url in a file on your disk\nsafely:\n`alias save_rss jsb -p tri.native.run(\"cat >> ~/.config.newsboat/urls\", JS_ARG)`\n`set rsscmd save_rss %u`\nThis is safe because the url is passed to jsb as an argument rather than\nbeing expanded inside of the string it will execute and because it is\npiped to the shell command rather than being expanded inside of it.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["browser", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("The browser executable to look for in commands such as `restart`. Not as mad as it seems if you have multiple versions of Firefox...", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["yankto", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Which clipboard to store items in. Requires the native messenger to be installed.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("clipboard", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("selection", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("both", false, false)], false, false), false)],
                    ["putfrom", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Which clipboard to retrieve items from. Requires the native messenger to be installed.\n\nPermitted values: `clipboard`, or `selection`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("clipboard", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("selection", false, false)], false, false), false)],
                    ["externalclipboardcmd", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Clipboard command to try to get the selection from (e.g. `xsel` or `xclip`)", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["downloadsskiphistory", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether downloads (e.g. via ;s hint modes) appear in your download history.\n\nNB: will cause downloads to fail silently if Tridactyl is not allowed to run in private windows (regardless of whether you are trying to call it in a private window).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["nativeinstallcmd", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Set this to something weird if you want to have fun every time Tridactyl tries to update its native messenger.\n\n%TAG will be replaced with your version of Tridactyl for stable builds, or \"master\" for beta builds\n\nNB: Windows has its own platform-specific default.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)], ["update", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Used by :updatecheck and related built-in functionality to automatically check for updates and prompt users to upgrade.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)], ["profiledir", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Profile directory to use with native messenger with e.g, `guiset`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["tabopencontaineraware", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("If enabled, tabopen opens a new tab in the currently active tab's container.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["containerindicator", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("If moodeindicator is enabled, containerindicator will color the border of the mode indicator with the container color.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["auconcreatecontainer", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Autocontain directives create a container if it doesn't exist already.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["historyresults", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Number of most recent results to ask Firefox for. We display the top 20 or so most frequently visited ones.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["bmarkweight", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("When displaying bookmarks in history completions, how many page views to pretend they have.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)], ["completions", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("General completions options - NB: options are set according to our internal completion source name - see - `src/completions/[name].ts` in the Tridactyl source.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ObjectType(new Map([]), false, false), false)], ["findresults", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Number of results that should be shown in completions. -1 for unlimited", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["findcontextlen", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Number of characters to use as context for the matches shown in completions", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["findcase", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether find should be case-sensitive", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("smart", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("sensitive", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("insensitive", false, false)], false, false), false)],
                    ["incsearch", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether Tridactyl should jump to the first match when using `:find`", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["minincsearchlen", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("How many characters should be typed before triggering incsearch/completions", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)],
                    ["csp", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Deprecated.\nChange this to \"clobber\" to ruin the \"Content Security Policy\" of all sites a bit and make Tridactyl run a bit better on some of them, e.g. raw.github*", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("untouched", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("clobber", false, false)], false, false), false)],
                    ["wordpattern", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("JavaScript RegExp used to recognize words in text.* functions (e.g. text.transpose_words). Should match any character belonging to a word.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["perfcounters", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Activate tridactyl's performance counters. These have a\nmeasurable performance impact, since every sample is a few\nhundred bytes and we sample tridactyl densely, but they're good\nwhen you're trying to optimize things.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["perfsamples", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("How many samples to store from the perf counters.\n\nEach performance entry is two numbers (16 bytes), an entryType\nof either \"mark\" or \"measure\" (js strings are utf-16 ad we have\ntwo marks for each measure, so amortize to about 10 bytes per\nentry), and a string name that for Tridactyl object will be\nabout 40 (utf-16) characters (80 bytes), plus object overhead\nroughly proportional to the string-length of the name of the\nconstructor (in this case something like 30 bytes), for a total\nof what we'll call 128 bytes for ease of math.\n\nWe want to store, by default, about 1MB of performance\nstatistics, so somewhere around 10k samples.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false)],
                    ["modeindicatorshowkeys", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Show (partial) command in the mode indicator.\nCorresponds to 'showcmd' option of vi.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["urlparenttrailingslash", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether a trailing slash is appended when we get the parent of a url with\ngu (or other means).", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["visualenterauto", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to enter visual mode when text is selected. Visual mode can always be entered with `:mode visual`.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["visualexitauto", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to return to visual mode when text is deselected.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["escapehatchsidebarhack", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Whether to open and close the sidebar quickly to get focus back to the page when <C-,> is pressed.\n\nDisable if the fact that it closes TreeStyleTabs gets on your nerves too much : )\n\nNB: when disabled, <C-,> can't get focus back from the address bar, but it can still get it back from lots of other places (e.g. Flash-style video players)", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("false", false, false),
                            new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("true", false, false)], false, false), false)],
                    ["completionfuzziness", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Threshold for fuzzy matching on completions. Lower => stricter matching. Range between 0 and 1: 0 corresponds to perfect matches only. 1 will match anything.\n\nhttps://fusejs.io/api/options.html#threshold", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.NumberType(false, false), false)]]))]]), new Map([["o", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), true)],
            ["schlepp", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["getDeepProperty", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Given an object and a target, extract the target if it exists, else return undefined", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), true)],
            ["setDeepProperty", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Create the key path target if it doesn't exist and set the final property to value.\n\nIf the path is an empty array, replace the obj.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), true)],
            ["mergeDeep", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), true)],
            ["getURL", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), true)],
            ["get", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Get the value of the key target.\n\nIf the user has not specified a key, use the corresponding key from\ndefaults, if one exists, else undefined.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("rsscmd", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("noiframeon", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("csp", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("theme", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("autocmds", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("exaliases", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("autocontain", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("update", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("imaps", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("viewsource", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("nmaps", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("configversion", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("subconfigs", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("priority", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("... 70 more ...", [], false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("completionfuzziness", false, false)], false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), true)],
            ["getDynamic", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Get the value of the key target.\n\nPlease only use this with targets that will be used at runtime - it skips static checks. Prefer [[get]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), false, false), false)],
            ["getAsyncDynamic", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Get the value of the key target.\n\nPlease only use this with targets that will be used at runtime - it skips static checks. Prefer [[getAsync]].", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], false, false), false, false), false)],
            ["getAsync", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Get the value of the key target, but wait for config to be loaded from the\ndatabase first if it has not been at least once before.\n\nThis is useful if you are a content script and you've just been loaded.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.UnionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("rsscmd", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("noiframeon", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("csp", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("theme", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("autocmds", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("exaliases", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("autocontain", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("update", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("imaps", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("viewsource", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("nmaps", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("configversion", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("subconfigs", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("priority", false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("... 70 more ...", [], false, false),
                        new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.LiteralTypeType("completionfuzziness", false, false)], false, true), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("...", [], false, false)], false, false), false, false), true)],
            ["push", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["pull", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), false)],
            ["setURL", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["set", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Full target specification, then value\n\ne.g.\n    set(\"nmaps\", \"o\", \"open\")\n    set(\"search\", \"default\", \"google\")\n    set(\"aucmd\", \"BufRead\", \"memrise.com\", \"open memrise.com\")", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["unsetURL", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["unset", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Delete the key at target in USERCONFIG if it exists", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.ArrayType(new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["save", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Save the config back to storage API.\n\nConfig is not synchronised between different instances of this module until\nsometime after this happens.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["update", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Updates the config to the latest version.\nProposed semantic for config versionning:\n- x.y -> x+1.0 : major architectural changes\n- x.y -> x.y+1 : renaming settings/changing their types\nThere's no need for an updater if you're only adding a new setting/changing\na default setting\n\nWhen adding updaters, don't forget to set(\"configversion\", newversionnumber)!", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.BooleanType(false, false)], false, false), false, false), true)],
            ["init", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Read all user configuration from storage API then notify any waiting asynchronous calls\n\nasynchronous calls generated by getAsync.", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("Promise", [new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false)], false, false), false, false), true)],
            ["addChangeListener", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("P", [], false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["removeChangeListener", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.TypeReferenceType("P", [], false, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false), new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.AnyType(true, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false)], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.VoidType(false, false), false, false), true)],
            ["parseConfig", new _compiler_metadata_AllMetadata__WEBPACK_IMPORTED_MODULE_1__.SymbolMetadata("Parse the config into a string representation of a .tridactylrc config file.\nTries to parse the config into sectionable chunks based on keywords.\nBinds, aliases, autocmds and logging settings each have their own section while the rest are dumped into \"General Settings\".", new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.FunctionType([], new _compiler_types_AllTypes__WEBPACK_IMPORTED_MODULE_0__.StringType(false, false), false, false), false)]]))]]));
let staticThemes = ["dark", "default", "greenmat", "halloween", "quake", "quakelight", "shydactyl"];


/***/ }),

/***/ "./src/commandline_frame.ts":
/*!**********************************!*\
  !*** ./src/commandline_frame.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "enableCompletions": () => (/* binding */ enableCompletions),
/* harmony export */   "focus": () => (/* binding */ focus),
/* harmony export */   "refresh_completions": () => (/* binding */ refresh_completions),
/* harmony export */   "clear": () => (/* binding */ clear),
/* harmony export */   "fillcmdline": () => (/* binding */ fillcmdline),
/* harmony export */   "getContent": () => (/* binding */ getContent),
/* harmony export */   "editor_function": () => (/* binding */ editor_function)
/* harmony export */ });
/* harmony import */ var _src_commandline_frame__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/commandline_frame */ "./src/commandline_frame.ts");
/* harmony import */ var _src_completions_Apropos__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/completions/Apropos */ "./src/completions/Apropos.ts");
/* harmony import */ var _src_completions_Bindings__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/completions/Bindings */ "./src/completions/Bindings.ts");
/* harmony import */ var _src_completions_Bmark__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/completions/Bmark */ "./src/completions/Bmark.ts");
/* harmony import */ var _src_completions_Composite__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @src/completions/Composite */ "./src/completions/Composite.ts");
/* harmony import */ var _src_completions_Excmd__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @src/completions/Excmd */ "./src/completions/Excmd.ts");
/* harmony import */ var _src_completions_Extensions__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @src/completions/Extensions */ "./src/completions/Extensions.ts");
/* harmony import */ var _src_completions_FileSystem__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @src/completions/FileSystem */ "./src/completions/FileSystem.ts");
/* harmony import */ var _src_completions_Guiset__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @src/completions/Guiset */ "./src/completions/Guiset.ts");
/* harmony import */ var _src_completions_Help__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @src/completions/Help */ "./src/completions/Help.ts");
/* harmony import */ var _src_completions_History__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @src/completions/History */ "./src/completions/History.ts");
/* harmony import */ var _src_completions_Preferences__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @src/completions/Preferences */ "./src/completions/Preferences.ts");
/* harmony import */ var _src_completions_Rss__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! @src/completions/Rss */ "./src/completions/Rss.ts");
/* harmony import */ var _src_completions_Sessions__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! @src/completions/Sessions */ "./src/completions/Sessions.ts");
/* harmony import */ var _src_completions_Settings__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! @src/completions/Settings */ "./src/completions/Settings.ts");
/* harmony import */ var _src_completions_Tab__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! @src/completions/Tab */ "./src/completions/Tab.ts");
/* harmony import */ var _src_completions_TabAll__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! @src/completions/TabAll */ "./src/completions/TabAll.ts");
/* harmony import */ var _src_completions_Theme__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! @src/completions/Theme */ "./src/completions/Theme.ts");
/* harmony import */ var _src_completions_Window__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! @src/completions/Window */ "./src/completions/Window.ts");
/* harmony import */ var _src_content_state_content__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! @src/content/state_content */ "./src/content/state_content.ts");
/* harmony import */ var _src_content_styling__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! @src/content/styling */ "./src/content/styling.ts");
/* harmony import */ var _src_lib_commandline_cmds__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! @src/lib/commandline_cmds */ "./src/lib/commandline_cmds.ts");
/* harmony import */ var _src_lib_editor__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! @src/lib/editor */ "./src/lib/editor.ts");
/* harmony import */ var _src_lib_html_tagged_template__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! @src/lib/html-tagged-template */ "./src/lib/html-tagged-template.js");
/* harmony import */ var _src_lib_html_tagged_template__WEBPACK_IMPORTED_MODULE_23___default = /*#__PURE__*/__webpack_require__.n(_src_lib_html_tagged_template__WEBPACK_IMPORTED_MODULE_23__);
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");
/* harmony import */ var _src_lib_number_clamp__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! @src/lib/number.clamp */ "./src/lib/number.clamp.ts");
/* harmony import */ var _src_lib_number_clamp__WEBPACK_IMPORTED_MODULE_26___default = /*#__PURE__*/__webpack_require__.n(_src_lib_number_clamp__WEBPACK_IMPORTED_MODULE_26__);
/* harmony import */ var _src_parsers_genericmode__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! @src/parsers/genericmode */ "./src/parsers/genericmode.ts");
/* harmony import */ var _src_perf__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! @src/perf */ "./src/perf.ts");
/* harmony import */ var _src_state__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! @src/state */ "./src/state.ts");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/reverse.js");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/uniq.js");
/** # Command line functions
 *
 * This file contains functions to interact with the command line.
 *
 * If you want to bind them to keyboard shortcuts, be sure to prefix them with "ex.". For example, if you want to bind control-p to `prev_completion`, use:
 *
 * ```
 * bind --mode=ex <C-p> ex.prev_completion
 * ```
 *
 * Note that you can also bind Tridactyl's [editor functions](/static/docs/modules/_src_lib_editor_.html) in the command line.
 *
 * Contrary to the main tridactyl help page, this one doesn't tell you whether a specific function is bound to something. For now, you'll have to make do with `:bind` and `:viewconfig`.
 *
 */
/** ignore this line */
/** Script used in the commandline iframe. Communicates with background. */































/** @hidden **/
const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_24__.default("cmdline");
/** @hidden **/
const commandline_state = {
    activeCompletions: undefined,
    clInput: window.document.getElementById("tridactyl-input"),
    clear,
    cmdline_history_position: 0,
    completionsDiv: window.document.getElementById("completions"),
    fns: undefined,
    getCompletion,
    history,
    /** @hidden
     * This is to handle Escape key which, while the cmdline is focused,
     * ends up firing both keydown and input listeners. In the worst case
     * hides the cmdline, shows and refocuses it and replaces its text
     * which could be the prefix to generate a completion.
     * tl;dr TODO: delete this and better resolve race condition
     */
    isVisible: false,
    keyEvents: new Array(),
    refresh_completions,
    state: _src_state__WEBPACK_IMPORTED_MODULE_29__.default,
};
// first theming of commandline iframe
(0,_src_content_styling__WEBPACK_IMPORTED_MODULE_20__.theme)(document.querySelector(":root"));
/** @hidden **/
function resizeArea() {
    if (commandline_state.isVisible) {
        _src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__.messageOwnTab("commandline_content", "show");
        _src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__.messageOwnTab("commandline_content", "focus");
        focus();
    }
}
/** @hidden
 * This is a bit loosely defined at the moment.
 * Should work so long as there's only one completion source per prefix.
 */
function getCompletion(args_only = false) {
    if (!commandline_state.activeCompletions)
        return undefined;
    for (const comp of commandline_state.activeCompletions) {
        if (comp.state === "normal" && comp.completion !== undefined) {
            return args_only ? comp.args : comp.completion;
        }
    }
}
commandline_state.getCompletion = getCompletion;
/** @hidden **/
function enableCompletions() {
    if (!commandline_state.activeCompletions) {
        commandline_state.activeCompletions = [
            // FindCompletionSource,
            _src_completions_Bindings__WEBPACK_IMPORTED_MODULE_2__.BindingsCompletionSource,
            _src_completions_Bmark__WEBPACK_IMPORTED_MODULE_3__.BmarkCompletionSource,
            _src_completions_TabAll__WEBPACK_IMPORTED_MODULE_16__.TabAllCompletionSource,
            _src_completions_Tab__WEBPACK_IMPORTED_MODULE_15__.BufferCompletionSource,
            _src_completions_Excmd__WEBPACK_IMPORTED_MODULE_5__.ExcmdCompletionSource,
            _src_completions_Theme__WEBPACK_IMPORTED_MODULE_17__.ThemeCompletionSource,
            _src_completions_Composite__WEBPACK_IMPORTED_MODULE_4__.CompositeCompletionSource,
            _src_completions_FileSystem__WEBPACK_IMPORTED_MODULE_7__.FileSystemCompletionSource,
            _src_completions_Guiset__WEBPACK_IMPORTED_MODULE_8__.GuisetCompletionSource,
            _src_completions_Help__WEBPACK_IMPORTED_MODULE_9__.HelpCompletionSource,
            _src_completions_Apropos__WEBPACK_IMPORTED_MODULE_1__.AproposCompletionSource,
            _src_completions_History__WEBPACK_IMPORTED_MODULE_10__.HistoryCompletionSource,
            _src_completions_Preferences__WEBPACK_IMPORTED_MODULE_11__.PreferenceCompletionSource,
            _src_completions_Rss__WEBPACK_IMPORTED_MODULE_12__.RssCompletionSource,
            _src_completions_Sessions__WEBPACK_IMPORTED_MODULE_13__.SessionsCompletionSource,
            _src_completions_Settings__WEBPACK_IMPORTED_MODULE_14__.SettingsCompletionSource,
            _src_completions_Window__WEBPACK_IMPORTED_MODULE_18__.WindowCompletionSource,
            _src_completions_Extensions__WEBPACK_IMPORTED_MODULE_6__.ExtensionsCompletionSource,
        ]
            .map(constructorr => {
            try {
                return new constructorr(commandline_state.completionsDiv);
            }
            catch (e) { }
        })
            .filter(c => c);
        const fragment = document.createDocumentFragment();
        commandline_state.activeCompletions.forEach(comp => fragment.appendChild(comp.node));
        commandline_state.completionsDiv.appendChild(fragment);
        logger.debug(commandline_state.activeCompletions);
    }
}
/* document.addEventListener("DOMContentLoaded", enableCompletions) */
/** @hidden **/
const noblur = () => setTimeout(() => commandline_state.clInput.focus(), 0);
/** @hidden **/
function focus() {
    commandline_state.clInput.focus();
    commandline_state.clInput.removeEventListener("blur", noblur);
    commandline_state.clInput.addEventListener("blur", noblur);
}
/** @hidden **/
let HISTORY_SEARCH_STRING;
/** @hidden
 * Command line keybindings
 **/
const keyParser = keys => _src_parsers_genericmode__WEBPACK_IMPORTED_MODULE_27__.parser("exmaps", keys);
/** @hidden **/
let history_called = false;
/** @hidden **/
let prev_cmd_called_history = false;
// Save programmer time by generating an immediately resolved promise
// eslint-disable-next-line @typescript-eslint/no-empty-function
const QUEUE = [(async () => { })()];
/** @hidden **/
commandline_state.clInput.addEventListener("keydown", function (keyevent) {
    if (!keyevent.isTrusted)
        return;
    commandline_state.keyEvents.push(keyevent);
    const response = keyParser(commandline_state.keyEvents);
    if (response.isMatch) {
        keyevent.preventDefault();
        keyevent.stopImmediatePropagation();
    }
    else {
        // Ideally, all keys that aren't explicitly bound to an ex command
        // should be bound to a "self-insert" command that would input the
        // key itself. Because it's not possible to generate events as if
        // they originated from the user, we can't do this, but we still
        // need to simulate it, in order to have history() work.
        prev_cmd_called_history = false;
    }
    if (response.value) {
        commandline_state.keyEvents = [];
        history_called = false;
        // If excmds start with 'ex.' they're coming back to us anyway, so skip that.
        // This is definitely a hack. Should expand aliases with exmode, etc.
        // but this whole thing should be scrapped soon, so whatever.
        if (response.value.startsWith("ex.")) {
            const [funcname, ...args] = response.value.slice(3).split(/\s+/);
            QUEUE[QUEUE.length - 1].then(() => {
                QUEUE.push(
                // Abuse async to wrap non-promises in a promise
                // eslint-disable-next-line @typescript-eslint/require-await
                (async () => commandline_state.fns[funcname](args.length === 0 ? undefined : args.join(" ")))());
                prev_cmd_called_history = history_called;
            });
        }
        else {
            // Send excmds directly to our own tab, which fixes the
            // old bug where a command would be issued in one tab but
            // land in another because the active tab had
            // changed. Background-mode excmds will be received by the
            // own tab's content script and then bounced through a
            // shim to the background, but the latency increase should
            // be acceptable becuase the background-mode excmds tend
            // to be a touch less latency-sensitive.
            _src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__.messageOwnTab("controller_content", "acceptExCmd", [
                response.value,
            ]).then(_ => (prev_cmd_called_history = history_called));
        }
    }
    else {
        commandline_state.keyEvents = response.keys;
    }
}, true);
function refresh_completions(exstr) {
    if (!commandline_state.activeCompletions)
        enableCompletions();
    return Promise.all(commandline_state.activeCompletions.map(comp => comp.filter(exstr).then(() => {
        if (comp.shouldRefresh()) {
            return resizeArea();
        }
    }))).catch(err => {
        console.error(err);
        return [];
    }); // We can't use the regular logging mechanism because the user is using the command line.
}
/** @hidden **/
let onInputPromise = Promise.resolve();
/** @hidden **/
commandline_state.clInput.addEventListener("input", () => {
    const exstr = commandline_state.clInput.value;
    _src_content_state_content__WEBPACK_IMPORTED_MODULE_19__.contentState.current_cmdline = exstr;
    _src_content_state_content__WEBPACK_IMPORTED_MODULE_19__.contentState.cmdline_filter = "";
    // Schedule completion computation. We do not start computing immediately because this would incur a slow down on quickly repeated input events (e.g. maintaining <Backspace> pressed)
    setTimeout(async () => {
        // Make sure the previous computation has ended
        await onInputPromise;
        // If we're not the current completion computation anymore, stop
        if (exstr !== commandline_state.clInput.value) {
            _src_content_state_content__WEBPACK_IMPORTED_MODULE_19__.contentState.cmdline_filter = exstr;
            return;
        }
        onInputPromise = refresh_completions(exstr);
        onInputPromise.then(() => {
            _src_content_state_content__WEBPACK_IMPORTED_MODULE_19__.contentState.cmdline_filter = exstr;
        });
    }, 100);
});
/** @hidden **/
let cmdline_history_current = "";
/** @hidden
 * Clears the command line.
 * If you intend to close the command line after this, set evlistener to true in order to enable losing focus.
 *  Otherwise, no need to pass an argument.
 */
function clear(evlistener = false) {
    if (evlistener)
        commandline_state.clInput.removeEventListener("blur", noblur);
    commandline_state.clInput.value = "";
    commandline_state.cmdline_history_position = 0;
    cmdline_history_current = "";
}
commandline_state.clear = clear;
/** @hidden **/
async function history(n) {
    history_called = true;
    if (!prev_cmd_called_history) {
        HISTORY_SEARCH_STRING = commandline_state.clInput.value;
    }
    // Check for matches in history, removing duplicates
    const matches = ramda__WEBPACK_IMPORTED_MODULE_30__.default(ramda__WEBPACK_IMPORTED_MODULE_31__.default(ramda__WEBPACK_IMPORTED_MODULE_30__.default(await _src_state__WEBPACK_IMPORTED_MODULE_29__.getAsync("cmdHistory")))).filter(key => key.startsWith(HISTORY_SEARCH_STRING));
    if (commandline_state.cmdline_history_position === 0) {
        cmdline_history_current = commandline_state.clInput.value;
    }
    let clamped_ind = matches.length + n - commandline_state.cmdline_history_position;
    clamped_ind = clamped_ind.clamp(0, matches.length);
    const pot_history = matches[clamped_ind];
    commandline_state.clInput.value =
        pot_history === undefined ? cmdline_history_current : pot_history;
    // if there was no clampage, update history position
    // there's a more sensible way of doing this but that would require more programmer time
    if (clamped_ind ===
        matches.length + n - commandline_state.cmdline_history_position)
        commandline_state.cmdline_history_position =
            commandline_state.cmdline_history_position - n;
}
commandline_state.history = history;
/** @hidden **/
function fillcmdline(newcommand, trailspace = true, ffocus = true) {
    if (trailspace)
        commandline_state.clInput.value = newcommand + " ";
    else
        commandline_state.clInput.value = newcommand;
    commandline_state.isVisible = true;
    let result = Promise.resolve([]);
    // Focus is lost for some reason.
    if (ffocus) {
        focus();
        result = refresh_completions(commandline_state.clInput.value);
    }
    return result;
}
/** @hidden **/
function getContent() {
    return commandline_state.clInput.value;
}
/** @hidden **/
function editor_function(fn_name, ...args) {
    let result = Promise.resolve([]);
    if (_src_lib_editor__WEBPACK_IMPORTED_MODULE_22__[fn_name]) {
        _src_lib_editor__WEBPACK_IMPORTED_MODULE_22__[fn_name](commandline_state.clInput, ...args);
        result = refresh_completions(commandline_state.clInput.value);
    }
    else {
        // The user is using the command line so we can't log message there
        // logger.error(`No editor function named ${fn_name}!`)
        console.error(`No editor function named ${fn_name}!`);
    }
    return result;
}
_src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__.addListener("commandline_frame", _src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__.attributeCaller(_src_commandline_frame__WEBPACK_IMPORTED_MODULE_0__));
commandline_state.fns = (0,_src_lib_commandline_cmds__WEBPACK_IMPORTED_MODULE_21__.getCommandlineFns)(commandline_state);
_src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__.addListener("commandline_cmd", _src_lib_messaging__WEBPACK_IMPORTED_MODULE_25__.attributeCaller(commandline_state.fns));
window.tri = Object.assign(window.tri || {}, {
    perfObserver: _src_perf__WEBPACK_IMPORTED_MODULE_28__.listenForCounters(),
});


/***/ }),

/***/ "./src/completions.ts":
/*!****************************!*\
  !*** ./src/completions.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DEFAULT_FAVICON": () => (/* binding */ DEFAULT_FAVICON),
/* harmony export */   "CompletionOption": () => (/* binding */ CompletionOption),
/* harmony export */   "CompletionSource": () => (/* binding */ CompletionSource),
/* harmony export */   "CompletionOptionHTML": () => (/* binding */ CompletionOptionHTML),
/* harmony export */   "CompletionSourceFuse": () => (/* binding */ CompletionSourceFuse)
/* harmony export */ });
/* harmony import */ var fuse_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fuse.js */ "./node_modules/fuse.js/dist/fuse.esm.js");
/* harmony import */ var _src_lib_itertools__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/itertools */ "./src/lib/itertools.ts");
/* harmony import */ var _src_lib_convert__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/convert */ "./src/lib/convert.ts");
/* harmony import */ var _src_lib_aliases__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/aliases */ "./src/lib/aliases.ts");
/* harmony import */ var _src_lib_patience__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @src/lib/patience */ "./src/lib/patience.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/*

Have an array of all completion sources. Completion sources display nothing if the filter doesn't match for them.

On each input event, call updateCompletions on the array. That will mutate the array and update the display as required.

How to handle cached e.g. buffer information going out of date?

Concrete completion classes have been moved to src/completions/.

*/






const DEFAULT_FAVICON = browser.runtime.getURL("static/defaultFavicon.svg");
class CompletionOption {
}
class CompletionSource {
    constructor(prefixes) {
        this.prefixes = [];
        const commands = _src_lib_aliases__WEBPACK_IMPORTED_MODULE_3__.getCmdAliasMapping();
        // Now, for each prefix given as argument, add it to the completionsource's prefix list and also add any alias it has
        prefixes
            .map(p => p.trim())
            .forEach(p => {
            this.prefixes.push(p);
            if (commands[p])
                this.prefixes = this.prefixes.concat(commands[p]);
        });
        // Not sure this is necessary but every completion source has it
        this.prefixes = this.prefixes.map(p => p + " ");
    }
    /** Control presentation of Source */
    set state(newstate) {
        switch (newstate) {
            case "normal":
                this.node.classList.remove("hidden");
                this.completion = undefined;
                break;
            case "hidden":
                this.node.classList.add("hidden");
                break;
        }
        this._prevState = this._state;
        this._state = newstate;
    }
    get state() {
        return this._state;
    }
    shouldRefresh() {
        // A completion source should be refreshed if it is not hidden or if it just became hidden
        return this._state !== "hidden" || this.state !== this._prevState;
    }
    prev(inc = 1) {
        return this.next(-1 * inc);
    }
    deselect() {
        this.completion = undefined;
        if (this.lastFocused !== undefined)
            this.lastFocused.state = "normal";
    }
}
// Default classes
class CompletionOptionHTML extends CompletionOption {
    constructor() {
        super(...arguments);
        this._state = "hidden";
    }
    /** Control presentation of element */
    set state(newstate) {
        // console.log("state from to", this._state, newstate)
        switch (newstate) {
            case "focused":
                this.html.classList.add("focused");
                this.html.classList.remove("hidden");
                const myRect = this.html.getClientRects()[0];
                if (myRect) {
                    const container = document.getElementById("completions");
                    const boxRect = container.getClientRects()[0];
                    if (myRect.bottom > boxRect.bottom)
                        this.html.scrollIntoView();
                    else if (myRect.top < boxRect.top)
                        this.html.scrollIntoView(false);
                }
                break;
            case "normal":
                this.html.classList.remove("focused");
                this.html.classList.remove("hidden");
                break;
            case "hidden":
                this.html.classList.remove("focused");
                this.html.classList.add("hidden");
                break;
        }
        this._state = newstate;
    }
    get state() {
        return this._state;
    }
}
class CompletionSourceFuse extends CompletionSource {
    constructor(prefixes, className, title) {
        super(prefixes);
        this.fuseOptions = {
            keys: ["fuseKeys"],
            shouldSort: true,
            includeScore: true,
            findAllMatches: true,
            ignoreLocation: true,
            ignoreFieldNorm: true,
            threshold: _src_lib_config__WEBPACK_IMPORTED_MODULE_5__.get("completionfuzziness"),
            minMatchCharLength: 1,
        };
        // PERF: Could be expensive not to cache Fuse()
        // yeah, it was.
        this.fuse = undefined;
        this.sortScoredOptions = false;
        this.optionContainer = html `<table class="optionContainer"></table>`;
        this.node = html `<div class="${className} hidden">
            <div class="sectionHeader">${title || className}</div>
        </div>`;
        this.node.appendChild(this.optionContainer);
        this.state = "hidden";
    }
    // Helpful default implementations
    async filter(exstr) {
        this.lastExstr = exstr;
        await this.onInput(exstr);
        return this.updateChain();
    }
    updateChain(exstr = this.lastExstr, options = this.options) {
        if (options === undefined) {
            this.state = "hidden";
            return;
        }
        const [prefix, query] = this.splitOnPrefix(exstr);
        // console.log(prefix, query, options)
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        // Filter by query if query is not empty
        if (query) {
            this.setStateFromScore(this.scoredOptions(query));
            // Else show all options
        }
        else {
            options.forEach(option => (option.state = "normal"));
        }
        // Call concrete class
        this.updateDisplay();
    }
    select(option) {
        if (this.lastExstr !== undefined && option !== undefined) {
            const [prefix] = this.splitOnPrefix(this.lastExstr);
            this.completion = prefix + option.value;
            this.args = option.value;
            option.state = "focused";
            this.lastFocused = option;
        }
        else {
            throw new Error("lastExstr and option must be defined!");
        }
    }
    splitOnPrefix(exstr) {
        for (const prefix of this.prefixes) {
            if (exstr.startsWith(prefix)) {
                const query = exstr.replace(prefix, "");
                return [prefix, query];
            }
        }
        return [undefined, undefined];
    }
    /** Rtn sorted array of {option, score} */
    scoredOptions(query) {
        const searchThis = this.options.map((elem, index) => ({
            index,
            fuseKeys: elem.fuseKeys,
        }));
        this.fuse = new fuse_js__WEBPACK_IMPORTED_MODULE_0__.default(searchThis, this.fuseOptions);
        return this.fuse.search(query).map(result => {
            // console.log(result, result.item, query)
            const index = (0,_src_lib_convert__WEBPACK_IMPORTED_MODULE_2__.toNumber)(result.item.index);
            return {
                index,
                option: this.options[index],
                score: result.score,
            };
        });
    }
    /** Set option state by score

        For now just displays all scored elements (see threshold in fuse) and
        focus the best match.
    */
    setStateFromScore(scoredOpts, autoselect = false) {
        const matches = scoredOpts.map(res => res.index);
        const hidden_options = [];
        for (const [index, option] of (0,_src_lib_itertools__WEBPACK_IMPORTED_MODULE_1__.enumerate)(this.options)) {
            if (matches.includes(index))
                option.state = "normal";
            else {
                option.state = "hidden";
                hidden_options.push(option);
            }
        }
        // ideally, this would not deselect anything unless it fell off the list of matches
        if (matches.length && autoselect) {
            this.select(this.options[matches[0]]);
        }
        else {
            this.deselect();
        }
        // sort this.options by score
        if (this.sortScoredOptions) {
            const sorted_options = matches.map(index => this.options[index]);
            this.options = sorted_options.concat(hidden_options);
        }
    }
    /** Call to replace the current display */
    // TODO: optionContainer.replaceWith and optionContainer.remove don't work.
    // I don't know why, but it means we can't replace the div in one go. Maybe
    // an iframe thing.
    updateDisplay() {
        /* const newContainer = html`<div>` */
        while (this.optionContainer.hasChildNodes()) {
            this.optionContainer.removeChild(this.optionContainer.lastChild);
        }
        for (const option of this.options) {
            /* newContainer.appendChild(option.html) */
            if (option.state !== "hidden")
                this.optionContainer.appendChild(option.html);
        }
        this.next(0);
        /* console.log('updateDisplay', this.optionContainer, newContainer) */
        /* let result1 = this.optionContainer.remove() */
        /* let res2 = this.node.appendChild(newContainer) */
        /* console.log('results', result1, res2) */
    }
    async next(inc = 1) {
        if (this.state !== "hidden") {
            // We're abusing `async` here to help us to catch errors in backoff
            // and to make it easier to return consistent types
            /* eslint-disable-next-line @typescript-eslint/require-await */
            return (0,_src_lib_patience__WEBPACK_IMPORTED_MODULE_4__.backoff)(async () => {
                const visopts = this.options.filter(o => o.state !== "hidden");
                const currind = visopts.findIndex(o => o.state === "focused");
                this.deselect();
                // visopts.length + 1 because we want an empty completion at the end
                const max = visopts.length + 1;
                const opt = visopts[(currind + inc + max) % max];
                if (opt)
                    this.select(opt);
                return true;
            });
        }
        else
            return false;
    }
    /* abstract onUpdate(query: string, prefix: string, options: CompletionOptionFuse[]) */
    // Lots of methods don't need this but some do
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars-experimental
    async onInput(exstr) { }
}
// }}}


/***/ }),

/***/ "./src/completions/Apropos.ts":
/*!************************************!*\
  !*** ./src/completions/Apropos.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AproposCompletionSource": () => (/* binding */ AproposCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/.metadata.generated */ "./src/.metadata.generated.ts");
/* harmony import */ var _src_lib_aliases__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/aliases */ "./src/lib/aliases.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");




class AproposCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(name, doc, flag) {
        super();
        this.name = name;
        this.fuseKeys = [];
        this.value = `${flag} ${name}`;
        this.html = html `<tr class="AproposCompletionOption option">
            <td class="name">${name}</td>
            <td class="doc">${doc}</td>
        </tr>`;
    }
}
class AproposCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["apropos"], "AproposCompletionSource", "Apropos");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        this.completion = undefined;
        const [prefix, query] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        const file = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__.everything.getFile("src/lib/config.ts");
        const default_config = file.getClass("default_config");
        const excmds = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__.everything.getFile("src/excmds.ts");
        const fns = excmds.getFunctions();
        const settings = _src_lib_config__WEBPACK_IMPORTED_MODULE_3__.get();
        const exaliases = settings.exaliases;
        const bindings = settings.nmaps;
        if (fns === undefined ||
            exaliases === undefined ||
            bindings === undefined) {
            return;
        }
        const flags = {
            "-a": (options, query) => options.concat(Object.keys(exaliases)
                .filter(alias => (alias +
                _src_lib_aliases__WEBPACK_IMPORTED_MODULE_2__.expandExstr(alias) +
                excmds.getFunction(_src_lib_aliases__WEBPACK_IMPORTED_MODULE_2__.expandExstr(alias)))
                .toLowerCase()
                .includes(query))
                .map(alias => {
                const cmd = _src_lib_aliases__WEBPACK_IMPORTED_MODULE_2__.expandExstr(alias);
                const doc = (excmds.getFunction(cmd) || {}).doc ||
                    "";
                return new AproposCompletionOption(alias, `Alias for \`${cmd}\`. ${doc}`, "-a");
            })),
            "-b": (options, query) => options.concat(Object.keys(bindings)
                .filter(binding => (binding + bindings[binding])
                .toLowerCase()
                .includes(query))
                .map(binding => new AproposCompletionOption(binding, `Normal mode binding for \`${bindings[binding]}\``, "-b"))),
            "-e": (options, query) => options.concat(fns
                .filter(([name, fn]) => !fn.hidden &&
                (name + fn.doc).toLowerCase().includes(query))
                .map(([name, fn]) => new AproposCompletionOption(name, `Excmd. ${fn.doc}`, "-e"))),
            "-s": (options, query) => options.concat(Object.keys(settings)
                .filter(x => (x + default_config.getMember(x).doc)
                .toLowerCase()
                .includes(query))
                .map(setting => {
                const member = default_config.getMember(setting);
                let doc = "";
                if (member !== undefined) {
                    doc = member.doc;
                }
                return new AproposCompletionOption(setting, `Setting. ${doc}`, "-s");
            })),
        };
        const args = query.split(" ");
        let opts = [];
        if (Object.keys(flags).includes(args[0])) {
            opts = flags[args[0]](opts, args.slice(1).join(" "));
        }
        else {
            opts = Object.keys(flags).reduce((acc, curFlag) => flags[curFlag](acc, query), []);
        }
        this.options = opts;
        this.options.sort((compopt1, compopt2) => compopt1.name.localeCompare(compopt2.name));
        return this.updateChain();
    }
    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"));
        // Call concrete class
        return this.updateDisplay();
    }
}


/***/ }),

/***/ "./src/completions/Bindings.ts":
/*!*************************************!*\
  !*** ./src/completions/Bindings.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BindingsCompletionSource": () => (/* binding */ BindingsCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_binding__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/binding */ "./src/lib/binding.ts");



class BindingsCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, binding) {
        super();
        this.value = value;
        this.fuseKeys = [];
        this.html = html `<tr class="BindingsCompletionOption option">
            <td class="name">${binding.name}</td>
            <td class="content">${binding.value}</td>
            <td class="type">${binding.mode}</td>
        </tr>`;
    }
}
class BindingsCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["bind", "unbind", "bindurl", "unbindurl", "reset", "reseturl"], "BindingsCompletionSource", "Bindings");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        let options = "";
        let [prefix, query] = this.splitOnPrefix(exstr);
        const args = query ? query.split(/\s+/) : [];
        let configName = "nmaps";
        let modeName = "normal";
        let urlPattern = null;
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        this.deselect();
        // url pattern is mandatory: bindurl, unbindurl, reseturl
        if (prefix.trim().endsWith("url")) {
            urlPattern = args.length > 0 ? args.shift() : "";
            options += urlPattern ? urlPattern + " " : "";
            if (args.length === 0) {
                const patterns = _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("subconfigs");
                this.options = Object.keys(patterns)
                    .filter(pattern => pattern.startsWith(urlPattern))
                    .sort()
                    .map(pattern => new BindingsCompletionOption(pattern, {
                    name: pattern,
                    value: "",
                    mode: "URL Pattern",
                }));
                return this.updateChain();
            }
        }
        // completion maps mode
        if (args.length === 1 && args[0].startsWith("--m")) {
            const margs = args[0].split("=");
            if ("--mode".includes(margs[0])) {
                const modeStr = margs.length > 1 ? margs[1] : "";
                this.options = _src_lib_binding__WEBPACK_IMPORTED_MODULE_2__.modes.filter(k => k.startsWith(modeStr))
                    .map(name => new BindingsCompletionOption(options + "--mode=" + name, {
                    name,
                    value: "",
                    mode: "Mode Name",
                }));
                return this.updateChain();
            }
        }
        if (args.length > 0 && args[0].startsWith("--mode=")) {
            const modeStr = args.shift();
            const mode = modeStr.replace("--mode=", "");
            modeName = mode;
            if (_src_lib_binding__WEBPACK_IMPORTED_MODULE_2__.maps2mode.has(mode + "maps")) {
                modeName = _src_lib_binding__WEBPACK_IMPORTED_MODULE_2__.maps2mode.get(mode + "maps");
            }
            configName = _src_lib_binding__WEBPACK_IMPORTED_MODULE_2__.mode2maps.get(modeName);
            options += `--mode=${modeName} `;
        }
        if (!configName) {
            this.options = [];
            return this.updateChain();
        }
        const bindings = urlPattern
            ? _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.getURL(urlPattern, [configName])
            : _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get(configName);
        if (bindings === undefined) {
            this.options = [];
            return this.updateChain();
        }
        query = args.join(" ").toLowerCase();
        this.options = Object.keys(bindings)
            .filter(x => x.toLowerCase().startsWith(query))
            .sort()
            .map(keystr => new BindingsCompletionOption(options + keystr + " " + bindings[keystr], {
            name: keystr,
            value: JSON.stringify(bindings[keystr]),
            mode: `${configName} (${modeName})`,
        }));
        return this.updateChain();
    }
    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"));
        // Call concrete class
        return this.updateDisplay();
    }
}


/***/ }),

/***/ "./src/completions/Bmark.ts":
/*!**********************************!*\
  !*** ./src/completions/Bmark.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BmarkCompletionSource": () => (/* binding */ BmarkCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_completions_providers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/completions/providers */ "./src/completions/providers.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");



class BmarkCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, bmark) {
        super();
        this.value = value;
        this.fuseKeys = [];
        if (!bmark.title) {
            bmark.title = new URL(bmark.url).host;
        }
        // Push properties we want to fuzmatch on
        this.fuseKeys.push(bmark.title, bmark.url);
        this.html = html `<tr class="BmarkCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="title">${bmark.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${bmark.url}
                    >${bmark.url}</a
                >
            </td>
        </tr>`;
    }
}
class BmarkCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["bmarks"], "BmarkCompletionSource", "Bookmarks");
        this._parent = _parent;
        this.shouldSetStateFromScore = true;
        this._parent.appendChild(this.node);
        this.sortScoredOptions = true;
        this.shouldSetStateFromScore =
            _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("completions", "Bmark", "autoselect") === "true";
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        let [prefix, query] = this.splitOnPrefix(exstr);
        let option = "";
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        if (query.startsWith("-t ")) {
            option = "-t ";
            query = query.slice(3);
        }
        if (query.startsWith("-c")) {
            const args = query.split(" ");
            option += args.slice(0, 2).join(" ");
            option += " ";
            query = args.slice(2).join(" ");
        }
        this.completion = undefined;
        this.options = (await _src_completions_providers__WEBPACK_IMPORTED_MODULE_1__.getBookmarks(query))
            .slice(0, 10)
            .map(page => new BmarkCompletionOption(option + page.url, page));
        this.lastExstr = prefix + query;
        return this.updateChain();
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore);
    }
    updateChain() {
        const query = this.splitOnPrefix(this.lastExstr)[1];
        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query));
        }
        else {
            this.options.forEach(option => (option.state = "normal"));
        }
        // Call concrete class
        return this.updateDisplay();
    }
    select(option) {
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = "bmarks " + option.value;
            option.state = "focused";
            this.lastFocused = option;
        }
        else {
            throw new Error("lastExstr and option must be defined!");
        }
    }
}


/***/ }),

/***/ "./src/completions/Composite.ts":
/*!**************************************!*\
  !*** ./src/completions/Composite.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CompositeCompletionSource": () => (/* binding */ CompositeCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_completions_Excmd__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/completions/Excmd */ "./src/completions/Excmd.ts");
/* harmony import */ var _src_metadata_generated__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/.metadata.generated */ "./src/.metadata.generated.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_aliases__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @src/lib/aliases */ "./src/lib/aliases.ts");





const PREFIX = "composite";
const regex = new RegExp("^" + PREFIX + " ");
// Most of this is copied verbatim from Excmd.ts - would have liked to inherit but constructor posed difficulties
class CompositeCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super([PREFIX], "CompositeCompletionSource", "ex commands");
        this._parent = _parent;
        this.updateOptions();
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        return this.onInput(exstr);
    }
    async onInput(exstr) {
        return this.updateOptions(exstr);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    updateChain(exstr = this.lastExstr, options = this.options) {
        if (this.options.length > 0)
            this.state = "normal";
        else
            this.state = "hidden";
        this.updateDisplay();
    }
    select(option) {
        this.completion =
            this.lastExstr.replace(new RegExp(this.getendexstr(this.lastExstr) + "$"), "") + option.value;
        option.state = "focused";
        this.lastFocused = option;
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, false);
    }
    async updateOptions(exstr = "") {
        const end_exstr = this.getendexstr(exstr);
        this.lastExstr = exstr;
        const [prefix] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        const excmds = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_2__.everything.getFile("src/excmds.ts");
        if (!excmds)
            return;
        const fns = excmds.getFunctions();
        // Add all excmds that start with exstr and that tridactyl has metadata about to completions
        this.options = this.scoreOptions(fns
            .filter(([name, fn]) => !fn.hidden && name.startsWith(end_exstr))
            .map(([name, fn]) => new _src_completions_Excmd__WEBPACK_IMPORTED_MODULE_1__.ExcmdCompletionOption(name, fn.doc)));
        // Also add aliases to possible completions
        const exaliases = Object.keys(_src_lib_config__WEBPACK_IMPORTED_MODULE_3__.get("exaliases")).filter(a => a.startsWith(end_exstr));
        for (const alias of exaliases) {
            const cmd = _src_lib_aliases__WEBPACK_IMPORTED_MODULE_4__.expandExstr(alias);
            const fn = excmds.getFunction(cmd);
            if (fn) {
                this.options.push(new _src_completions_Excmd__WEBPACK_IMPORTED_MODULE_1__.ExcmdCompletionOption(alias, `Alias for \`${cmd}\`. ${fn.doc}`));
            }
            else {
                // This can happen when the alias is a composite command or a command with arguments. We can't display doc because we don't know what parameter the alias takes or what it does.
                this.options.push(new _src_completions_Excmd__WEBPACK_IMPORTED_MODULE_1__.ExcmdCompletionOption(alias, `Alias for \`${cmd}\`.`));
            }
        }
        this.options.forEach(o => (o.state = "normal"));
        return this.updateChain();
    }
    scoreOptions(options) {
        return options.sort((o1, o2) => o1.value.localeCompare(o2.value));
    }
    getendexstr(exstr) {
        return exstr
            .replace(regex, "")
            .split("|")
            .slice(-1)[0]
            .split(";")
            .slice(-1)[0]
            .trim();
    }
}


/***/ }),

/***/ "./src/completions/Excmd.ts":
/*!**********************************!*\
  !*** ./src/completions/Excmd.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ExcmdCompletionOption": () => (/* binding */ ExcmdCompletionOption),
/* harmony export */   "ExcmdCompletionSource": () => (/* binding */ ExcmdCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/.metadata.generated */ "./src/.metadata.generated.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_aliases__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/aliases */ "./src/lib/aliases.ts");




class ExcmdCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, documentation = "") {
        super();
        this.value = value;
        this.documentation = documentation;
        this.fuseKeys = [];
        this.fuseKeys.push(this.value);
        // Create HTMLElement
        this.html = html `<tr class="ExcmdCompletionOption option">
            <td class="excmd">${value}</td>
            <td class="documentation">${documentation}</td>
        </tr>`;
    }
}
class ExcmdCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super([], "ExcmdCompletionSource", "ex commands");
        this._parent = _parent;
        this.updateOptions();
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        return this.onInput(exstr);
    }
    async onInput(exstr) {
        return this.updateOptions(exstr);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    updateChain(exstr = this.lastExstr, options = this.options) {
        if (this.options.length > 0)
            this.state = "normal";
        else
            this.state = "hidden";
        this.updateDisplay();
    }
    select(option) {
        this.completion = option.value;
        option.state = "focused";
        this.lastFocused = option;
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, false);
    }
    async updateOptions(exstr = "") {
        this.lastExstr = exstr;
        const excmds = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__.everything.getFile("src/excmds.ts");
        if (!excmds)
            return;
        const fns = excmds.getFunctions();
        // Add all excmds that start with exstr and that tridactyl has metadata about to completions
        this.options = this.scoreOptions(fns
            .filter(([name, fn]) => !fn.hidden && name.startsWith(exstr))
            .map(([name, fn]) => new ExcmdCompletionOption(name, fn.doc)));
        // Also narrow down aliases map to possible completions
        const exaliasesConfig = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("exaliases");
        const exaliases = Object.keys(exaliasesConfig)
            .filter(a => a.startsWith(exstr))
            .reduce((obj, key) => {
            obj[key] = exaliasesConfig[key];
            return obj;
        }, {});
        for (const alias of Object.keys(exaliases)) {
            const cmd = _src_lib_aliases__WEBPACK_IMPORTED_MODULE_3__.expandExstr(alias, exaliases);
            const fn = excmds.getFunction(cmd);
            if (fn) {
                this.options.push(new ExcmdCompletionOption(alias, `Alias for \`${cmd}\`. ${fn.doc}`));
            }
            else {
                // This can happen when the alias is a composite command or a command with arguments. We can't display doc because we don't know what parameter the alias takes or what it does.
                this.options.push(new ExcmdCompletionOption(alias, `Alias for \`${cmd}\`.`));
            }
        }
        // Add partial matched funcs like: 'conf' ~= 'viewconfig'
        const seen = new Set(this.options.map(o => o.value));
        const partial_options = this.scoreOptions(fns
            .filter(([name, fn]) => !fn.hidden && name.includes(exstr) && !seen.has(name))
            .map(([name, fn]) => new ExcmdCompletionOption(name, fn.doc)));
        this.options = this.options.concat(partial_options);
        this.options.forEach(o => (o.state = "normal"));
        return this.updateChain();
    }
    scoreOptions(options) {
        return options.sort((o1, o2) => o1.value.localeCompare(o2.value));
        // Too slow with large profiles
        // let histpos = state.cmdHistory.map(s => s.split(" ")[0]).reverse()
        // return exstrs.sort((a, b) => {
        //     let posa = histpos.findIndex(x => x == a)
        //     let posb = histpos.findIndex(x => x == b)
        //     // If two ex commands have the same position, sort lexically
        //     if (posa == posb) return a < b ? -1 : 1
        //     // If they aren't found in the list they get lower priority
        //     if (posa == -1) return 1
        //     if (posb == -1) return -1
        //     // Finally, sort by history position
        //     return posa < posb ? -1 : 1
        // })
    }
}


/***/ }),

/***/ "./src/completions/Extensions.ts":
/*!***************************************!*\
  !*** ./src/completions/Extensions.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ExtensionsCompletionSource": () => (/* binding */ ExtensionsCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_lib_extension_info__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/extension_info */ "./src/lib/extension_info.ts");
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");


class ExtensionsCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionOptionHTML {
    constructor(name, optionsUrl) {
        super();
        this.name = name;
        this.optionsUrl = optionsUrl;
        this.fuseKeys = [];
        this.fuseKeys.push(this.name);
        this.html = html `<tr class="option">
            <td class="title">${name}</td>
        </tr>`;
    }
}
class ExtensionsCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionSourceFuse {
    constructor(_parent) {
        super(["extoptions"], "ExtensionsCompletionSource", "Extension options");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        const [prefix, query] = this.splitOnPrefix(exstr);
        if (prefix) {
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        const extensions = await _src_lib_extension_info__WEBPACK_IMPORTED_MODULE_0__.listExtensions();
        this.options = this.scoreOptions(extensions
            .filter(extension => extension.name.startsWith(query))
            .map(extension => new ExtensionsCompletionOption(extension.name, extension.optionsUrl)));
        return this.updateChain();
    }
    updateChain() {
        this.options.forEach(option => (option.state = "normal"));
        return this.updateDisplay();
    }
    select(option) {
        this.completion = "extoptions " + option.name;
        option.state = "focused";
        this.lastFocused = option;
    }
    scoreOptions(options) {
        return options.sort((o1, o2) => o1.name.localeCompare(o2.name));
    }
}


/***/ }),

/***/ "./src/completions/FileSystem.ts":
/*!***************************************!*\
  !*** ./src/completions/FileSystem.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "FileSystemCompletionSource": () => (/* binding */ FileSystemCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_native__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/native */ "./src/lib/native.ts");


class FileSystemCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value) {
        super();
        this.value = value;
        this.fuseKeys = [];
        this.fuseKeys = [value];
        this.html = html `<tr class="FileSystemCompletionOption option">
            <td class="value">${value}</td>
        </tr>`;
    }
}
class FileSystemCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["saveas", "source", "js -s", "jsb -s"], "FileSystemCompletionSource", "FileSystem");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async onInput(exstr) {
        return this.filter(exstr);
    }
    async filter(exstr) {
        if (!exstr || exstr.indexOf(" ") === -1) {
            this.state = "hidden";
            return;
        }
        let [cmd, path] = this.splitOnPrefix(exstr);
        if (cmd === undefined) {
            this.state = "hidden";
            return;
        }
        if (!path)
            path = ".";
        if (!["/", "$", "~", "."].find(s => path.startsWith(s))) {
            // If the path doesn't start with a special character, it is relative to the native messenger, thus use "." as starting point
            // Does this work on windows?
            path = "./" + path;
        }
        // Update lastExstr because we modified the path and scoreOptions uses that in order to assign scores
        this.lastExstr = cmd + path;
        let req;
        try {
            req = await _src_lib_native__WEBPACK_IMPORTED_MODULE_1__.listDir(path);
        }
        catch (e) {
            // Failing silently because we can't nativegate (the user is typing stuff in the commandline)
            this.state = "hidden";
            return;
        }
        if (req.isDir) {
            if (!path.endsWith(req.sep))
                path += req.sep;
        }
        else {
            path = path.substring(0, path.lastIndexOf("/") + 1);
        }
        this.options = req.files.map(p => new FileSystemCompletionOption(path + p));
        this.state = "normal";
        return this.updateChain();
    }
}


/***/ }),

/***/ "./src/completions/Guiset.ts":
/*!***********************************!*\
  !*** ./src/completions/Guiset.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "GuisetCompletionSource": () => (/* binding */ GuisetCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_css_util__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/css_util */ "./src/lib/css_util.ts");


class GuisetCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, displayValue) {
        super();
        this.value = value;
        this.fuseKeys = [];
        this.fuseKeys.push(value);
        this.html = html `<tr class="GuisetCompletionOption option">
            <td class="value">${displayValue}</td>
        </tr>`;
    }
}
class GuisetCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["guiset", "guiset_quiet"], "GuisetCompletionSource", "Guiset");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        const [prefix, query] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        this.completion = undefined;
        let ruleName = "";
        let subRule = "";
        if (query) {
            const args = query.trim().split(" ");
            ruleName = args[0] || "";
            subRule = args[1] || "";
        }
        this.options = [];
        if (_src_lib_css_util__WEBPACK_IMPORTED_MODULE_1__.metaRules[ruleName]) {
            this.options = this.options.concat(Object.keys(_src_lib_css_util__WEBPACK_IMPORTED_MODULE_1__.metaRules[ruleName])
                .filter(s => s.startsWith(subRule))
                .map(s => new GuisetCompletionOption(`${ruleName} ${s}`, s)));
        }
        if (_src_lib_css_util__WEBPACK_IMPORTED_MODULE_1__.potentialRules[ruleName]) {
            this.options = this.options.concat(Object.keys(_src_lib_css_util__WEBPACK_IMPORTED_MODULE_1__.potentialRules[ruleName].options)
                .filter(s => s.startsWith(subRule))
                .map(s => new GuisetCompletionOption(`${ruleName} ${s}`, s)));
        }
        if (this.options.length === 0) {
            this.options = Object.keys(_src_lib_css_util__WEBPACK_IMPORTED_MODULE_1__.metaRules)
                .concat(Object.keys(_src_lib_css_util__WEBPACK_IMPORTED_MODULE_1__.potentialRules))
                .filter(s => s.startsWith(ruleName))
                .map(s => new GuisetCompletionOption(s, s));
        }
        return this.updateChain();
    }
    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"));
        // Call concrete class
        return this.updateDisplay();
    }
    onInput(arg) {
        return this.filter(arg);
    }
}


/***/ }),

/***/ "./src/completions/Help.ts":
/*!*********************************!*\
  !*** ./src/completions/Help.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "HelpCompletionSource": () => (/* binding */ HelpCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/.metadata.generated */ "./src/.metadata.generated.ts");
/* harmony import */ var _src_lib_aliases__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/aliases */ "./src/lib/aliases.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");




class HelpCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(name, doc, flag) {
        super();
        this.name = name;
        this.fuseKeys = [];
        this.value = `${flag} ${name}`;
        this.html = html `<tr class="HelpCompletionOption option">
            <td class="name">${name}</td>
            <td class="doc">${doc}</td>
        </tr>`;
    }
}
class HelpCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["help"], "HelpCompletionSource", "Help");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        this.completion = undefined;
        const [prefix, query] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        const file = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__.everything.getFile("src/lib/config.ts");
        const default_config = file.getClass("default_config");
        const excmds = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__.everything.getFile("src/excmds.ts");
        const fns = excmds.getFunctions();
        const settings = _src_lib_config__WEBPACK_IMPORTED_MODULE_3__.get();
        const exaliases = settings.exaliases;
        const bindings = settings.nmaps;
        if (fns === undefined ||
            exaliases === undefined ||
            bindings === undefined) {
            return;
        }
        const flags = {
            "-a": (options, query) => options.concat(Object.keys(exaliases)
                .filter(alias => alias.startsWith(query))
                .map(alias => {
                const cmd = _src_lib_aliases__WEBPACK_IMPORTED_MODULE_2__.expandExstr(alias);
                const doc = (excmds.getFunction(cmd) || {}).doc ||
                    "";
                return new HelpCompletionOption(alias, `Alias for \`${cmd}\`. ${doc}`, "-a");
            })),
            "-b": (options, query) => options.concat(Object.keys(bindings)
                .filter(binding => binding.startsWith(query))
                .map(binding => new HelpCompletionOption(binding, `Normal mode binding for \`${bindings[binding]}\``, "-b"))),
            "-e": (options, query) => options.concat(fns
                .filter(([name, fn]) => !fn.hidden && name.startsWith(query))
                .map(([name, fn]) => new HelpCompletionOption(name, `Excmd. ${fn.doc}`, "-e"))),
            "-s": (options, query) => options.concat(Object.keys(settings)
                .filter(x => x.startsWith(query))
                .map(setting => {
                const member = default_config.getMember(setting);
                let doc = "";
                if (member !== undefined) {
                    doc = member.doc;
                }
                return new HelpCompletionOption(setting, `Setting. ${doc}`, "-s");
            })),
        };
        const args = query.split(" ");
        let opts = [];
        if (Object.keys(flags).includes(args[0])) {
            opts = flags[args[0]](opts, args.slice(1).join(" "));
        }
        else {
            opts = Object.keys(flags).reduce((acc, curFlag) => flags[curFlag](acc, query), []);
        }
        this.options = opts;
        this.options.sort((compopt1, compopt2) => compopt1.name.localeCompare(compopt2.name));
        return this.updateChain();
    }
    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"));
        // Call concrete class
        return this.updateDisplay();
    }
}


/***/ }),

/***/ "./src/completions/History.ts":
/*!************************************!*\
  !*** ./src/completions/History.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "HistoryCompletionSource": () => (/* binding */ HistoryCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_completions_providers__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/completions/providers */ "./src/completions/providers.ts");



class HistoryCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, page) {
        super();
        this.value = value;
        this.fuseKeys = [];
        if (!page.title) {
            page.title = new URL(page.url).host;
        }
        // Push properties we want to fuzmatch on
        this.fuseKeys.push(page.title, page.url); // weight by page.visitCount
        // Create HTMLElement
        this.html = html `<tr class="HistoryCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="title">${page.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${page.url}>${page.url}</a>
            </td>
        </tr>`;
    }
}
class HistoryCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["open", "tabopen", "winopen"], "HistoryCompletionSource", "History and bookmarks");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        const prevStr = this.lastExstr;
        this.lastExstr = exstr;
        let [prefix, query] = this.splitOnPrefix(exstr);
        let options = "";
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        // Ignoring command-specific arguments
        // It's terrible but it's ok because it's just a stopgap until an actual commandline-parsing API is implemented
        if (prefix === "tabopen ") {
            if (query.startsWith("-c")) {
                const args = query.split(" ");
                options = args.slice(0, 2).join(" ");
                query = args.slice(2).join(" ");
            }
            if (query.startsWith("-b")) {
                const args = query.split(" ");
                options = args.slice(0, 1).join(" ");
                query = args.slice(1).join(" ");
            }
        }
        else if (prefix === "winopen " && query.startsWith("-private")) {
            options = "-private";
            query = query.substring(options.length);
        }
        options += options ? " " : "";
        // Options are pre-trimmed to the right length.
        // Typescript throws an error here - further investigation is probably warranted
        this.options = (await this.scoreOptions(query, _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("historyresults"))).map(page => new HistoryCompletionOption(options + page.url, page));
        // Deselect any selected, but remember what they were.
        const lastFocused = this.lastFocused;
        this.deselect();
        // Set initial state to normal, unless the option was selected a moment
        // ago, then reselect it so that users don't lose their selections.
        this.options.forEach(option => (option.state = "normal"));
        for (const option of this.options) {
            if (lastFocused !== undefined &&
                lastFocused.value === option.value &&
                prevStr.length <= exstr.length) {
                this.select(option);
                break;
            }
        }
        return this.updateDisplay();
    }
    // We don't need this inherited function
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    updateChain() { }
    async scoreOptions(query, n) {
        if (!query || _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("historyresults") === 0) {
            return (await _src_completions_providers__WEBPACK_IMPORTED_MODULE_2__.getTopSites()).slice(0, n);
        }
        else {
            return (await _src_completions_providers__WEBPACK_IMPORTED_MODULE_2__.getCombinedHistoryBmarks(query)).slice(0, n);
        }
    }
}


/***/ }),

/***/ "./src/completions/Preferences.ts":
/*!****************************************!*\
  !*** ./src/completions/Preferences.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PreferenceCompletionSource": () => (/* binding */ PreferenceCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_native__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/native */ "./src/lib/native.ts");


class PreferenceCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, prefvalue) {
        super();
        this.value = value;
        this.prefvalue = prefvalue;
        this.fuseKeys = [];
        this.fuseKeys.push(value);
        this.html = html `<tr class="PreferenceCompletionOption option">
            <td class="name">${value}</td>
            <td class="value">${prefvalue}</td>
        </tr>`;
    }
}
class PreferenceCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["setpref"], "PreferenceCompletionSource", "Preference");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    onInput(exstr) {
        return this.filter(exstr);
    }
    async filter(exstr) {
        if (!exstr) {
            this.state = "hidden";
            return;
        }
        const pref = this.splitOnPrefix(exstr)[1];
        if (pref === undefined) {
            this.state = "hidden";
            return;
        }
        this.lastExstr = exstr;
        const preferences = await _src_lib_native__WEBPACK_IMPORTED_MODULE_1__.getPrefs();
        this.options = Object.keys(preferences)
            .filter(key => key.startsWith(pref))
            .map(key => new PreferenceCompletionOption(key, preferences[key]));
        if (this.options.length > 0)
            this.state = "normal";
        return this.updateChain();
    }
}


/***/ }),

/***/ "./src/completions/Rss.ts":
/*!********************************!*\
  !*** ./src/completions/Rss.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "RssCompletionSource": () => (/* binding */ RssCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");



class RssCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionOptionHTML {
    constructor(url, title, type) {
        super();
        this.url = url;
        this.title = title;
        this.type = type;
        this.fuseKeys = [];
        this.value = `${url} ${type} ${title}`;
        this.fuseKeys.push(url);
        this.fuseKeys.push(title);
        this.html = html `<tr class="RssCompletionOption option">
            <td class="title">${title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${url}>${url}</a>
            </td>
            <td class="type">${type}</td>
        </tr>`;
    }
}
class RssCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionSourceFuse {
    constructor(_parent) {
        super(["rssexec"], "RssCompletionSource", "Feeds");
        this._parent = _parent;
        this.options = [];
        this.shouldSetStateFromScore = true;
        this.updateOptions();
        this.shouldSetStateFromScore =
            _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("completions", "Rss", "autoselect") === "true";
        this._parent.appendChild(this.node);
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore);
    }
    onInput(...whatever) {
        return this.updateOptions(...whatever);
    }
    async updateOptions(exstr = "") {
        this.lastExstr = exstr;
        const [prefix] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        if (this.options.length < 1) {
            this.options = (await _src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.messageOwnTab("excmd_content", "getRssLinks", [])).map(link => {
                const opt = new RssCompletionOption(link.url, link.title, link.type);
                opt.state = "normal";
                return opt;
            });
        }
        return this.updateChain();
    }
}


/***/ }),

/***/ "./src/completions/Sessions.ts":
/*!*************************************!*\
  !*** ./src/completions/Sessions.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "SessionsCompletionSource": () => (/* binding */ SessionsCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_lib_webext_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/webext.ts */ "./src/lib/webext.ts");
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");



function computeDate(session) {
    let howLong = Math.round((new Date() - session.lastModified) / 1000);
    let qualifier = "s";
    if (Math.abs(howLong) > 60) {
        qualifier = "m";
        howLong = Math.round(howLong / 60);
        if (Math.abs(howLong) > 60) {
            qualifier = "h";
            howLong = Math.round(howLong / 60);
            if (Math.abs(howLong) > 24) {
                qualifier = "d";
                howLong = Math.round(howLong / 24);
            }
        }
    }
    return [howLong, qualifier];
}
function getTabInfo(session) {
    let tab;
    let extraInfo;
    if (session.tab) {
        tab = session.tab;
        extraInfo = tab.url;
    }
    else {
        tab = session.window.tabs.sort((a, b) => b.lastAccessed - a.lastAccessed)[0];
        const tabCount = session.window.tabs.length;
        if (tabCount < 2) {
            extraInfo = tab.url;
        }
        else {
            extraInfo = `${tabCount - 1} more tab${tabCount > 2 ? "s" : ""}.`;
        }
    }
    return [tab, extraInfo];
}
class SessionCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionOptionHTML {
    constructor(session) {
        super();
        this.session = session;
        this.fuseKeys = [];
        this.value = (session.tab || session.window).sessionId;
        const [howLong, qualifier] = computeDate(session);
        const [tab, extraInfo] = getTabInfo(session);
        this.fuseKeys.push(tab.title);
        this.html = html `<tr class="SessionCompletionOption option">
            <td class="type">${session.tab ? "T" : "W"}</td>
            <td class="time">${howLong}${qualifier}</td>
            <td class="icon">
                <img src="${tab.favIconUrl || _src_completions__WEBPACK_IMPORTED_MODULE_1__.DEFAULT_FAVICON}" />
            </td>
            <td class="title">${tab.title}</td>
            <td class="extraInfo">${extraInfo}</td>
        </tr>`;
    }
}
class SessionsCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionSourceFuse {
    constructor(_parent) {
        super(["undo"], "SessionCompletionSource", "sessions");
        this._parent = _parent;
        this.shouldSetStateFromScore = true;
        this.updateOptions();
        this.shouldSetStateFromScore =
            _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("completions", "Sessions", "autoselect") === "true";
        this._parent.appendChild(this.node);
    }
    async onInput(exstr) {
        return this.updateOptions(exstr);
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore);
    }
    async updateOptions(exstr = "") {
        this.lastExstr = exstr;
        const [prefix] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        const sessions = await _src_lib_webext_ts__WEBPACK_IMPORTED_MODULE_0__.browserBg.sessions.getRecentlyClosed();
        this.options = sessions.map(s => new SessionCompletionOption(s));
    }
}


/***/ }),

/***/ "./src/completions/Settings.ts":
/*!*************************************!*\
  !*** ./src/completions/Settings.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "SettingsCompletionSource": () => (/* binding */ SettingsCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_metadata_generated__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/.metadata.generated */ "./src/.metadata.generated.ts");



class SettingsCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, setting) {
        super();
        this.value = value;
        this.fuseKeys = [];
        this.html = html `<tr class="SettingsCompletionOption option">
            <td class="title">${setting.name}</td>
            <td class="content">${setting.value}</td>
            <td class="type">${setting.type}</td>
            <td class="doc">${setting.doc}</td>
        </tr>`;
    }
}
class SettingsCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["set", "get", "unset", "seturl", "unseturl", "viewconfig"], "SettingsCompletionSource", "Settings");
        this._parent = _parent;
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        let [prefix, query] = this.splitOnPrefix(exstr);
        let options = "";
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        // Ignoring command-specific arguments
        // It's terrible but it's ok because it's just a stopgap until an actual commandline-parsing API is implemented
        // copy pasting code is fun and good
        if ((prefix === "seturl " || prefix === "unseturl ") || (prefix === "viewconfig " &&
            (query.startsWith("--user") || query.startsWith("--default")))) {
            const args = query.split(" ");
            options = args.slice(0, 1).join(" ");
            query = args.slice(1).join(" ");
        }
        options += options ? " " : "";
        const file = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_2__.everything.getFile("src/lib/config.ts");
        const default_config = file.getClass("default_config");
        const settings = _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get();
        if (default_config === undefined || settings === undefined) {
            return;
        }
        this.options = Object.keys(settings)
            .filter(x => x.startsWith(query))
            .sort()
            .map(setting => {
            const md = default_config.getMember(setting);
            let doc = "";
            let type = "";
            if (md !== undefined) {
                doc = md.doc;
                type = md.type.toString();
            }
            return new SettingsCompletionOption(options + setting, {
                name: setting,
                value: JSON.stringify(settings[setting]),
                doc,
                type,
            });
        });
        return this.updateChain();
    }
    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"));
        // Call concrete class
        return this.updateDisplay();
    }
}


/***/ }),

/***/ "./src/completions/Tab.ts":
/*!********************************!*\
  !*** ./src/completions/Tab.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BufferCompletionSource": () => (/* binding */ BufferCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_perf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/perf */ "./src/perf.ts");
/* harmony import */ var _src_lib_webext_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/webext.ts */ "./src/lib/webext.ts");
/* harmony import */ var _src_lib_itertools__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/itertools */ "./src/lib/itertools.ts");
/* harmony import */ var _src_lib_containers__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/containers */ "./src/lib/containers.ts");
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/differenceWith.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};








class BufferCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_4__.CompletionOptionHTML {
    constructor(value, tab, isAlternative = false, container) {
        super();
        this.value = value;
        this.isAlternative = isAlternative;
        this.fuseKeys = [];
        this.tabIndex = tab.index;
        this.tabId = tab.id;
        // Two character tab properties prefix
        let pre = "";
        if (tab.active)
            pre += "%";
        else if (isAlternative) {
            pre += "#";
            this.value = "#";
        }
        if (tab.pinned)
            pre += "@";
        // Push prefix before padding so we don't match on whitespace
        this.fuseKeys.push(pre);
        // Push properties we want to fuzmatch on
        this.fuseKeys.push(String(tab.index + 1), tab.title, tab.url);
        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : _src_completions__WEBPACK_IMPORTED_MODULE_4__.DEFAULT_FAVICON;
        const indicator = tab.audible
            ? String.fromCodePoint(0x1F50A)
            : "";
        this.html = html `<tr
            class="BufferCompletionOption option container_${container.color} container_${container.icon} container_${container.name}"
        >
            <td class="prefix">${pre.padEnd(2)}</td>
            <td class="container"></td>
            <td class="icon"><img loading="lazy" src="${favIconUrl}" /></td>
            <td class="title">${tab.index + 1}: ${indicator} ${tab.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${tab.url}>${tab.url}</a>
            </td>
        </tr>`;
    }
}
class BufferCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_4__.CompletionSourceFuse {
    // TODO:
    //     - store the exstr and trigger redraws on user or data input without
    //       callback faffery
    //     - sort out the element redrawing.
    constructor(_parent) {
        super(["tab", "tabclose", "tabdetach", "tabduplicate", "tabmove"], "BufferCompletionSource", "Tabs");
        this._parent = _parent;
        this.shouldSetStateFromScore = true;
        this.sortScoredOptions = true;
        this.shouldSetStateFromScore =
            _src_lib_config__WEBPACK_IMPORTED_MODULE_5__.get("completions", "Tab", "autoselect") === "true";
        this.updateOptions();
        this._parent.appendChild(this.node);
        _src_lib_messaging__WEBPACK_IMPORTED_MODULE_6__.addListener("tab_changes", () => this.reactToTabChanges());
    }
    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for tabs, but
        // will be for other things.
        return this.updateOptions(exstr);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        return this.onInput(exstr);
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore);
    }
    /** Score with fuse unless query is a single # or looks like a tab index */
    scoredOptions(query, options = this.options) {
        const args = query.trim().split(/\s+/gu);
        if (args.length === 1) {
            // if query is an integer n and |n| < options.length
            if (Number.isInteger(Number(args[0]))) {
                let index = Number(args[0]) - 1;
                if (Math.abs(index) < options.length) {
                    index = index.mod(options.length);
                    // options order might change by scored sorting
                    return this.TabscoredOptionsStartsWithN(index, options);
                }
            }
            else if (args[0] === "#") {
                for (const [index, option] of (0,_src_lib_itertools__WEBPACK_IMPORTED_MODULE_2__.enumerate)(options)) {
                    if (option.isAlternative) {
                        return [
                            {
                                index,
                                option,
                                score: 0,
                            },
                        ];
                    }
                }
            }
        }
        // If not yet returned...
        return super.scoredOptions(query);
    }
    /** Return the scoredOption[] result for the tab index startswith n */
    TabscoredOptionsStartsWithN(n, options) {
        const nstr = (n + 1).toString();
        const res = [];
        for (const [index, option] of (0,_src_lib_itertools__WEBPACK_IMPORTED_MODULE_2__.enumerate)(options)) {
            if ((option.tabIndex + 1).toString().startsWith(nstr)) {
                res.push({
                    index,
                    option,
                    score: 0,
                });
            }
        }
        // old input will change order: 12 => 123 => 12
        res.sort((a, b) => a.option.tabIndex - b.option.tabIndex);
        return res;
    }
    async fillOptions() {
        const tabs = await _src_lib_webext_ts__WEBPACK_IMPORTED_MODULE_1__.browserBg.tabs.query({
            currentWindow: true,
        });
        const options = [];
        // Get alternative tab, defined as last accessed tab.
        tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
        const alt = tabs[1];
        const useMruTabOrder = _src_lib_config__WEBPACK_IMPORTED_MODULE_5__.get("tabsort") === "mru";
        if (!useMruTabOrder) {
            tabs.sort((a, b) => a.index - b.index);
        }
        const container_all = await _src_lib_webext_ts__WEBPACK_IMPORTED_MODULE_1__.browserBg.contextualIdentities.query({});
        const container_map = new Map();
        container_all.forEach(elem => container_map.set(elem.cookieStoreId, elem));
        // firefox-default is not in contextualIdenetities
        container_map.set("firefox-default", _src_lib_containers__WEBPACK_IMPORTED_MODULE_3__.DefaultContainer);
        for (const tab of tabs) {
            let tab_container = container_map.get(tab.cookieStoreId);
            if (!tab_container) {
                tab_container = _src_lib_containers__WEBPACK_IMPORTED_MODULE_3__.DefaultContainer;
            }
            options.push(new BufferCompletionOption((tab.index + 1).toString(), tab, tab === alt, tab_container));
        }
        this.options = options;
    }
    // Eslint doesn't like this decorator but there's nothing we can do about it
    // eslint-disable-next-line @typescript-eslint/member-ordering
    async updateOptions(exstr = "") {
        this.lastExstr = exstr;
        const [prefix, query] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        // When the user is asking for tabmove completions, don't autoselect if the query looks like a relative move https://github.com/tridactyl/tridactyl/issues/825
        if (prefix === "tabmove")
            this.shouldSetStateFromScore = !/^[+-][0-9]+$/.exec(query);
        await this.fillOptions();
        this.completion = undefined;
        /* console.log('updateOptions', this.optionContainer) */
        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query));
        }
        else {
            this.options.forEach(option => (option.state = "normal"));
        }
        return this.updateDisplay();
    }
    /**
     * Update the list of possible tab options and select (focus on)
     * the appropriate option.
     */
    async reactToTabChanges() {
        const prevOptions = this.options;
        await this.updateOptions(this.lastExstr);
        if (!prevOptions || !this.options || !this.lastFocused)
            return;
        // Determine which option to focus on
        const diff = ramda__WEBPACK_IMPORTED_MODULE_7__.default((x, y) => x.tabId === y.tabId, prevOptions, this.options);
        const lastFocusedTabCompletion = this
            .lastFocused;
        // If the focused option was removed then focus on the next option
        if (diff.length === 1 &&
            diff[0].tabId === lastFocusedTabCompletion.tabId) {
            this.select(this.getTheNextTabOption(lastFocusedTabCompletion));
        }
    }
    /**
     * Gets the next option in this BufferCompletionSource assuming
     * that this BufferCompletionSource length has been reduced by 1
     */
    getTheNextTabOption(option) {
        if (option.tabIndex === this.options.length) {
            return this.options[this.options.length - 1];
        }
        return this.options[option.tabIndex];
    }
}
__decorate([
    _src_perf__WEBPACK_IMPORTED_MODULE_0__.measuredAsync
], BufferCompletionSource.prototype, "updateOptions", null);


/***/ }),

/***/ "./src/completions/TabAll.ts":
/*!***********************************!*\
  !*** ./src/completions/TabAll.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TabAllCompletionSource": () => (/* binding */ TabAllCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_perf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/perf */ "./src/perf.ts");
/* harmony import */ var _src_lib_webext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/webext */ "./src/lib/webext.ts");
/* harmony import */ var _src_lib_containers__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/containers */ "./src/lib/containers.ts");
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};






class TabAllCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_3__.CompletionOptionHTML {
    constructor(value, tab, winindex, container, incognito) {
        super();
        this.value = value;
        this.fuseKeys = [];
        this.value = `${winindex}.${tab.index + 1}`;
        this.fuseKeys.push(this.value, tab.title, tab.url);
        this.tab = tab;
        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : _src_completions__WEBPACK_IMPORTED_MODULE_3__.DEFAULT_FAVICON;
        this.html = html `<tr
            class="BufferAllCompletionOption option container_${container.color} container_${container.icon} container_${container.name} ${incognito
            ? "incognito"
            : ""}"
        >
            <td class="prefix"></td>
            <td class="privatewindow"></td>
            <td class="container"></td>
            <td class="icon"><img src="${favIconUrl}" /></td>
            <td class="title">${this.value}: ${tab.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${tab.url}>${tab.url}</a>
            </td>
        </tr>`;
    }
}
class TabAllCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_3__.CompletionSourceFuse {
    constructor(_parent) {
        super(["taball", "tabgrab"], "TabAllCompletionSource", "All Tabs");
        this._parent = _parent;
        this.shouldSetStateFromScore = true;
        this.updateOptions();
        this._parent.appendChild(this.node);
        this.shouldSetStateFromScore =
            _src_lib_config__WEBPACK_IMPORTED_MODULE_5__.get("completions", "TabAll", "autoselect") === "true";
        _src_lib_messaging__WEBPACK_IMPORTED_MODULE_4__.addListener("tab_changes", () => this.reactToTabChanges());
    }
    async onInput(exstr) {
        return this.updateOptions(exstr);
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore);
    }
    /**
     * Map all windows into a {[windowId]: window} object
     */
    async getWindows() {
        const windows = await _src_lib_webext__WEBPACK_IMPORTED_MODULE_1__.browserBg.windows.getAll();
        const response = {};
        windows.forEach(win => (response[win.id] = win));
        return response;
    }
    /**
     * Update the list of possible tab options and select (focus on)
     * the appropriate option.
     */
    async reactToTabChanges() {
        // const prevOptions = this.options
        await this.updateOptions(this.lastExstr);
        // TODO: update this from Tab.ts for TabAll.ts
        // if (!prevOptions || !this.options || !this.lastFocused) return
        // // Determine which option to focus on
        // const diff = R.differenceWith(
        //     (x, y) => x.tab.id === y.tab.id,
        //     prevOptions,
        //     this.options,
        // )
        // const lastFocusedTabCompletion = this
        //     .lastFocused as TabAllCompletionOption
        // // If the focused option was removed then focus on the next option
        // if (
        //    diff.length === 1 &&
        //    diff[0].tab.id === lastFocusedTabCompletion.tab.id
        // ) {
        //    //this.select(this.getTheNextTabOption(lastFocusedTabCompletion))
        // }
    }
    /**
     * Gets the next option in this BufferCompletionSource assuming
     * that this BufferCompletionSource length has been reduced by 1
     *
     * TODO: this ain't going to work, need to work out position based on win.tab
     */
    // private getTheNextTabOption(option: TabAllCompletionOption) {
    //     if (option.tab.index === this.options.length) {
    //         return this.options[this.options.length - 1]
    //     }
    //     return this.options[option.tab.index]
    // }
    // Eslint doesn't like this decorator but there's nothing we can do about it
    // eslint-disable-next-line @typescript-eslint/member-ordering
    async updateOptions(exstr = "") {
        this.lastExstr = exstr;
        const [prefix] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        const tabsPromise = _src_lib_webext__WEBPACK_IMPORTED_MODULE_1__.browserBg.tabs.query({});
        const windowsPromise = this.getWindows();
        const [tabs, windows] = await Promise.all([tabsPromise, windowsPromise]);
        const options = [];
        tabs.sort((a, b) => {
            if (a.windowId === b.windowId)
                return a.index - b.index;
            return a.windowId - b.windowId;
        });
        // Window Ids don't make sense so we're using LASTID and WININDEX to compute a window index
        // This relies on the fact that tabs are sorted by window ids
        let lastId = 0;
        let winindex = 0;
        for (const tab of tabs) {
            if (lastId !== tab.windowId) {
                lastId = tab.windowId;
                winindex += 1;
            }
            options.push(new TabAllCompletionOption(tab.id.toString(), tab, winindex, await _src_lib_containers__WEBPACK_IMPORTED_MODULE_2__.getFromId(tab.cookieStoreId), windows[tab.windowId].incognito));
        }
        this.completion = undefined;
        this.options = options;
        return this.updateChain();
    }
}
__decorate([
    _src_perf__WEBPACK_IMPORTED_MODULE_0__.measuredAsync
], TabAllCompletionSource.prototype, "updateOptions", null);


/***/ }),

/***/ "./src/completions/Theme.ts":
/*!**********************************!*\
  !*** ./src/completions/Theme.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ThemeCompletionOption": () => (/* binding */ ThemeCompletionOption),
/* harmony export */   "ThemeCompletionSource": () => (/* binding */ ThemeCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");
/* harmony import */ var _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/.metadata.generated */ "./src/.metadata.generated.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");



class ThemeCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionOptionHTML {
    constructor(value, documentation = "") {
        super();
        this.value = value;
        this.documentation = documentation;
        this.fuseKeys = [];
        this.fuseKeys.push(this.value);
        // Create HTMLElement
        this.html = html `<tr class="ThemeCompletionOption option">
            <td class="theme">${value}</td>
        </tr>`;
    }
}
class ThemeCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_0__.CompletionSourceFuse {
    constructor(_parent) {
        super(["set theme", "colourscheme"], "ThemeCompletionSource", "Themes");
        this._parent = _parent;
        this.updateOptions();
        this._parent.appendChild(this.node);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        return this.onInput(exstr);
    }
    async onInput(exstr) {
        return this.updateOptions(exstr);
    }
    setStateFromScore(scoredOpts) {
        super.setStateFromScore(scoredOpts, false);
    }
    async updateOptions(exstr = "") {
        this.lastExstr = exstr;
        const themes = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_1__.staticThemes.concat(Object.keys(await _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("customthemes")));
        const [prefix, query] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        // Add all excmds that start with exstr and that tridactyl has metadata about to completions
        this.options = this.scoreOptions(themes
            .filter(name => name.startsWith(query))
            .map(name => new ThemeCompletionOption(name)));
        this.options.forEach(o => (o.state = "normal"));
        return this.updateChain();
    }
    scoreOptions(options) {
        return options.sort((o1, o2) => o1.value.localeCompare(o2.value));
        // Too slow with large profiles
        // let histpos = state.cmdHistory.map(s => s.split(" ")[0]).reverse()
        // return exstrs.sort((a, b) => {
        //     let posa = histpos.findIndex(x => x == a)
        //     let posb = histpos.findIndex(x => x == b)
        //     // If two ex commands have the same position, sort lexically
        //     if (posa == posb) return a < b ? -1 : 1
        //     // If they aren't found in the list they get lower priority
        //     if (posa == -1) return 1
        //     if (posb == -1) return -1
        //     // Finally, sort by history position
        //     return posa < posb ? -1 : 1
        // })
    }
}


/***/ }),

/***/ "./src/completions/Window.ts":
/*!***********************************!*\
  !*** ./src/completions/Window.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "WindowCompletionSource": () => (/* binding */ WindowCompletionSource)
/* harmony export */ });
/* harmony import */ var _src_lib_webext_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/webext.ts */ "./src/lib/webext.ts");
/* harmony import */ var _src_completions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/completions */ "./src/completions.ts");


class WindowCompletionOption extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionOptionHTML {
    constructor(win) {
        super();
        this.fuseKeys = [];
        this.value = win.id;
        this.fuseKeys.push(`${win.title}`);
        this.fuseKeys.push(`${win.id}`);
        // Create HTMLElement
        this.html = html `<tr
            class="WindowCompletionOption option ${win.incognito
            ? "incognito"
            : ""}"
        >
            <td class="privatewindow"></td>
            <td class="prefix">${win.focused ? "%" : ""}</td>
            <td class="id">${win.id}</td>
            <td class="title">${win.title}</td>
            <td class="tabcount">
                ${win.tabs.length} tab${win.tabs.length !== 1 ? "s" : ""}
            </td>
        </tr>`;
    }
}
class WindowCompletionSource extends _src_completions__WEBPACK_IMPORTED_MODULE_1__.CompletionSourceFuse {
    constructor(_parent) {
        super(["tabpush", "winclose", "winmerge"], "WindowCompletionSource", "Windows");
        this._parent = _parent;
        this.updateOptions();
        this._parent.appendChild(this.node);
    }
    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for windows, but
        // will be for other things.
        return this.updateOptions(exstr);
    }
    async filter(exstr) {
        this.lastExstr = exstr;
        return this.onInput(exstr);
    }
    async updateOptions(exstr = "") {
        this.lastExstr = exstr;
        const [prefix] = this.splitOnPrefix(exstr);
        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal";
            }
        }
        else {
            this.state = "hidden";
            return;
        }
        this.options = (await _src_lib_webext_ts__WEBPACK_IMPORTED_MODULE_0__.browserBg.windows.getAll({ populate: true })).map(win => {
            const o = new WindowCompletionOption(win);
            o.state = "normal";
            return o;
        });
        return this.updateDisplay();
    }
}


/***/ }),

/***/ "./src/completions/providers.ts":
/*!**************************************!*\
  !*** ./src/completions/providers.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "newtaburl": () => (/* binding */ newtaburl),
/* harmony export */   "getBookmarks": () => (/* binding */ getBookmarks),
/* harmony export */   "getHistory": () => (/* binding */ getHistory),
/* harmony export */   "getTopSites": () => (/* binding */ getTopSites),
/* harmony export */   "getCombinedHistoryBmarks": () => (/* binding */ getCombinedHistoryBmarks)
/* harmony export */ });
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_webext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/webext */ "./src/lib/webext.ts");


function newtaburl() {
    // In the nonewtab version, this will return `null` and upset getURL.
    // Ternary op below prevents the runtime error.
    const newtab = browser.runtime.getManifest().chrome_url_overrides.newtab;
    return newtab !== null ? browser.runtime.getURL(newtab) : null;
}
async function getBookmarks(query) {
    // Search bookmarks, dedupe and sort by most recent.
    let bookmarks = await _src_lib_webext__WEBPACK_IMPORTED_MODULE_1__.browserBg.bookmarks.search({ query });
    // Remove folder nodes and bad URLs
    bookmarks = bookmarks.filter(b => {
        try {
            return new URL(b.url);
        }
        catch (e) {
            return false;
        }
    });
    bookmarks.sort((a, b) => b.dateAdded - a.dateAdded);
    // Remove duplicate bookmarks
    const seen = new Map();
    bookmarks = bookmarks.filter(b => {
        if (seen.get(b.title) === b.url)
            return false;
        else {
            seen.set(b.title, b.url);
            return true;
        }
    });
    return bookmarks;
}
function frecency(item) {
    // Doesn't actually care about recency yet.
    return item.visitCount * -1;
}
async function getHistory(query) {
    // Search history, dedupe and sort by frecency
    let history = await _src_lib_webext__WEBPACK_IMPORTED_MODULE_1__.browserBg.history.search({
        text: query,
        maxResults: _src_lib_config__WEBPACK_IMPORTED_MODULE_0__.get("historyresults"),
        startTime: 0,
    });
    // Remove entries with duplicate URLs
    const dedupe = new Map();
    for (const page of history) {
        if (page.url !== newtaburl()) {
            if (dedupe.has(page.url)) {
                if (dedupe.get(page.url).title.length < page.title.length) {
                    dedupe.set(page.url, page);
                }
            }
            else {
                dedupe.set(page.url, page);
            }
        }
    }
    history = [...dedupe.values()];
    history.sort((a, b) => frecency(a) - frecency(b));
    return history;
}
async function getTopSites() {
    return (await _src_lib_webext__WEBPACK_IMPORTED_MODULE_1__.browserBg.topSites.get()).filter(page => page.url !== newtaburl());
}
async function getCombinedHistoryBmarks(query) {
    const [history, bookmarks] = await Promise.all([
        getHistory(query),
        getBookmarks(query),
    ]);
    // Join records by URL, using the title from bookmarks by preference.
    const combinedMap = new Map(bookmarks.map(bmark => [
        bmark.url,
        { title: bmark.title, url: bmark.url, bmark },
    ]));
    history.forEach(page => {
        if (combinedMap.has(page.url))
            combinedMap.get(page.url).history = page;
        else
            combinedMap.set(page.url, {
                title: page.title,
                url: page.url,
                history: page,
            });
    });
    const score = x => (x.history ? frecency(x.history) : 0) -
        (x.bmark ? _src_lib_config__WEBPACK_IMPORTED_MODULE_0__.get("bmarkweight") : 0);
    return Array.from(combinedMap.values()).sort((a, b) => score(a) - score(b));
}


/***/ }),

/***/ "./src/content/state_content.ts":
/*!**************************************!*\
  !*** ./src/content/state_content.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PrevInput": () => (/* binding */ PrevInput),
/* harmony export */   "addContentStateChangedListener": () => (/* binding */ addContentStateChangedListener),
/* harmony export */   "contentState": () => (/* binding */ contentState)
/* harmony export */ });
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");

const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_0__.default("state");
class PrevInput {
}
class ContentState {
    constructor() {
        this.mode = "normal";
        this.suffix = "";
        this.current_cmdline = "";
        this.cmdline_filter = "";
    }
}
const onChangedListeners = [];
function addContentStateChangedListener(callback) {
    onChangedListeners.push(callback);
}
const contentState = new Proxy({ mode: "normal" }, {
    get(target, property) {
        return target[property];
    },
    set(target, property, newValue) {
        logger.debug("Content state changed!", property, newValue);
        const oldValue = target[property];
        const mode = target.mode;
        target[property] = newValue;
        for (const listener of onChangedListeners) {
            listener(property, mode, oldValue, newValue);
        }
        return true;
    },
});


/***/ }),

/***/ "./src/content/styling.ts":
/*!********************************!*\
  !*** ./src/content/styling.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "THEMES": () => (/* binding */ THEMES),
/* harmony export */   "theme": () => (/* binding */ theme)
/* harmony export */ });
/* harmony import */ var _src_metadata_generated__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/.metadata.generated */ "./src/.metadata.generated.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");
/* harmony import */ var _src_lib_webext__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/webext */ "./src/lib/webext.ts");




const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_2__.Logger("styling");
const THEMES = _src_metadata_generated__WEBPACK_IMPORTED_MODULE_0__.staticThemes;
function capitalise(str) {
    if (str === "")
        return str;
    return str[0].toUpperCase() + str.slice(1);
}
function prefixTheme(name) {
    return "TridactylTheme" + capitalise(name);
}
// At the moment elements are only ever `:root` and so this array and stuff is all a bit overdesigned.
const THEMED_ELEMENTS = [];
let insertedCSS = false;
const customCss = {
    allFrames: true,
    matchAboutBlank: true,
    code: "",
};
async function theme(element) {
    // Remove any old theme
    /**
     * DEPRECATED
     *
     * You don't need to add weird classnames to your themes any more, but you can if you want.
     *
     * Retained for backwards compatibility.
     **/
    for (const theme of THEMES.map(prefixTheme)) {
        element.classList.remove(theme);
    }
    // DEPRECATION ENDS
    if (insertedCSS) {
        // Typescript doesn't seem to be aware than remove/insertCSS's tabid
        // argument is optional
        await _src_lib_webext__WEBPACK_IMPORTED_MODULE_3__.browserBg.tabs.removeCSS(await (0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_3__.ownTabId)(), customCss);
        insertedCSS = false;
    }
    const newTheme = await _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.getAsync("theme");
    /**
     * DEPRECATED
     *
     * You don't need to add weird classnames to your themes any more, but you can if you want.
     *
     * Retained for backwards compatibility.
     **/
    if (newTheme !== "default") {
        element.classList.add(prefixTheme(newTheme));
    }
    // DEPRECATION ENDS
    // Insert custom css if needed
    if (newTheme !== "default") {
        customCss.code = THEMES.includes(newTheme)
            ? "@import url('" +
                browser.runtime.getURL("static/themes/" + newTheme + "/" + newTheme + ".css") +
                "');"
            : await _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.getAsync("customthemes", newTheme);
        if (customCss.code) {
            await _src_lib_webext__WEBPACK_IMPORTED_MODULE_3__.browserBg.tabs.insertCSS(await (0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_3__.ownTabId)(), customCss);
            insertedCSS = true;
        }
        else {
            logger.error("Theme " + newTheme + " couldn't be found.");
        }
    }
    // Record for re-theming
    // considering only elements :root (page and cmdline_iframe)
    // TODO:
    //     - Find ways to check if element is already pushed
    if (THEMED_ELEMENTS.length < 2 &&
        element.tagName.toUpperCase() === "HTML") {
        THEMED_ELEMENTS.push(element);
    }
}
function retheme() {
    THEMED_ELEMENTS.forEach(element => {
        theme(element).catch(e => {
            logger.warning(`Failed to retheme element "${element}". Error: ${e}`);
        });
    });
}
_src_lib_config__WEBPACK_IMPORTED_MODULE_1__.addChangeListener("theme", retheme);
/**
 * DEPRECATED
 *
 * You don't need to add weird classnames to your themes any more, but you can if you want.
 *
 * Retained for backwards compatibility.
 **/
// Sometimes pages will overwrite class names of elements. We use a MutationObserver to make sure that the HTML element always has a TridactylTheme class
// We can't just call theme() because it would first try to remove class names from the element, which would trigger the MutationObserver before we had a chance to add the theme class and thus cause infinite recursion
const cb = async (mutationList) => {
    const theme = await _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.getAsync("theme");
    mutationList
        .filter(m => m.target.className.search(prefixTheme("")) === -1)
        .forEach(m => m.target.classList.add(prefixTheme(theme)));
};
new MutationObserver(cb).observe(document.documentElement, {
    attributes: true,
    childList: false,
    characterData: false,
    subtree: false,
    attributeOldValue: false,
    attributeFilter: ["class"],
});
// DEPRECATION ENDS


/***/ }),

/***/ "./src/grammars/.bracketexpr.generated.ts":
/*!************************************************!*\
  !*** ./src/grammars/.bracketexpr.generated.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d) { return d[0]; }
;
;
;
;
const grammar = {
    Lexer: undefined,
    ParserRules: [
        { "name": "BracketExpr", "symbols": [{ "literal": "<" }, "Modifier", "ModKey", { "literal": ">" }], "postprocess": bexpr => bexpr.slice(1, -1) },
        { "name": "BracketExpr", "symbols": [{ "literal": "<" }, "Key", { "literal": ">" }], "postprocess": bexpr => [{}].concat(bexpr.slice(1, -1)) },
        { "name": "Modifier$ebnf$1", "symbols": [/[acmsACMS]/], "postprocess": id },
        { "name": "Modifier$ebnf$1", "symbols": [], "postprocess": () => null },
        { "name": "Modifier$ebnf$2", "symbols": [/[acmsACMS]/], "postprocess": id },
        { "name": "Modifier$ebnf$2", "symbols": [], "postprocess": () => null },
        { "name": "Modifier$ebnf$3", "symbols": [/[acmsACMS]/], "postprocess": id },
        { "name": "Modifier$ebnf$3", "symbols": [], "postprocess": () => null },
        { "name": "Modifier$ebnf$4", "symbols": [/[acmsACMS]/], "postprocess": id },
        { "name": "Modifier$ebnf$4", "symbols": [], "postprocess": () => null },
        { "name": "Modifier", "symbols": ["Modifier$ebnf$1", "Modifier$ebnf$2", "Modifier$ebnf$3", "Modifier$ebnf$4", { "literal": "-" }], "postprocess": 
            /** For each modifier present,
                add its long name as an attribute set to true to an object */
            (mods, _, reject) => {
                const longNames = new Map([
                    ["A", "altKey"],
                    ["C", "ctrlKey"],
                    ["M", "metaKey"],
                    ["S", "shiftKey"],
                ]);
                let modifiersObj = {};
                for (let mod of mods) {
                    if (mod === null || mod === "-")
                        continue;
                    let longName = longNames.get(mod.toUpperCase());
                    if (longName) {
                        // Reject if the same name is used twice.
                        if (longName in modifiersObj)
                            return reject;
                        else
                            modifiersObj[longName] = true;
                    }
                }
                return modifiersObj;
            }
        },
        { "name": "ModKey", "symbols": [{ "literal": "<" }], "postprocess": id },
        { "name": "ModKey", "symbols": [{ "literal": ">" }], "postprocess": id },
        { "name": "ModKey", "symbols": [{ "literal": "-" }], "postprocess": id },
        { "name": "ModKey", "symbols": ["Key"], "postprocess": id },
        { "name": "Key$ebnf$1", "symbols": [/[^\s<>-]/] },
        { "name": "Key$ebnf$1", "symbols": ["Key$ebnf$1", /[^\s<>-]/], "postprocess": (d) => d[0].concat([d[1]]) },
        { "name": "Key", "symbols": ["Key$ebnf$1"], "postprocess": (key) => key[0].join("") }
    ],
    ParserStart: "BracketExpr",
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (grammar);


/***/ }),

/***/ "./src/lib/aliases.ts":
/*!****************************!*\
  !*** ./src/lib/aliases.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "expandExstr": () => (/* binding */ expandExstr),
/* harmony export */   "getCmdAliasMapping": () => (/* binding */ getCmdAliasMapping)
/* harmony export */ });
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");

/**
 * Expands the alias in the provided exstr recursively. Does nothing if
 * the command is not aliased, including when the command is invalid.
 *
 * @param exstr :exstr typed by the user on the commantd line
 */
function expandExstr(exstr, aliases = _src_lib_config__WEBPACK_IMPORTED_MODULE_0__.get("exaliases"), prevExpansions = []) {
    // Split on whitespace
    const [command] = exstr.trim().split(/\s+/);
    // Base case: alias not found; return original command
    if (aliases[command] === undefined) {
        return exstr;
    }
    // Infinite loop detected
    if (prevExpansions.includes(command)) {
        throw new Error(`Infinite loop detected while expanding aliases. Stack: ${prevExpansions}.`);
    }
    // Add command to expansions used so far
    prevExpansions.push(command);
    // Alias exists; expand it recursively
    return expandExstr(exstr.replace(command, aliases[command]), aliases, prevExpansions);
}
/**
 * Get all aliases for all commands.
 *
 * @param aliases An object mapping aliases to commands
 * @return commands An object mapping commands to an array of aliases
 */
function getCmdAliasMapping(aliases = _src_lib_config__WEBPACK_IMPORTED_MODULE_0__.get("exaliases")) {
    const commands = {};
    // aliases look like this: {alias: command} but what we really need is this: {command: [alias1, alias2...]}
    // This is what this loop builds
    for (const alias of Object.keys(aliases)) {
        const cmd = expandExstr(alias, aliases).trim();
        if (!commands[cmd])
            commands[cmd] = [];
        commands[cmd].push(alias.trim());
    }
    return commands;
}


/***/ }),

/***/ "./src/lib/binding.ts":
/*!****************************!*\
  !*** ./src/lib/binding.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mode2maps": () => (/* binding */ mode2maps),
/* harmony export */   "maps2mode": () => (/* binding */ maps2mode),
/* harmony export */   "modes": () => (/* binding */ modes),
/* harmony export */   "modeMaps": () => (/* binding */ modeMaps),
/* harmony export */   "parse_bind_args": () => (/* binding */ parse_bind_args)
/* harmony export */ });
/* harmony import */ var _src_lib_keyseq__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/keyseq */ "./src/lib/keyseq.ts");
/** # Binding Functions
 *
 */

const mode2maps = new Map([
    ["normal", "nmaps"],
    ["ignore", "ignoremaps"],
    ["insert", "imaps"],
    ["input", "inputmaps"],
    ["ex", "exmaps"],
    ["hint", "hintmaps"],
    ["visual", "vmaps"],
    ["browser", "browsermaps"],
]);
const maps2mode = new Map(Array.from(mode2maps.keys()).map(k => [mode2maps.get(k), k]));
const modes = Array.from(mode2maps.keys());
const modeMaps = Array.from(maps2mode.keys());
function parse_bind_args(...args) {
    if (args.length === 0)
        throw new Error("Invalid bind/unbind arguments.");
    const result = {};
    result.mode = "normal";
    if (args[0].startsWith("--mode=")) {
        result.mode = args.shift().replace("--mode=", "");
    }
    if (!mode2maps.has(result.mode)) {
        result.configName = result.mode + "maps";
    }
    else {
        result.configName = mode2maps.get(result.mode);
    }
    const key = args.shift();
    // Convert key to internal representation
    const keyseq = (0,_src_lib_keyseq__WEBPACK_IMPORTED_MODULE_0__.mapstrToKeyseq)(key);
    result.key = keyseq.map(k => k.toMapstr()).join("");
    result.excmd = args.join(" ");
    return result;
}


/***/ }),

/***/ "./src/lib/browser_proxy.ts":
/*!**********************************!*\
  !*** ./src/lib/browser_proxy.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");

const browserProxy = new Proxy(Object.create(null), {
    get(target, api) {
        return new Proxy({}, {
            get(_, func) {
                return (...args) => (0,_src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.message)("browser_proxy_background", "shim", api, func, args);
            },
        });
    },
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (browserProxy);


/***/ }),

/***/ "./src/lib/commandline_cmds.ts":
/*!*************************************!*\
  !*** ./src/lib/commandline_cmds.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getCommandlineFns": () => (/* binding */ getCommandlineFns)
/* harmony export */ });
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");
/* harmony import */ var _src_state__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/state */ "./src/state.ts");
/* harmony import */ var _src_content_state_content__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/content/state_content */ "./src/content/state_content.ts");



const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function awaitProxyEq(proxy, a, b) {
    let counter = 0;
    while (proxy[a] != proxy[b] && counter < 50) {
        await sleep(10);
        counter += 1;
    }
    return proxy[a] == proxy[b];
}
// One day we'll use typeof commandline_state from commandline_frame.ts
function getCommandlineFns(cmdline_state) {
    return {
        /**
         * Insert the first command line history line that starts with the content of the command line in the command line.
         */
        complete: async () => {
            const fragment = cmdline_state.clInput.value;
            const matches = (await _src_state__WEBPACK_IMPORTED_MODULE_1__.getAsync("cmdHistory")).filter(key => key.startsWith(fragment));
            const mostrecent = matches[matches.length - 1];
            if (mostrecent !== undefined)
                cmdline_state.clInput.value = mostrecent;
            return cmdline_state.refresh_completions(cmdline_state.clInput.value);
        },
        /**
         * Selects the next completion.
         */
        next_completion: async () => {
            await awaitProxyEq(_src_content_state_content__WEBPACK_IMPORTED_MODULE_2__.contentState, "current_cmdline", "cmdline_filter");
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => comp.next());
        },
        /**
         * Selects the previous completion.
         */
        prev_completion: async () => {
            await awaitProxyEq(_src_content_state_content__WEBPACK_IMPORTED_MODULE_2__.contentState, "current_cmdline", "cmdline_filter");
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => comp.prev());
        },
        /**
         * Deselects the currently selected completion.
         */
        deselect_completion: () => {
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => comp.deselect());
        },
        /**
         * Inserts the currently selected completion and a space in the command line.
         */
        insert_completion: async () => {
            await awaitProxyEq(_src_content_state_content__WEBPACK_IMPORTED_MODULE_2__.contentState, "current_cmdline", "cmdline_filter");
            const command = cmdline_state.getCompletion();
            if (cmdline_state.activeCompletions) {
                cmdline_state.activeCompletions.forEach(comp => (comp.completion = undefined));
            }
            let result = Promise.resolve([]);
            if (command) {
                cmdline_state.clInput.value = command + " ";
                result = cmdline_state.refresh_completions(cmdline_state.clInput.value);
            }
            return result;
        },
        /**
         * If a completion is selected, inserts it in the command line with a space.
         * If no completion is selected, inserts a space where the caret is.
         */
        insert_space_or_completion: () => {
            const command = cmdline_state.getCompletion();
            if (cmdline_state.activeCompletions) {
                cmdline_state.activeCompletions.forEach(comp => (comp.completion = undefined));
            }
            if (command) {
                cmdline_state.clInput.value = command + " ";
            }
            else {
                const selectionStart = cmdline_state.clInput.selectionStart;
                const selectionEnd = cmdline_state.clInput.selectionEnd;
                cmdline_state.clInput.value =
                    cmdline_state.clInput.value.substring(0, selectionStart) +
                        " " +
                        cmdline_state.clInput.value.substring(selectionEnd);
                cmdline_state.clInput.selectionStart = cmdline_state.clInput.selectionEnd =
                    selectionStart + 1;
            }
            return cmdline_state.refresh_completions(cmdline_state.clInput.value);
        },
        /** Hide the command line and cmdline_state.clear its content without executing it. **/
        hide_and_clear: () => {
            cmdline_state.clear(true);
            cmdline_state.keyEvents = [];
            // Try to make the close cmdline animation as smooth as possible.
            (0,_src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.messageOwnTab)("commandline_content", "hide");
            (0,_src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.messageOwnTab)("commandline_content", "blur");
            // Delete all completion sources - I don't think this is required, but this
            // way if there is a transient bug in completions it shouldn't persist.
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => cmdline_state.completionsDiv.removeChild(comp.node));
            cmdline_state.activeCompletions = undefined;
            cmdline_state.isVisible = false;
        },
        /**
         * Check if the command is valid
         */
        is_valid_commandline: (command) => {
            if (command === undefined)
                return false;
            const func = command.trim().split(/\s+/)[0];
            if (func.length === 0 || func.startsWith("#")) {
                return false;
            }
            return true;
        },
        /**
         * Save non-secret commands to the cmdHistory and update the cmdline_history_position
         */
        store_ex_string: (command) => {
            const [func, ...args] = command.trim().split(/\s+/);
            // Save non-secret commandlines to the history.
            if (!browser.extension.inIncognitoContext &&
                !(func === "winopen" && args[0] === "-private")) {
                _src_state__WEBPACK_IMPORTED_MODULE_1__.getAsync("cmdHistory").then(c => {
                    cmdline_state.state.cmdHistory = c.concat([command]);
                });
                cmdline_state.cmdline_history_position = 0;
            }
        },
        /**
         * Selects the next history line.
         */
        next_history: () => cmdline_state.history(1),
        /**
         * Selects the prev history line.
         */
        prev_history: () => cmdline_state.history(-1),
        /**
         * Execute the content of the command line and hide it.
         **/
        accept_line: async () => {
            await awaitProxyEq(_src_content_state_content__WEBPACK_IMPORTED_MODULE_2__.contentState, "current_cmdline", "cmdline_filter");
            const command = cmdline_state.getCompletion() || cmdline_state.clInput.value;
            cmdline_state.fns.hide_and_clear();
            if (cmdline_state.fns.is_valid_commandline(command) === false)
                return;
            cmdline_state.fns.store_ex_string(command);
            // Send excmds directly to our own tab, which fixes the
            // old bug where a command would be issued in one tab but
            // land in another because the active tab had
            // changed. Background-mode excmds will be received by the
            // own tab's content script and then bounced through a
            // shim to the background, but the latency increase should
            // be acceptable becuase the background-mode excmds tend
            // to be a touch less latency-sensitive.
            return (0,_src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.messageOwnTab)("controller_content", "acceptExCmd", [command]);
        },
        execute_ex_on_completion_args: (excmd) => execute_ex_on_x(true, cmdline_state, excmd),
        execute_ex_on_completion: (excmd) => execute_ex_on_x(false, cmdline_state, excmd),
        copy_completion: () => {
            const command = cmdline_state.getCompletion();
            cmdline_state.fns.hide_and_clear();
            return (0,_src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.messageOwnTab)("controller_content", "acceptExCmd", [
                "clipboard yank " + command,
            ]);
        },
    };
}
function execute_ex_on_x(args_only, cmdline_state, excmd) {
    const args = cmdline_state.getCompletion(args_only) || cmdline_state.clInput.value;
    const cmdToExec = (excmd ? excmd + " " : "") + args;
    cmdline_state.fns.store_ex_string(cmdToExec);
    return (0,_src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.messageOwnTab)("controller_content", "acceptExCmd", [cmdToExec]);
}


/***/ }),

/***/ "./src/lib/config.ts":
/*!***************************!*\
  !*** ./src/lib/config.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "INITIALISED": () => (/* binding */ INITIALISED),
/* harmony export */   "o": () => (/* binding */ o),
/* harmony export */   "USERCONFIG": () => (/* binding */ USERCONFIG),
/* harmony export */   "default_config": () => (/* binding */ default_config),
/* harmony export */   "mergeDeepCull": () => (/* binding */ mergeDeepCull),
/* harmony export */   "DEFAULTS": () => (/* binding */ DEFAULTS),
/* harmony export */   "getDeepProperty": () => (/* binding */ getDeepProperty),
/* harmony export */   "mergeDeep": () => (/* binding */ mergeDeep),
/* harmony export */   "getURL": () => (/* binding */ getURL),
/* harmony export */   "get": () => (/* binding */ get),
/* harmony export */   "getDynamic": () => (/* binding */ getDynamic),
/* harmony export */   "getAsyncDynamic": () => (/* binding */ getAsyncDynamic),
/* harmony export */   "getAsync": () => (/* binding */ getAsync),
/* harmony export */   "push": () => (/* binding */ push),
/* harmony export */   "pull": () => (/* binding */ pull),
/* harmony export */   "setURL": () => (/* binding */ setURL),
/* harmony export */   "set": () => (/* binding */ set),
/* harmony export */   "unsetURL": () => (/* binding */ unsetURL),
/* harmony export */   "unset": () => (/* binding */ unset),
/* harmony export */   "save": () => (/* binding */ save),
/* harmony export */   "update": () => (/* binding */ update),
/* harmony export */   "addChangeListener": () => (/* binding */ addChangeListener),
/* harmony export */   "removeChangeListener": () => (/* binding */ removeChangeListener),
/* harmony export */   "parseConfig": () => (/* binding */ parseConfig)
/* harmony export */ });
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/when.js");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/is.js");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/pipe.js");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/reject.js");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/map.js");
/* harmony import */ var _src_lib_binding__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/binding */ "./src/lib/binding.ts");
/* harmony import */ var _src_lib_platform__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/platform */ "./src/lib/platform.ts");
// Sketch
//
// Need an easy way of getting and setting settings
// If a setting is not set, the default should probably be returned.
// That probably means that binds etc. should be per-key?
//
// We should probably store all settings in memory, and only load from storage on startup and when we set it
//
// Really, we'd like a way of just letting things use the variables
//
/** # Tridactyl Configuration
 *
 * We very strongly recommend that you pretty much ignore this page and instead follow the link below DEFAULTS that will take you to our own source code which is formatted in a marginally more sane fashion.
 *
 * Intrepid Tridactyl users: this page is how Tridactyl arranges and manages its settings internally. To view your own settings, use `:viewconfig` and `:viewconfig --user`. To understand how to set settings, see `:help set`.
 *
 */



/* Remove all nulls from objects recursively
 * NB: also applies to arrays
 */
const removeNull = ramda__WEBPACK_IMPORTED_MODULE_2__.default(ramda__WEBPACK_IMPORTED_MODULE_3__.default(Object), ramda__WEBPACK_IMPORTED_MODULE_4__.default(
// Ramda gives an error here without the any
ramda__WEBPACK_IMPORTED_MODULE_5__.default(val => val === null), ramda__WEBPACK_IMPORTED_MODULE_6__.default(a => removeNull(a))));
/** @hidden */
const CONFIGNAME = "userconfig";
/** @hidden */
const WAITERS = [];
/** @hidden */
let INITIALISED = false;
/** @hidden */
// make a naked object
function o(object) {
    return Object.assign(Object.create(null), object);
}
/** @hidden */
// "Import" is a reserved word so this will have to do
function schlepp(settings) {
    Object.assign(USERCONFIG, settings);
}
/** @hidden */
let USERCONFIG = o({});
/**
 * This is the default configuration that Tridactyl comes with.
 *
 * You can change anything here using `set key1.key2.key3 value` or specific things any of the various helper commands such as `bind` or `command`. You can also jump to the help section of a setting using `:help $settingname`. Some of the settings have an input field containing their current value. You can modify these values and save them by pressing `<Enter>` but using `:set $setting $value` is a good habit to take as it doesn't force you to leave the page you're visiting to change your settings.
 *
 * If the setting you are changing has a dot or period character (.) in it, it cannot be set with `:set` directly. You must either use a helper command for that specific setting - e.g. `:seturl` or `:autocontain`, or you must use Tridactyl's JavaScript API with `:js tri.config.set("path", "to", "key", "value")` to set `{path: {to: {key: value}}}`.
 *
 */
class default_config {
    constructor() {
        /**
         * Internal version number Tridactyl uses to know whether it needs to update from old versions of the configuration.
         *
         * Changing this might do weird stuff.
         */
        this.configversion = "0.0";
        /**
         * Internal field to handle site-specific configs. Use :seturl/:unseturl to change these values.
         */
        this.subconfigs = {
            "www.google.com": {
                followpagepatterns: {
                    next: "Next",
                    prev: "Previous",
                },
            },
            "^https://web.whatsapp.com": {
                nmaps: {
                    f: "hint -c [tabindex]:not(.two)>div,a",
                    F: "hint -bc [tabindex]:not(.two)>div,a",
                },
            },
        };
        /**
         * Internal field to handle site-specific config priorities. Use :seturl/:unseturl to change this value.
         */
        this.priority = 0;
        // Note to developers: When creating new <modifier-letter> maps, make sure to make the modifier uppercase (e.g. <C-a> instead of <c-a>) otherwise some commands might not be able to find them (e.g. `bind <c-a>`)
        /**
         * exmaps contains all of the bindings for the command line.
         * You can of course bind regular ex commands but also [editor functions](/static/docs/modules/_src_lib_editor_.html) and [commandline-specific functions](/static/docs/modules/_src_commandline_frame_.html).
         */
        this.exmaps = {
            "<Enter>": "ex.accept_line",
            "<C-Enter>": "ex.execute_ex_on_completion",
            "<C-j>": "ex.accept_line",
            "<C-m>": "ex.accept_line",
            "<Escape>": "ex.hide_and_clear",
            "<C-[>": "ex.hide_and_clear",
            "<ArrowUp>": "ex.prev_history",
            "<ArrowDown>": "ex.next_history",
            "<S-Del>": "ex.execute_ex_on_completion_args tabclose",
            "<A-b>": "text.backward_word",
            "<A-f>": "text.forward_word",
            "<C-e>": "text.end_of_line",
            "<A-d>": "text.kill_word",
            "<S-Backspace>": "text.backward_kill_word",
            "<C-u>": "text.backward_kill_line",
            "<C-k>": "text.kill_line",
            "<C-f>": "ex.complete",
            "<Tab>": "ex.next_completion",
            "<S-Tab>": "ex.prev_completion",
            "<Space>": "ex.insert_space_or_completion",
            "<C-o>yy": "ex.execute_ex_on_completion_args clipboard yank",
        };
        /**
         * ignoremaps contain all of the bindings for "ignore mode".
         *
         * They consist of key sequences mapped to ex commands.
         */
        this.ignoremaps = {
            "<S-Insert>": "mode normal",
            "<AC-Escape>": "mode normal",
            "<AC-`>": "mode normal",
            "<S-Escape>": "mode normal",
            "<C-o>": "nmode normal 1 mode ignore",
        };
        /**
         * imaps contain all of the bindings for "insert mode".
         *
         * On top of regular ex commands, you can also bind [editor functions](/static/docs/modules/_src_lib_editor_.html) in insert mode.
         *
         * They consist of key sequences mapped to ex commands.
         */
        this.imaps = {
            "<Escape>": "composite unfocus | mode normal",
            "<C-[>": "composite unfocus | mode normal",
            "<C-i>": "editor",
            "<AC-Escape>": "mode normal",
            "<AC-`>": "mode normal",
            "<S-Escape>": "mode ignore",
        };
        /**
         * inputmaps contain all of the bindings for "input mode".
         *
         * On top of regular ex commands, you can also bind [editor functions](/static/docs/modules/_src_lib_editor_.html) in input mode.
         *
         * They consist of key sequences mapped to ex commands.
         */
        this.inputmaps = {
            "<Tab>": "focusinput -n",
            "<S-Tab>": "focusinput -N",
            /**
             * Config objects with this key inherit their keys from the object specified.
             *
             * Only supports "root" objects. Subconfigs (`seturl`) work as expected.
             *
             * Here, this means that input mode is the same as insert mode except it has added binds for tab and shift-tab.
             */
            "🕷🕷INHERITS🕷🕷": "imaps",
        };
        /**
         * nmaps contain all of the bindings for "normal mode".
         *
         * They consist of key sequences mapped to ex commands.
         */
        this.nmaps = {
            "<A-p>": "pin",
            "<A-m>": "mute toggle",
            "<F1>": "help",
            o: "fillcmdline open",
            O: "current_url open",
            w: "fillcmdline winopen",
            W: "current_url winopen",
            t: "fillcmdline tabopen",
            "]]": "followpage next",
            "[[": "followpage prev",
            "[c": "urlincrement -1",
            "]c": "urlincrement 1",
            "<C-x>": "urlincrement -1",
            "<C-a>": "urlincrement 1",
            T: "current_url tabopen",
            yy: "clipboard yank",
            ys: "clipboard yankshort",
            yc: "clipboard yankcanon",
            ym: "clipboard yankmd",
            yo: "clipboard yankorg",
            yt: "clipboard yanktitle",
            gh: "home",
            gH: "home true",
            p: "clipboard open",
            P: "clipboard tabopen",
            j: "scrollline 10",
            "<C-e>": "scrollline 10",
            k: "scrollline -10",
            "<C-y>": "scrollline -10",
            h: "scrollpx -50",
            l: "scrollpx 50",
            G: "scrollto 100",
            gg: "scrollto 0",
            "<C-u>": "scrollpage -0.5",
            "<C-d>": "scrollpage 0.5",
            "<C-f>": "scrollpage 1",
            "<C-b>": "scrollpage -1",
            "<C-v>": "nmode ignore 1 mode normal",
            $: "scrollto 100 x",
            // "0": "scrollto 0 x", // will get interpreted as a count
            "^": "scrollto 0 x",
            H: "back",
            L: "forward",
            "<C-o>": "jumpprev",
            "<C-i>": "jumpnext",
            d: "tabclose",
            D: "composite tabprev; tabclose #",
            gx0: "tabclosealltoleft",
            gx$: "tabclosealltoright",
            "<<": "tabmove -1",
            ">>": "tabmove +1",
            u: "undo",
            U: "undo window",
            r: "reload",
            R: "reloadhard",
            x: "stop",
            gi: "focusinput -l",
            "g?": "rot13",
            "g!": "jumble",
            "g;": "changelistjump -1",
            J: "tabprev",
            K: "tabnext",
            gt: "tabnext_gt",
            gT: "tabprev",
            // "<c-n>": "tabnext_gt", // c-n is reserved for new window
            // "<c-p>": "tabprev",
            "g^": "tabfirst",
            g0: "tabfirst",
            g$: "tablast",
            ga: "tabaudio",
            gr: "reader",
            gu: "urlparent",
            gU: "urlroot",
            gf: "viewsource",
            ":": "fillcmdline_notrail",
            s: "fillcmdline open search",
            S: "fillcmdline tabopen search",
            // find mode not suitable for general consumption yet.
            // "/": "fillcmdline find",
            // "?": "fillcmdline find -?",
            // n: "findnext 1",
            // N: "findnext -1",
            // ",<Space>": "nohlsearch",
            M: "gobble 1 quickmark",
            B: "fillcmdline taball",
            b: "fillcmdline tab",
            ZZ: "qall",
            f: "hint",
            F: "hint -b",
            gF: "hint -qb",
            ";i": "hint -i",
            ";b": "hint -b",
            ";o": "hint",
            ";I": "hint -I",
            ";k": "hint -k",
            ";K": "hint -K",
            ";y": "hint -y",
            ";Y": "hint -cF img i => tri.excmds.yankimage(tri.urlutils.getAbsoluteURL(i.src))",
            ";p": "hint -p",
            ";h": "hint -h",
            v: "hint -h",
            ";P": "hint -P",
            ";r": "hint -r",
            ";s": "hint -s",
            ";S": "hint -S",
            ";a": "hint -a",
            ";A": "hint -A",
            ";;": "hint -; *",
            ";#": "hint -#",
            ";v": "hint -W mpvsafe",
            ";V": "hint -V",
            ";w": "hint -w",
            ";t": "hint -W tabopen",
            ";O": "hint -W fillcmdline_notrail open ",
            ";W": "hint -W fillcmdline_notrail winopen ",
            ";T": "hint -W fillcmdline_notrail tabopen ",
            ";z": "hint -z",
            ";m": "composite hint -Jpipe img src | open images.google.com/searchbyimage?image_url=",
            ";M": "composite hint -Jpipe img src | tabopen images.google.com/searchbyimage?image_url=",
            ";gi": "hint -qi",
            ";gI": "hint -qI",
            ";gk": "hint -qk",
            ";gy": "hint -qy",
            ";gp": "hint -qp",
            ";gP": "hint -qP",
            ";gr": "hint -qr",
            ";gs": "hint -qs",
            ";gS": "hint -qS",
            ";ga": "hint -qa",
            ";gA": "hint -qA",
            ";g;": "hint -q;",
            ";g#": "hint -q#",
            ";gv": "hint -qW mpvsafe",
            ";gw": "hint -qw",
            ";gb": "hint -qb",
            // These two don't strictly follow the "bind is ;g[flag]" rule but they make sense
            ";gF": "hint -qb",
            ";gf": "hint -q",
            "<S-Insert>": "mode ignore",
            "<AC-Escape>": "mode ignore",
            "<AC-`>": "mode ignore",
            "<S-Escape>": "mode ignore",
            "<Escape>": "composite mode normal ; hidecmdline",
            "<C-[>": "composite mode normal ; hidecmdline",
            a: "current_url bmark",
            A: "bmark",
            zi: "zoom 0.1 true",
            zo: "zoom -0.1 true",
            zm: "zoom 0.5 true",
            zr: "zoom -0.5 true",
            zM: "zoom 0.5 true",
            zR: "zoom -0.5 true",
            zz: "zoom 1",
            zI: "zoom 3",
            zO: "zoom 0.3",
            ".": "repeat",
            "<AS-ArrowUp><AS-ArrowUp><AS-ArrowDown><AS-ArrowDown><AS-ArrowLeft><AS-ArrowRight><AS-ArrowLeft><AS-ArrowRight>ba": "open https://www.youtube.com/watch?v=M3iOROuTuMA",
        };
        this.vmaps = {
            "<Escape>": "composite js document.getSelection().empty(); mode normal; hidecmdline",
            "<C-[>": "composite js document.getSelection().empty(); mode normal ; hidecmdline",
            y: "composite js document.getSelection().toString() | clipboard yank",
            s: "composite js document.getSelection().toString() | fillcmdline open search",
            S: "composite js document.getSelection().toString() | fillcmdline tabopen search",
            l: 'js document.getSelection().modify("extend","forward","character")',
            h: 'js document.getSelection().modify("extend","backward","character")',
            e: 'js document.getSelection().modify("extend","forward","word")',
            w: 'js document.getSelection().modify("extend","forward","word"); document.getSelection().modify("extend","forward","word"); document.getSelection().modify("extend","backward","word"); document.getSelection().modify("extend","forward","character")',
            b: 'js document.getSelection().modify("extend","backward","character"); document.getSelection().modify("extend","backward","word"); document.getSelection().modify("extend","forward","character")',
            j: 'js document.getSelection().modify("extend","forward","line")',
            // "j": 'js document.getSelection().modify("extend","forward","paragraph")', // not implemented in Firefox
            k: 'js document.getSelection().modify("extend","backward","line")',
            $: 'js document.getSelection().modify("extend","forward","lineboundary")',
            "0": 'js document.getSelection().modify("extend","backward","lineboundary")',
            "=": "js let n = document.getSelection().anchorNode.parentNode; let s = window.getSelection(); let r = document.createRange(); s.removeAllRanges(); r.selectNodeContents(n); s.addRange(r)",
            o: "js tri.visual.reverseSelection(document.getSelection())",
            "🕷🕷INHERITS🕷🕷": "nmaps",
        };
        this.hintmaps = {
            "<Backspace>": "hint.popKey",
            "<Escape>": "hint.reset",
            "<C-[>": "hint.reset",
            "<Tab>": "hint.focusNextHint",
            "<S-Tab>": "hint.focusPreviousHint",
            "<ArrowUp>": "hint.focusTopHint",
            "<ArrowDown>": "hint.focusBottomHint",
            "<ArrowLeft>": "hint.focusLeftHint",
            "<ArrowRight>": "hint.focusRightHint",
            "<Enter>": "hint.selectFocusedHint",
            "<Space>": "hint.selectFocusedHint",
        };
        /**
         * Browser-wide binds accessible in all modes and on pages where Tridactyl "cannot run".
         * <!-- Note to developers: binds here need to also be listed in manifest.json -->
         */
        this.browsermaps = {
            "<C-,>": "escapehatch",
            "<C-6>": "tab #",
            "<CS-6>": "tab #",
        };
        /**
         * Whether to allow pages (not necessarily github) to override `/`, which is a default Firefox binding.
         */
        this.leavegithubalone = "false";
        /**
         * Which keys to protect from pages that try to override them. Requires [[leavegithubalone]] to be set to false.
         */
        this.blacklistkeys = ["/"];
        /**
         * Autocommands that run when certain events happen, and other conditions are met.
         *
         * Related ex command: `autocmd`.
         */
        this.autocmds = {
            /**
             * Commands that will be run as soon as Tridactyl loads into a page.
             *
             * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
             */
            DocStart: {
            // "addons.mozilla.org": "mode ignore",
            },
            /**
             * Commands that will be run when pages are loaded.
             *
             * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
             */
            DocLoad: {
                "^https://github.com/tridactyl/tridactyl/issues/new$": "issue",
            },
            /**
             * Commands that will be run when pages are unloaded.
             *
             * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
             */
            DocEnd: {
            // "emacs.org": "sanitise history",
            },
            /**
             * Commands that will be run when Tridactyl first runs each time you start your browser.
             *
             * Each key corresponds to a javascript regex that matches the hostname of the computer Firefox is running on. Note that fetching the hostname could be a little slow, if you want to execute something unconditionally, use ".*" as Tridactyl special-cases this pattern to avoid hostname lookups.
             */
            TriStart: {
                ".*": "source_quiet",
            },
            /**
             * Commands that will be run when you enter a tab.
             *
             * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
             */
            TabEnter: {
            // "gmail.com": "mode ignore",
            },
            /**
             * Commands that will be run when you leave a tab.
             *
             * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
             */
            TabLeft: {
            // Actually, this doesn't work because tabclose closes the current tab
            // Too bad :/
            // "emacs.org": "tabclose",
            },
            /**
             * Commands that will be run when fullscreen state changes.
             */
            FullscreenChange: {},
            /**
             * Commands that will be run when fullscreen state is entered.
             */
            FullscreenEnter: {},
            /**
             * Commands that will be run when fullscreen state is left.
             */
            FullscreenLeft: {},
        };
        /**
         * Map for translating keys directly into other keys in normal-ish modes. For example, if you have an entry in this config option mapping `п` to `g`, then you could type `пп` instead of `gg` or `пi` instead of `gi` or `;п` instead of `;g`. This is primarily useful for international users who don't want to deal with rebuilding their bindings every time tridactyl ships a new default keybind. It's not as good as shipping properly internationalized sets of default bindings, but it's probably as close as we're going to get on a small open-source project like this.
         *
         * Note that the current implementation does not allow you to "chain" keys, for example, "a"=>"b" and "b"=>"c" for "a"=>"c". You can, however, swap or rotate keys, so "a"=>"b" and "b"=>"a" will work the way you'd expect, as will "a"=>"b" and "b"=>"c" and "c"=>"a".
         */
        this.keytranslatemap = {
        // Examples (I think >_>):
        // "д": "l", // Russian language
        // "é" : "w", // BÉPO
        // "h": "j", // Dvorak
        // "n": "j", // Colemak
        // etc
        };
        /**
         * Whether to use the keytranslatemap in various maps.
         */
        this.keytranslatemodes = {
            nmaps: "true",
            imaps: "false",
            inputmaps: "false",
            ignoremaps: "false",
            exmaps: "false",
            hintmaps: "false",
        };
        /**
         * Automatically place these sites in the named container.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, the site will be opened in a container tab instead.
         */
        this.autocontain = o({
        // "github.com": "microsoft",
        // "youtube.com": "google",
        });
        /**
         * Strict mode will always ensure a domain is open in the correct container, replacing the current tab if necessary.
         *
         * Relaxed mode is less aggressive and instead treats container domains as a default when opening a new tab.
         */
        this.autocontainmode = "strict";
        /**
         * Aliases for the commandline.
         *
         * You can make a new one with `command alias ex-command`.
         */
        this.exaliases = {
            alias: "command",
            au: "autocmd",
            aucon: "autocontain",
            audel: "autocmddelete",
            audelete: "autocmddelete",
            blacklistremove: "autocmddelete DocStart",
            b: "tab",
            clsh: "clearsearchhighlight",
            nohlsearch: "clearsearchhighlight",
            noh: "clearsearchhighlight",
            o: "open",
            w: "winopen",
            t: "tabopen",
            tabnew: "tabopen",
            tabm: "tabmove",
            tabo: "tabonly",
            tn: "tabnext_gt",
            bn: "tabnext_gt",
            tnext: "tabnext_gt",
            bnext: "tabnext_gt",
            tp: "tabprev",
            tN: "tabprev",
            bp: "tabprev",
            bN: "tabprev",
            tprev: "tabprev",
            bprev: "tabprev",
            tabfirst: "tab 1",
            tablast: "tab 0",
            bfirst: "tabfirst",
            blast: "tablast",
            tfirst: "tabfirst",
            tlast: "tablast",
            buffer: "tab",
            bufferall: "taball",
            bd: "tabclose",
            bdelete: "tabclose",
            quit: "tabclose",
            q: "tabclose",
            qa: "qall",
            sanitize: "sanitise",
            "saveas!": "saveas --cleanup --overwrite",
            tutorial: "tutor",
            h: "help",
            unmute: "mute unmute",
            authors: "credits",
            openwith: "hint -W",
            "!": "exclaim",
            "!s": "exclaim_quiet",
            containerremove: "containerdelete",
            colours: "colourscheme",
            colorscheme: "colourscheme",
            colors: "colourscheme",
            man: "help",
            "!js": "fillcmdline_tmp 3000 !js is deprecated. Please use js instead",
            "!jsb": "fillcmdline_tmp 3000 !jsb is deprecated. Please use jsb instead",
            get_current_url: "js document.location.href",
            current_url: "composite get_current_url | fillcmdline_notrail ",
            stop: "js window.stop()",
            zo: "zoom",
            installnative: "nativeinstall",
            nativeupdate: "updatenative",
            mkt: "mktridactylrc",
            "mkt!": "mktridactylrc -f",
            "mktridactylrc!": "mktridactylrc -f",
            mpvsafe: "js -p tri.excmds.shellescape(JS_ARG).then(url => tri.excmds.exclaim_quiet('mpv --no-terminal ' + url))",
            exto: "extoptions",
            extpreferences: "extoptions",
            extp: "extpreferences",
            prefset: "setpref",
            prefremove: "removepref",
            tabclosealltoright: "tabcloseallto right",
            tabclosealltoleft: "tabcloseallto left",
            reibadailty: "jumble",
        };
        /**
         * Used by `]]` and `[[` to look for links containing these words.
         *
         * Edit these if you want to add, e.g. other language support.
         */
        this.followpagepatterns = {
            next: "^(next|newer)\\b|»|>>|more",
            prev: "^(prev(ious)?|older)\\b|«|<<",
        };
        /**
         * The default search engine used by `open search`. If empty string, your browser's default search engine will be used. If set to something, Tridactyl will first look at your [[searchurls]] and then at the search engines for which you have defined a keyword on `about:preferences#search`.
         */
        this.searchengine = "";
        /**
         * Definitions of search engines for use via `open [keyword]`.
         *
         * `%s` will be replaced with your whole query and `%s1`, `%s2`, ..., `%sn` will be replaced with the first, second and nth word of your query. If there are none of these patterns in your search urls, your query will simply be appended to the searchurl.
         *
         * Examples:
         * - When running `open gi cute puppies`, with a `gi` searchurl defined with `set searchurls.gi https://www.google.com/search?q=%s&tbm=isch`, tridactyl will navigate to `https://www.google.com/search?q=cute puppies&tbm=isch`.
         * - When running `tabopen translate en ja Tridactyl`, with a `translate` searchurl defined with `set searchurls.translate https://translate.google.com/#view=home&op=translate&sl=%s1&tl=%s2&text=%s3`, tridactyl will navigate to `https://translate.google.com/#view=home&op=translate&sl=en&tl=ja&text=Tridactyl`.
         *
         * [[setnull]] can be used to "delete" the default search engines. E.g. `setnull searchurls.google`.
         */
        this.searchurls = {
            google: "https://www.google.com/search?q=",
            googlelucky: "https://www.google.com/search?btnI=I'm+Feeling+Lucky&q=",
            scholar: "https://scholar.google.com/scholar?q=",
            googleuk: "https://www.google.co.uk/search?q=",
            bing: "https://www.bing.com/search?q=",
            duckduckgo: "https://duckduckgo.com/?q=",
            yahoo: "https://search.yahoo.com/search?p=",
            twitter: "https://twitter.com/search?q=",
            wikipedia: "https://en.wikipedia.org/wiki/Special:Search/",
            youtube: "https://www.youtube.com/results?search_query=",
            amazon: "https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=",
            amazonuk: "https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=",
            startpage: "https://startpage.com/do/search?language=english&cat=web&query=",
            github: "https://github.com/search?utf8=✓&q=",
            searx: "https://searx.me/?category_general=on&q=",
            cnrtl: "http://www.cnrtl.fr/lexicographie/",
            osm: "https://www.openstreetmap.org/search?query=",
            mdn: "https://developer.mozilla.org/en-US/search?q=",
            gentoo_wiki: "https://wiki.gentoo.org/index.php?title=Special%3ASearch&profile=default&fulltext=Search&search=",
            qwant: "https://www.qwant.com/?q=",
        };
        /**
         * URL the newtab will redirect to.
         *
         * All usual rules about things you can open with `open` apply, with the caveat that you'll get interesting results if you try to use something that needs `nativeopen`: so don't try `about:newtab` or a `file:///` URI. You should instead use a data URI - https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs - or host a local webserver (e.g. Caddy).
         */
        this.newtab = "";
        /**
         * Whether `:viewsource` will use our own page that you can use Tridactyl binds on, or Firefox's default viewer, which you cannot use Tridactyl on.
         */
        this.viewsource = "tridactyl";
        /**
         * Pages opened with `gH`. In order to set this value, use `:set homepages ["example.org", "example.net", "example.com"]` and so on.
         */
        this.homepages = [];
        /**
         * Characters to use in hint mode.
         *
         * They are used preferentially from left to right.
         */
        this.hintchars = "hjklasdfgyuiopqwertnmzxcvb";
        /**
         * The type of hinting to use. `vimperator` will allow you to filter links based on their names by typing non-hint chars. It is recommended that you use this in conjuction with the [[hintchars]] setting, which you should probably set to e.g, `5432167890`. ´vimperator-reflow´ additionally updates the hint labels after filtering.
         */
        this.hintfiltermode = "simple";
        /**
         * Whether to optimise for the shortest possible names for each hint, or to use a simple numerical ordering. If set to `numeric`, overrides `hintchars` setting.
         */
        this.hintnames = "short";
        /**
         * Whether to display the names for hints in uppercase.
         */
        this.hintuppercase = "true";
        /**
         * The delay in milliseconds in `vimperator` style hint modes after selecting a hint before you are returned to normal mode.
         *
         * The point of this is to prevent accidental execution of normal mode binds due to people typing more than is necessary to choose a hint.
         */
        this.hintdelay = 300;
        /**
         * Controls whether hints should be shifted in quick-hints mode.
         *
         * Here's what it means: let's say you have hints from a to z but are only
         * interested in every second hint. You first press `a`, then `c`.
         * Tridactyl will realize that you skipped over `b`, and so that the next
         * hint you're going to trigger is probably `e`. Tridactyl will shift all
         * hint names so that `e` becomes `c`, `d` becomes `b`, `c` becomes `a` and
         * so on.
         * This means that once you pressed `c`, you can keep on pressing `c` to
         * trigger every second hint. Only makes sense with hintnames = short.
         */
        this.hintshift = "false";
        /**
         * Controls whether hints should be followed automatically.
         *
         * If set to `false`, hints will only be followed upon confirmation. This applies to cases when there is only a single match or only one link on the page.
         */
        this.hintautoselect = "true";
        /**
         * Controls whether the page can focus elements for you via js
         *
         * NB: will break fancy editors such as CodeMirror on Jupyter. Simply use `seturl` to whitelist pages you need it on.
         *
         * Best used in conjunction with browser.autofocus in `about:config`
         */
        this.allowautofocus = "true";
        /**
         * Uses a loop to prevent focus until you interact with a page. Only recommended for use via `seturl` for problematic sites as it can be a little heavy on CPU if running on all tabs. Should be used in conjuction with [[allowautofocus]]
         */
        this.preventautofocusjackhammer = "false";
        /**
         * Whether to use Tridactyl's (bad) smooth scrolling.
         */
        this.smoothscroll = "false";
        /**
         * How viscous you want smooth scrolling to feel.
         */
        this.scrollduration = 100;
        /**
         * Where to open tabs opened with `tabopen` - to the right of the current tab, or at the end of the tabs.
         */
        this.tabopenpos = "next";
        /**
         * When enabled (the default), running tabclose will close the tabs whether they are pinned or not. When disabled, tabclose will fail with an error if a tab is pinned.
         */
        this.tabclosepinned = "true";
        /**
         * Controls which tab order to use when opening the tab/buffer list. Either mru = sort by most recent tab or default = by tab index
         */
        this.tabsort = "default";
        /**
         * Where to open tabs opened with hinting - as if it had been middle clicked, to the right of the current tab, or at the end of the tabs.
         */
        this.relatedopenpos = "related";
        /**
         * The name of the voice to use for text-to-speech. You can get the list of installed voices by running the following snippet: `js alert(window.speechSynthesis.getVoices().reduce((a, b) => a + " " + b.name))`
         */
        this.ttsvoice = "default"; // chosen from the listvoices list or "default"
        /**
         * Controls text-to-speech volume. Has to be a number between 0 and 1.
         */
        this.ttsvolume = 1;
        /**
         * Controls text-to-speech speed. Has to be a number between 0.1 and 10.
         */
        this.ttsrate = 1;
        /**
         * Controls text-to-speech pitch. Has to be between 0 and 2.
         */
        this.ttspitch = 1;
        /**
         * When set to "nextinput", pressing `<Tab>` after gi selects the next input.
         *
         * When set to "firefox", `<Tab>` behaves like normal, focusing the next tab-indexed element regardless of type.
         */
        this.gimode = "nextinput";
        /**
         * Decides where to place the cursor when selecting non-empty input fields
         */
        this.cursorpos = "end";
        /**
         * The theme to use.
         *
         * Permitted values: run `:composite js tri.styling.THEMES | fillcmdline` to find out.
         */
        this.theme = "default";
        /**
         * Storage for custom themes
         *
         * Maps theme names to CSS. Predominantly used automatically by [[colourscheme]] to store themes read from disk, as documented by [[colourscheme]]. Setting this manually is untested but might work provided that [[colourscheme]] is then used to change the theme to the right theme name.
         */
        this.customthemes = {};
        /**
         * Whether to display the mode indicator or not.
         */
        this.modeindicator = "true";
        /**
         * Whether to display the mode indicator in various modes. Ignored if modeindicator set to false.
         */
        this.modeindicatormodes = {
            normal: "true",
            insert: "true",
            input: "true",
            ignore: "true",
            ex: "true",
            hint: "true",
            visual: "true",
        };
        /**
         * Milliseconds before registering a scroll in the jumplist
         */
        this.jumpdelay = 3000;
        /**
         * Logging levels. Unless you're debugging Tridactyl, it's unlikely you'll ever need to change these.
         */
        this.logging = {
            cmdline: "warning",
            containers: "warning",
            controller: "warning",
            excmd: "error",
            hinting: "warning",
            messaging: "warning",
            native: "warning",
            performance: "warning",
            state: "warning",
            styling: "warning",
            autocmds: "warning",
        };
        /**
         * Disables the commandline iframe. Dangerous setting, use [[seturl]] to set it. If you ever set this setting to "true" globally and then want to set it to false again, you can do this by opening Tridactyl's preferences page from about:addons.
         */
        this.noiframe = "false";
        /**
         * @deprecated A list of URLs on which to not load the iframe. Use `seturl [URL] noiframe true` instead, as shown in [[noiframe]].
         */
        this.noiframeon = [];
        /**
         * Insert / input mode edit-in-$EDITOR command to run
         * This has to be a command that stays in the foreground for the whole editing session
         * "auto" will attempt to find a sane editor in your path.
         * Please send your requests to have your favourite terminal moved further up the list to /dev/null.
         *          (but we are probably happy to add your terminal to the list if it isn't already there.)
         *
         * Example values:
         * - linux: `xterm -e vim`
         * - windows: `start cmd.exe /c \"vim\"`.
         *
         * Also see [:editor](/static/docs/modules/_src_excmds_.html#editor).
         */
        this.editorcmd = "auto";
        /**
         * Command that should be run by the [[rssexec]] ex command. Has the
         * following format:
         * - %u: url
         * - %t: title
         * - %y: type (rss, atom, xml...)
         * Warning: This is a very large footgun. %u will be inserted without any
         * kind of escaping, hence you must obey the following rules if you care
         * about security:
         * - Do not use a composite command. If you need a composite command,
         * create an alias.
         * - Do not use `js` or `jsb`. If you need to use them, create an alias.
         * - Do not insert any %u, %t or %y in shell commands run by the native
         * messenger. Use pipes instead.
         *
         * Here's an example of how to save an rss url in a file on your disk
         * safely:
         * `alias save_rss jsb -p tri.native.run("cat >> ~/.config.newsboat/urls", JS_ARG)`
         * `set rsscmd save_rss %u`
         * This is safe because the url is passed to jsb as an argument rather than
         * being expanded inside of the string it will execute and because it is
         * piped to the shell command rather than being expanded inside of it.
         */
        this.rsscmd = "yank %u";
        /**
         * The browser executable to look for in commands such as `restart`. Not as mad as it seems if you have multiple versions of Firefox...
         */
        this.browser = "firefox";
        /**
         * Which clipboard to store items in. Requires the native messenger to be installed.
         */
        this.yankto = "clipboard";
        /**
         * Which clipboard to retrieve items from. Requires the native messenger to be installed.
         *
         * Permitted values: `clipboard`, or `selection`.
         */
        this.putfrom = "clipboard";
        /**
         * Clipboard command to try to get the selection from (e.g. `xsel` or `xclip`)
         */
        this.externalclipboardcmd = "auto";
        /**
         * Whether downloads (e.g. via ;s hint modes) appear in your download history.
         *
         * NB: will cause downloads to fail silently if Tridactyl is not allowed to run in private windows (regardless of whether you are trying to call it in a private window).
         */
        this.downloadsskiphistory = "false";
        /**
         * Set this to something weird if you want to have fun every time Tridactyl tries to update its native messenger.
         *
         * %TAG will be replaced with your version of Tridactyl for stable builds, or "master" for beta builds
         *
         * NB: Windows has its own platform-specific default.
         */
        this.nativeinstallcmd = "curl -fsSl https://raw.githubusercontent.com/tridactyl/native_messenger/master/installers/install.sh -o /tmp/trinativeinstall.sh && sh /tmp/trinativeinstall.sh %TAG";
        /**
         * Used by :updatecheck and related built-in functionality to automatically check for updates and prompt users to upgrade.
         */
        this.update = {
            /**
             * Whether Tridactyl should check for available updates at startup.
             */
            nag: true,
            /**
             * How many days to wait after an update is first available until telling people.
             */
            nagwait: 7,
            /**
             * The version we last nagged you about. We only nag you once per version.
             */
            lastnaggedversion: "1.14.0",
            /**
             * Time we last checked for an update, milliseconds since unix epoch.
             */
            lastchecktime: 0,
            /**
             * Minimum interval between automatic update checks, in seconds.
             */
            checkintervalsecs: 60 * 60 * 24,
        };
        /**
         * Profile directory to use with native messenger with e.g, `guiset`.
         */
        this.profiledir = "auto";
        // Container settings
        /**
         * If enabled, tabopen opens a new tab in the currently active tab's container.
         */
        this.tabopencontaineraware = "false";
        /**
         * If moodeindicator is enabled, containerindicator will color the border of the mode indicator with the container color.
         */
        this.containerindicator = "true";
        /**
         * Autocontain directives create a container if it doesn't exist already.
         */
        this.auconcreatecontainer = "true";
        /**
         * Number of most recent results to ask Firefox for. We display the top 20 or so most frequently visited ones.
         */
        this.historyresults = 50;
        /**
         * When displaying bookmarks in history completions, how many page views to pretend they have.
         */
        this.bmarkweight = 100;
        /**
         * General completions options - NB: options are set according to our internal completion source name - see - `src/completions/[name].ts` in the Tridactyl source.
         */
        this.completions = {
            Tab: {
                /**
                 * Whether to automatically select the closest matching completion
                 */
                autoselect: "true",
            },
            TabAll: {
                autoselect: "true",
            },
            Rss: {
                autoselect: "true",
            },
            Bmark: {
                autoselect: "true",
            },
            Sessions: {
                autoselect: "true",
            },
        };
        /**
         * Number of results that should be shown in completions. -1 for unlimited
         */
        this.findresults = -1;
        /**
         * Number of characters to use as context for the matches shown in completions
         */
        this.findcontextlen = 100;
        /**
         * Whether find should be case-sensitive
         */
        this.findcase = "smart";
        /**
         * Whether Tridactyl should jump to the first match when using `:find`
         */
        this.incsearch = "false";
        /**
         * How many characters should be typed before triggering incsearch/completions
         */
        this.minincsearchlen = 3;
        /**
         * Deprecated.
         * Change this to "clobber" to ruin the "Content Security Policy" of all sites a bit and make Tridactyl run a bit better on some of them, e.g. raw.github*
         */
        this.csp = "untouched";
        /**
         * JavaScript RegExp used to recognize words in text.* functions (e.g. text.transpose_words). Should match any character belonging to a word.
         */
        this.wordpattern = "[^\\s]+";
        /**
         * Activate tridactyl's performance counters. These have a
         * measurable performance impact, since every sample is a few
         * hundred bytes and we sample tridactyl densely, but they're good
         * when you're trying to optimize things.
         */
        this.perfcounters = "false";
        /**
         * How many samples to store from the perf counters.
         *
         * Each performance entry is two numbers (16 bytes), an entryType
         * of either "mark" or "measure" (js strings are utf-16 ad we have
         * two marks for each measure, so amortize to about 10 bytes per
         * entry), and a string name that for Tridactyl object will be
         * about 40 (utf-16) characters (80 bytes), plus object overhead
         * roughly proportional to the string-length of the name of the
         * constructor (in this case something like 30 bytes), for a total
         * of what we'll call 128 bytes for ease of math.
         *
         * We want to store, by default, about 1MB of performance
         * statistics, so somewhere around 10k samples.
         *
         */
        this.perfsamples = "10000";
        /**
         * Show (partial) command in the mode indicator.
         * Corresponds to 'showcmd' option of vi.
         */
        this.modeindicatorshowkeys = "false";
        /**
         * Whether a trailing slash is appended when we get the parent of a url with
         * gu (or other means).
         */
        this.urlparenttrailingslash = "true";
        /**
         * Whether to enter visual mode when text is selected. Visual mode can always be entered with `:mode visual`.
         */
        this.visualenterauto = "true";
        /**
         * Whether to return to visual mode when text is deselected.
         */
        this.visualexitauto = "true";
        /**
         * Whether to open and close the sidebar quickly to get focus back to the page when <C-,> is pressed.
         *
         * Disable if the fact that it closes TreeStyleTabs gets on your nerves too much : )
         *
         * NB: when disabled, <C-,> can't get focus back from the address bar, but it can still get it back from lots of other places (e.g. Flash-style video players)
         */
        this.escapehatchsidebarhack = "true";
        /**
         * Threshold for fuzzy matching on completions. Lower => stricter matching. Range between 0 and 1: 0 corresponds to perfect matches only. 1 will match anything.
         *
         * https://fusejs.io/api/options.html#threshold
         */
        this.completionfuzziness = 0.3;
    }
}
const platform_defaults = {
    win: {
        browsermaps: {
            "<C-6>": null,
            "<A-6>": "buffer #",
        },
        nmaps: {
            "<C-6>": "buffer #",
        },
        imaps: {
            "<C-6>": "buffer #",
        },
        inputmaps: {
            "<C-6>": "buffer #",
        },
        ignoremaps: {
            "<C-6>": "buffer #",
        },
        nativeinstallcmd: `powershell -ExecutionPolicy Bypass -NoProfile -Command "\
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12;\
(New-Object System.Net.WebClient).DownloadFile('https://raw.githubusercontent.com/tridactyl/native_messenger/master/installers/windows.ps1', '%TEMP%/tridactyl_installnative.ps1');\
& '%TEMP%/tridactyl_installnative.ps1' -Tag %TAG;\
Remove-Item '%TEMP%/tridactyl_installnative.ps1'"`,
    },
    linux: {
        nmaps: {
            ";x": 'hint -F e => { const pos = tri.dom.getAbsoluteCentre(e); tri.excmds.exclaim_quiet("xdotool mousemove --sync " + window.devicePixelRatio * pos.x + " " + window.devicePixelRatio * pos.y + "; xdotool click 1")}',
            ";X": 'hint -F e => { const pos = tri.dom.getAbsoluteCentre(e); tri.excmds.exclaim_quiet("xdotool mousemove --sync " + window.devicePixelRatio * pos.x + " " + window.devicePixelRatio * pos.y + "; xdotool keydown ctrl+shift; xdotool click 1; xdotool keyup ctrl+shift")}',
        },
    },
};
/** @hidden
 * Merges two objects and removes all keys with null values at all levels
 */
const mergeDeepCull = ramda__WEBPACK_IMPORTED_MODULE_4__.default(mergeDeep, removeNull);
/** @hidden */
const DEFAULTS = mergeDeepCull(o(new default_config()), platform_defaults[_src_lib_platform__WEBPACK_IMPORTED_MODULE_1__.getPlatformOs()]);
/** Given an object and a target, extract the target if it exists, else return undefined

    @param target path of properties as an array
    @hidden
 */
function getDeepProperty(obj, target) {
    if (obj !== undefined && obj !== null && target.length) {
        if (obj["🕷🕷INHERITS🕷🕷"] === undefined) {
            return getDeepProperty(obj[target[0]], target.slice(1));
        }
        else {
            return getDeepProperty(mergeDeepCull(get(obj["🕷🕷INHERITS🕷🕷"]), obj)[target[0]], target.slice(1));
        }
    }
    else {
        if (obj === undefined || obj === null)
            return obj;
        if (obj["🕷🕷INHERITS🕷🕷"] !== undefined) {
            return mergeDeepCull(get(obj["🕷🕷INHERITS🕷🕷"]), obj);
        }
        else {
            return obj;
        }
    }
}
/** Create the key path target if it doesn't exist and set the final property to value.

    If the path is an empty array, replace the obj.

    @param target path of properties as an array
    @hidden
 */
function setDeepProperty(obj, value, target) {
    if (target.length > 1) {
        // If necessary antecedent objects don't exist, create them.
        if (obj[target[0]] === undefined) {
            obj[target[0]] = o({});
        }
        return setDeepProperty(obj[target[0]], value, target.slice(1));
    }
    else {
        obj[target[0]] = value;
    }
}
/** @hidden
 * Merges two objects and any child objects they may have
 */
function mergeDeep(o1, o2) {
    if (o1 === null)
        return Object.assign({}, o2);
    const r = Array.isArray(o1) ? o1.slice() : Object.create(o1);
    Object.assign(r, o1, o2);
    if (o2 === undefined)
        return r;
    Object.keys(o1)
        .filter(key => typeof o1[key] === "object" && typeof o2[key] === "object")
        .forEach(key => r[key] == null
        ? null
        : Object.assign(r[key], mergeDeep(o1[key], o2[key])));
    return r;
}
/** @hidden
 * Gets a site-specific setting.
 */
function getURL(url, target) {
    function _getURL(conf, url, target) {
        if (!conf.subconfigs)
            return undefined;
        // For each key
        return (Object.keys(conf.subconfigs)
            // Keep only the ones that have a match
            .filter(k => url.match(k) &&
            getDeepProperty(conf.subconfigs[k], target) !==
                undefined)
            // Sort them from lowest to highest priority, default to a priority of 10
            .sort((k1, k2) => (conf.subconfigs[k1].priority || 10) -
            (conf.subconfigs[k2].priority || 10))
            // Merge their corresponding value if they're objects, otherwise return the last value
            .reduce((acc, curKey) => {
            const curVal = getDeepProperty(conf.subconfigs[curKey], target);
            if (acc instanceof Object && curVal instanceof Object)
                return mergeDeep(acc, curVal);
            return curVal;
        }, undefined));
    }
    const user = _getURL(USERCONFIG, url, target);
    const deflt = _getURL(DEFAULTS, url, target);
    if (user === undefined || user === null)
        return deflt;
    if (typeof user !== "object" || typeof deflt !== "object")
        return user;
    return mergeDeepCull(deflt, user);
}
/** Get the value of the key target.

    If the user has not specified a key, use the corresponding key from
    defaults, if one exists, else undefined.
    @hidden
 */
function get(target_typed, ...target) {
    if (target_typed === undefined) {
        target = [];
    }
    else {
        target = [target_typed].concat(target);
    }
    // Window.tri might not be defined when called from the untrusted page context
    let loc = window.location;
    if (window.tri && window.tri.contentLocation)
        loc = window.tri.contentLocation;
    // If there's a site-specifing setting, it overrides global settings
    const site = getURL(loc.href, target);
    const user = getDeepProperty(USERCONFIG, target);
    const defult = getDeepProperty(DEFAULTS, target);
    // Merge results if there's a default value and it's not an Array or primitive.
    if (typeof defult === "object") {
        return mergeDeepCull(mergeDeepCull(defult, user), site);
    }
    else {
        if (site !== undefined) {
            return site;
        }
        else if (user !== undefined) {
            return user;
        }
        else {
            return defult;
        }
    }
}
/** Get the value of the key target.

    Please only use this with targets that will be used at runtime - it skips static checks. Prefer [[get]].
 */
function getDynamic(...target) {
    return get(target[0], ...target.slice(1));
}
/** Get the value of the key target.

    Please only use this with targets that will be used at runtime - it skips static checks. Prefer [[getAsync]].
 */
async function getAsyncDynamic(...target) {
    return getAsync(target[0], ...target.slice(1));
}
/** Get the value of the key target, but wait for config to be loaded from the
    database first if it has not been at least once before.

    This is useful if you are a content script and you've just been loaded.
    @hidden
 */
async function getAsync(target_typed, ...target) {
    if (INITIALISED) {
        // TODO: consider storing keys directly
        const browserconfig = await browser.storage.local.get(CONFIGNAME);
        USERCONFIG = browserconfig[CONFIGNAME] || o({});
        return get(target_typed, ...target);
    }
    else {
        return new Promise(resolve => WAITERS.push(() => resolve(get(target_typed, ...target))));
    }
}
/*
 * Replaces the configuration in your sync storage with your current configuration. Does not merge: it overwrites.
 *
 * Does not synchronise custom themes due to storage constraints.
 */
async function push() {
    const local_conf = await browser.storage.local.get(CONFIGNAME);
    // eslint-disable-next-line @typescript-eslint/dot-notation
    delete local_conf[CONFIGNAME]["customthemes"];
    return browser.storage.sync.set(local_conf);
}
/*
 * Replaces the local configuration with the configuration from your sync storage. Does not merge: it overwrites.
 */
async function pull() {
    return browser.storage.local.set(await browser.storage.sync.get(CONFIGNAME));
}
/** @hidden
 * Like set(), but for a specific pattern.
 */
function setURL(pattern, ...args) {
    try {
        new RegExp(pattern);
        return set("subconfigs", pattern, ...args);
    }
    catch (err) {
        if (err instanceof SyntaxError)
            throw new SyntaxError(`invalid pattern: ${err.message}`);
        throw err;
    }
}
/** Full target specification, then value

    e.g.
        set("nmaps", "o", "open")
        set("search", "default", "google")
        set("aucmd", "BufRead", "memrise.com", "open memrise.com")

    @hidden
 */
async function set(...args) {
    if (args.length < 2) {
        throw new Error("You must provide at least two arguments!");
    }
    const target = args.slice(0, args.length - 1);
    const value = args[args.length - 1];
    if (INITIALISED) {
        // wait for storage to settle, otherwise we could clobber a previous incomplete set()
        setDeepProperty(USERCONFIG, value, target);
        return save();
    }
    else {
        setDeepProperty(USERCONFIG, value, target);
    }
}
/** @hidden
 * Delete the key at USERCONFIG[pattern][target]
 */
function unsetURL(pattern, ...target) {
    return unset("subconfigs", pattern, ...target);
}
/** Delete the key at target in USERCONFIG if it exists
 * @hidden */
function unset(...target) {
    const parent = getDeepProperty(USERCONFIG, target.slice(0, -1));
    if (parent !== undefined)
        delete parent[target[target.length - 1]];
    return save();
}
/** Save the config back to storage API.

    Config is not synchronised between different instances of this module until
    sometime after this happens.

    @hidden
 */
async function save() {
    const settingsobj = o({});
    settingsobj[CONFIGNAME] = USERCONFIG;
    return browser.storage.local.set(settingsobj);
}
/** Updates the config to the latest version.
    Proposed semantic for config versionning:
     - x.y -> x+1.0 : major architectural changes
     - x.y -> x.y+1 : renaming settings/changing their types
    There's no need for an updater if you're only adding a new setting/changing
    a default setting

    When adding updaters, don't forget to set("configversion", newversionnumber)!
    @hidden
 */
async function update() {
    // Updates a value both in the main config and in sub (=site specific) configs
    const updateAll = (setting, fn) => {
        const val = getDeepProperty(USERCONFIG, setting);
        if (val) {
            set(...setting, fn(val));
        }
        const subconfigs = getDeepProperty(USERCONFIG, ["subconfigs"]);
        if (subconfigs) {
            Object.keys(subconfigs)
                .map(pattern => [pattern, getURL(pattern, setting)])
                .filter(([_pattern, value]) => value)
                .forEach(([pattern, value]) => setURL(pattern, ...setting, fn(value)));
        }
    };
    if (!get("configversion"))
        set("configversion", "0.0");
    let updated = false;
    switch (get("configversion")) {
        case "0.0": {
            try {
                // Before we had a config system, we had nmaps, and we put them in the
                // root namespace because we were young and bold.
                const legacy_nmaps = await browser.storage.sync.get("nmaps");
                if (Object.keys(legacy_nmaps).length > 0) {
                    USERCONFIG.nmaps = Object.assign(legacy_nmaps.nmaps, USERCONFIG.nmaps);
                }
            }
            finally {
                set("configversion", "1.0");
            }
        }
        case "1.0": {
            const vimiumgi = getDeepProperty(USERCONFIG, ["vimium-gi"]);
            if (vimiumgi === true || vimiumgi === "true")
                set("gimode", "nextinput");
            else if (vimiumgi === false || vimiumgi === "false")
                set("gimode", "firefox");
            unset("vimium-gi");
            set("configversion", "1.1");
        }
        case "1.1": {
            const leveltostr = {
                0: "never",
                1: "error",
                2: "warning",
                3: "info",
                4: "debug",
            };
            const logging = getDeepProperty(USERCONFIG, ["logging"]);
            // logging is not necessarily defined if the user didn't change default values
            if (logging)
                Object.keys(logging).forEach(l => set("logging", l, leveltostr[logging[l]]));
            set("configversion", "1.2");
        }
        case "1.2": {
            ;
            ["ignoremaps", "inputmaps", "imaps", "nmaps"]
                .map(mapname => [
                mapname,
                getDeepProperty(USERCONFIG, [mapname]),
            ])
                // mapobj is undefined if the user didn't define any bindings
                .filter(([_mapname, mapobj]) => mapobj)
                .forEach(([mapname, mapobj]) => {
                // For each mapping
                Object.keys(mapobj)
                    // Keep only the ones with im_* functions
                    .filter(key => {
                    var _a;
                    return ((_a = mapobj[key]) === null || _a === void 0 ? void 0 : _a.search("^im_|([^a-zA-Z0-9_-])im_")) >= 0;
                })
                    // Replace the prefix
                    .forEach(key => setDeepProperty(USERCONFIG, mapobj[key].replace(new RegExp("^im_|([^a-zA-Z0-9_-])im_"), "$1text."), [mapname, key]));
            });
            set("configversion", "1.3");
        }
        case "1.3": {
            ;
            [
                "priority",
                "hintdelay",
                "scrollduration",
                "ttsvolume",
                "ttsrate",
                "ttspitch",
                "jumpdelay",
                "historyresults",
            ].forEach(setting => updateAll([setting], parseInt));
            set("configversion", "1.4");
        }
        case "1.4": {
            ;
            (getDeepProperty(USERCONFIG, ["noiframeon"]) || []).forEach(site => {
                setURL(site, "noiframe", "true");
            });
            set("configversion", "1.5");
        }
        case "1.5": {
            unset("exaliases", "tab");
            set("configversion", "1.6");
        }
        case "1.6": {
            const updateSetting = mapObj => {
                if (!mapObj)
                    return mapObj;
                if (mapObj[" "] !== undefined) {
                    mapObj["<Space>"] = mapObj[" "];
                    delete mapObj[" "];
                }
                ;
                [
                    "<A- >",
                    "<C- >",
                    "<M- >",
                    "<S- >",
                    "<AC- >",
                    "<AM- >",
                    "<AS- >",
                    "<CM- >",
                    "<CS- >",
                    "<MS- >",
                ].forEach(binding => {
                    if (mapObj[binding] !== undefined) {
                        const key = binding.replace(" ", "Space");
                        mapObj[key] = mapObj[binding];
                        delete mapObj[binding];
                    }
                });
                return mapObj;
            };
            [
                "nmaps",
                "exmaps",
                "imaps",
                "inputmaps",
                "ignoremaps",
            ].forEach(settingName => updateAll([settingName], updateSetting));
            set("configversion", "1.7");
        }
        case "1.7": {
            const autocontain = getDeepProperty(USERCONFIG, ["autocontain"]);
            unset("autocontain");
            if (autocontain !== undefined) {
                Object.entries(autocontain).forEach(([domain, container]) => {
                    set("autocontain", `^https?://([^/]*\\.|)*${domain}/`, container);
                });
            }
            set("configversion", "1.8");
        }
        case "1.8": {
            const updateSetting = mapObj => {
                if (!mapObj)
                    return mapObj;
                return ramda__WEBPACK_IMPORTED_MODULE_6__.default(val => {
                    if (val === "")
                        return null;
                    return val;
                }, mapObj);
            };
            [
                "nmaps",
                "exmaps",
                "imaps",
                "inputmaps",
                "ignoremaps",
                "hintmaps",
                "vmaps",
            ].forEach(settingName => updateAll([settingName], updateSetting));
            set("configversion", "1.9");
        }
        case "1.9": {
            const local = (await browser.storage.local.get(CONFIGNAME))[CONFIGNAME];
            const sync = (await browser.storage.sync.get(CONFIGNAME))[CONFIGNAME];
            // Possible combinations:
            // storage:storageloc_setting => winning storageloc setting
            // l:l, s:* => l
            // l:undefined, s:l =>  l
            // l:undefined, s:s => s
            // l: undefined, s:undefined => s
            // l:s, s:* =>  s
            const current_storageloc = (local === null || local === void 0 ? void 0 : local.storageloc) !== undefined
                ? local.storageloc
                : (sync === null || sync === void 0 ? void 0 : sync.storageloc) !== undefined
                    ? sync.storageloc
                    : "sync";
            if (current_storageloc == "sync") {
                await pull();
            }
            else if (current_storageloc != "local") {
                throw new Error("storageloc was set to something weird: " +
                    current_storageloc +
                    ", automatic migration of settings was not possible.");
            }
            set("configversion", "2.0");
            updated = true; // NB: when adding a new updater, move this line to the end of it
        }
    }
    return updated;
}
/** Read all user configuration from storage API then notify any waiting asynchronous calls

    asynchronous calls generated by getAsync.
    @hidden
 */
async function init() {
    const localConfig = await browser.storage.local.get(CONFIGNAME);
    schlepp(localConfig[CONFIGNAME]);
    INITIALISED = true;
    for (const waiter of WAITERS) {
        waiter();
    }
}
/** @hidden */
const changeListeners = new Map();
/** @hidden
 * @param name The name of a "toplevel" config setting (i.e. "nmaps", not "nmaps.j")
 * @param listener A function to call when the value of $name is modified in the config. Takes the previous and new value as parameters.
 */
function addChangeListener(name, listener) {
    let arr = changeListeners.get(name);
    if (!arr) {
        arr = [];
        changeListeners.set(name, arr);
    }
    arr.push(listener);
}
/** @hidden
 * Removes event listeners set with addChangeListener
 */
function removeChangeListener(name, listener) {
    const arr = changeListeners.get(name);
    if (!arr)
        return;
    const i = arr.indexOf(listener);
    if (i >= 0)
        arr.splice(i, 1);
}
/** Parse the config into a string representation of a .tridactylrc config file.
    Tries to parse the config into sectionable chunks based on keywords.
    Binds, aliases, autocmds and logging settings each have their own section while the rest are dumped into "General Settings".

    @returns string The parsed config file.

 */
function parseConfig() {
    let p = {
        conf: [],
        binds: [],
        aliases: [],
        subconfigs: [],
        aucmds: [],
        aucons: [],
        logging: [],
        nulls: [],
    };
    p = parseConfigHelper(USERCONFIG, p);
    const s = {
        general: ``,
        binds: ``,
        aliases: ``,
        aucmds: ``,
        aucons: ``,
        subconfigs: ``,
        logging: ``,
        nulls: ``,
    };
    if (p.conf.length > 0)
        s.general = `" General Settings\n${p.conf.join("\n")}\n\n`;
    if (p.binds.length > 0)
        s.binds = `" Binds\n${p.binds.join("\n")}\n\n`;
    if (p.aliases.length > 0)
        s.aliases = `" Aliases\n${p.aliases.join("\n")}\n\n`;
    if (p.aucmds.length > 0)
        s.aucmds = `" Autocmds\n${p.aucmds.join("\n")}\n\n`;
    if (p.aucons.length > 0)
        s.aucons = `" Autocontainers\n${p.aucons.join("\n")}\n\n`;
    if (p.subconfigs.length > 0)
        s.subconfigs = `" Subconfig Settings\n${p.subconfigs.join("\n")}\n\n`;
    if (p.logging.length > 0)
        s.logging = `" Logging\n${p.logging.join("\n")}\n\n`;
    if (p.nulls.length > 0)
        s.nulls = `" Removed settings\n${p.nulls.join("\n")}\n\n`;
    const ftdetect = `" For syntax highlighting see https://github.com/tridactyl/vim-tridactyl\n" vim: set filetype=tridactyl`;
    return `${s.general}${s.binds}${s.subconfigs}${s.aliases}${s.aucmds}${s.aucons}${s.logging}${s.nulls}${ftdetect}`;
}
const parseConfigHelper = (pconf, parseobj, prefix = []) => {
    for (const i of Object.keys(pconf)) {
        if (typeof pconf[i] !== "object") {
            if (prefix[0] === "subconfigs") {
                prefix.shift();
                const pattern = prefix.shift();
                parseobj.subconfigs.push(`seturl ${pattern} ${[...prefix, i].join(".")} ${pconf[i]}`);
            }
            else {
                parseobj.conf.push(`set ${[...prefix, i].join(".")} ${pconf[i]}`);
            }
        }
        else if (pconf[i] === null) {
            parseobj.nulls.push(`setnull ${[...prefix, i].join(".")}`);
        }
        else {
            for (const e of Object.keys(pconf[i])) {
                if (_src_lib_binding__WEBPACK_IMPORTED_MODULE_0__.modeMaps.includes(i)) {
                    let cmd = "bind";
                    if (prefix[0] === "subconfigs")
                        cmd = cmd + "url " + prefix[1];
                    if (i !== "nmaps") {
                        const mode = _src_lib_binding__WEBPACK_IMPORTED_MODULE_0__.maps2mode.get(i);
                        cmd += ` --mode=${mode}`;
                    }
                    if (pconf[i][e] === null) {
                        parseobj.binds.push(`un${cmd} ${e}`);
                        continue;
                    }
                    if (pconf[i][e].length > 0) {
                        parseobj.binds.push(`${cmd} ${e} ${pconf[i][e]}`);
                    }
                    else {
                        parseobj.binds.push(`un${cmd} ${e}`);
                    }
                }
                else if (pconf[i][e] === null) {
                    parseobj.nulls.push(`setnull ${i}.${e}`);
                }
                else if (i === "exaliases") {
                    // Only really useful if mapping the entire config and not just pconf.
                    if (e === "alias") {
                        parseobj.aliases.push(`command ${e} ${pconf[i][e]}`);
                    }
                    else {
                        parseobj.aliases.push(`alias ${e} ${pconf[i][e]}`);
                    }
                }
                else if (i === "autocmds") {
                    for (const a of Object.keys(pconf[i][e])) {
                        parseobj.aucmds.push(`autocmd ${e} ${a} ${pconf[i][e][a]}`);
                    }
                }
                else if (i === "autocontain") {
                    parseobj.aucons.push(`autocontain ${e} ${pconf[i][e]}`);
                }
                else if (i === "logging") {
                    // Map the int values in e to a log level
                    let level;
                    if (pconf[i][e] === 0)
                        level = "never";
                    if (pconf[i][e] === 1)
                        level = "error";
                    if (pconf[i][e] === 2)
                        level = "warning";
                    if (pconf[i][e] === 3)
                        level = "info";
                    if (pconf[i][e] === 4)
                        level = "debug";
                    parseobj.logging.push(`set logging.${e} ${level}`);
                }
                else if (i === "customthemes") {
                    // Skip custom themes for now because writing their CSS is hard
                    // parseobj.themes.push(`colourscheme ${e}`) // TODO: check if userconfig.theme == e and write this, otherwise don't.
                }
                else {
                    parseConfigHelper(pconf[i], parseobj, [...prefix, i]);
                    break;
                }
            }
        }
    }
    return parseobj;
};
// Listen for changes to the storage and update the USERCONFIG if appropriate.
// TODO: BUG! Sync and local storage are merged at startup, but not by this thing.
browser.storage.onChanged.addListener((changes, areaname) => {
    if (CONFIGNAME in changes) {
        const { newValue, oldValue } = changes[CONFIGNAME];
        const old = oldValue || {};
        function triggerChangeListeners(key, value = newValue[key]) {
            const arr = changeListeners.get(key);
            if (arr) {
                const v = old[key] === undefined ? DEFAULTS[key] : old[key];
                arr.forEach(f => f(v, value));
            }
        }
        if (areaname === "sync") {
            // Probably do something here with push/pull?
        }
        else if (newValue !== undefined) {
            // A key has been :unset if it exists in USERCONFIG and doesn't in changes and if its value in USERCONFIG is different from the one it has in default_config
            const unsetKeys = Object.keys(old).filter(k => newValue[k] === undefined &&
                JSON.stringify(old[k]) !== JSON.stringify(DEFAULTS[k]));
            // A key has changed if it is defined in USERCONFIG and its value in USERCONFIG is different from the one in `changes` or if the value in defaultConf is different from the one in `changes`
            const changedKeys = Object.keys(newValue).filter(k => JSON.stringify(old[k] !== undefined ? old[k] : DEFAULTS[k]) !== JSON.stringify(newValue[k]));
            // TODO: this should be a deep comparison but this is better than nothing
            changedKeys.forEach(key => (USERCONFIG[key] = newValue[key]));
            unsetKeys.forEach(key => delete USERCONFIG[key]);
            // Trigger listeners
            unsetKeys.forEach(key => triggerChangeListeners(key, DEFAULTS[key]));
            changedKeys.forEach(key => triggerChangeListeners(key));
        }
        else {
            // newValue is undefined when calling browser.storage.AREANAME.clear()
            // If newValue is undefined and AREANAME is the same value as STORAGELOC, the user wants to clean their config
            USERCONFIG = o({});
            Object.keys(old)
                .filter(key => old[key] !== DEFAULTS[key])
                .forEach(key => triggerChangeListeners(key));
        }
    }
});
init();


/***/ }),

/***/ "./src/lib/containers.ts":
/*!*******************************!*\
  !*** ./src/lib/containers.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DefaultContainer": () => (/* binding */ DefaultContainer),
/* harmony export */   "create": () => (/* binding */ create),
/* harmony export */   "remove": () => (/* binding */ remove),
/* harmony export */   "update": () => (/* binding */ update),
/* harmony export */   "getFromId": () => (/* binding */ getFromId),
/* harmony export */   "exists": () => (/* binding */ exists),
/* harmony export */   "fromString": () => (/* binding */ fromString),
/* harmony export */   "getAll": () => (/* binding */ getAll),
/* harmony export */   "getId": () => (/* binding */ getId),
/* harmony export */   "fuzzyMatch": () => (/* binding */ fuzzyMatch)
/* harmony export */ });
/* harmony import */ var _src_lib_webext__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/webext */ "./src/lib/webext.ts");
/* harmony import */ var fuse_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fuse.js */ "./node_modules/fuse.js/dist/fuse.esm.js");
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");



const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_2__.Logger("containers");
// As per Mozilla specification: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/contextualIdentities/ContextualIdentity
const ContainerColor = [
    "blue",
    "turquoise",
    "green",
    "yellow",
    "orange",
    "red",
    "pink",
    "purple",
];
// As per Mozilla specification: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/contextualIdentities/ContextualIdentity
const ContainerIcon = [
    "fingerprint",
    "briefcase",
    "dollar",
    "cart",
    "circle",
    "gift",
    "vacation",
    "food",
    "fruit",
    "pet",
    "tree",
    "chill",
];
const DefaultContainer = Object.freeze(fromString("default", "invisible", "noicond", "firefox-default"));
/** Creates a container from the specified parameters.Does not allow multiple containers with the same name.
    @param name  The container name.
    @param color  The container color, must be one of: "blue", "turquoise", "green", "yellow", "orange", "red", "pink" or "purple". If nothing is supplied, it selects one at random.
    @param icon  The container icon, must be one of: "fingerprint", "briefcase", "dollar", "cart", "circle", "gift", "vacation", "food", "fruit", "pet", "tree", "chill"
 */
async function create(name, color = "random", icon = "fingerprint") {
    if (color === "random")
        color = chooseRandomColor();
    const container = fromString(name, color, icon);
    // browser.contextualIdentities.create does not accept a cookieStoreId property.
    delete container.cookieStoreId;
    logger.debug(container);
    if (await exists(name)) {
        logger.debug(`[Container.create] container already exists ${container}`);
        throw new Error(`[Container.create] container already exists, aborting.`);
    }
    else {
        const res = await browser.contextualIdentities.create(container);
        return res.cookieStoreId;
    }
}
/** Removes specified container. No fuzzy matching is intentional here. If there are multiple containers with the same name (allowed by other container plugins), it chooses the one with the lowest cookieStoreId
    @param name The container name
 */
async function remove(name) {
    logger.debug(name);
    const id = await getId(name);
    const res = await browser.contextualIdentities.remove(id);
    logger.debug("[Container.remove] removed container:", res.cookieStoreId);
}
/** Updates the specified container.
    TODO: pass an object to this when tridactyl gets proper flag parsing
    NOTE: while browser.contextualIdentities.create does check for valid color/icon combos, browser.contextualIdentities.update does not.
    @param containerId Expects a cookieStringId e.g. "firefox-container-n".
    @param name the new name of the container
    @param color the new color of the container
    @param icon the new icon of the container
 */
function update(containerId, updateObj) {
    const { name, color, icon } = updateObj;
    if (!isValidColor(color)) {
        logger.debug(updateObj);
        throw new Error("[Container.update] invalid container color: " + color);
    }
    if (!isValidIcon(icon)) {
        logger.debug(updateObj);
        throw new Error("[Container.update] invalid container icon: " + icon);
    }
    browser.contextualIdentities.update(containerId, { name, color, icon });
}
/** Gets a container object from a supplied container id string. If no container corresponds to containerId, returns a default empty container.
    @param containerId Expects a cookieStringId e.g. "firefox-container-n"
 */
async function getFromId(containerId) {
    try {
        return await _src_lib_webext__WEBPACK_IMPORTED_MODULE_0__.browserBg.contextualIdentities.get(containerId);
    }
    catch (e) {
        return DefaultContainer;
    }
}
/** Fetches all containers from Firefox's contextual identities API and checks if one exists with the specified name.
    Note: This operation is entirely case-insensitive.
    @param string cname
    @returns boolean Returns true when cname matches an existing container or on query error.
 */
async function exists(cname) {
    let exists = false;
    try {
        const containers = await getAll();
        const res = containers.filter(c => c.name.toLowerCase() === cname.toLowerCase());
        if (res.length > 0) {
            exists = true;
        }
    }
    catch (e) {
        exists = true; // Make sure we don't accidentally break the constraint on query error.
        logger.error("[Container.exists] Error querying contextualIdentities:", e);
    }
    return exists;
}
/** Takes string parameters and returns them as a pseudo container object
    for use in other functions in the library.
    @param name
    @param color
    @param icon
 */
function fromString(name, color, icon, id = "") {
    return {
        name,
        color,
        icon,
        cookieStoreId: id,
    }; // rules are made to be broken
}
/**
 *  @returns An array representation of all containers.
 */
async function getAll() {
    return browser.contextualIdentities.query({});
}
/** Fetches the cookieStoreId of a given container

 Note: all checks are case insensitive.

 @param name The container name
 @returns The cookieStoreId of the first match of the query.
 */
async function getId(name) {
    const containers = await getAll();
    const res = containers.filter(c => c.name.toLowerCase() === name.toLowerCase());
    if (res.length !== 1) {
        throw new Error(`Container '${name}' does not exist.`);
    }
    else {
        return res[0].cookieStoreId;
    }
}
/** Tries some simple ways to match containers to your input.
    Fuzzy matching is entirely case-insensitive.
    @param partialName The (partial) name of the container.
 */
async function fuzzyMatch(partialName) {
    const fuseOptions = {
        id: "cookieStoreId",
        shouldSort: true,
        threshold: 0.5,
        location: 0,
        distance: 100,
        mimMatchCharLength: 3,
        keys: ["name"],
    };
    const containers = await getAll();
    const fuse = new fuse_js__WEBPACK_IMPORTED_MODULE_1__.default(containers, fuseOptions);
    const res = fuse.search(partialName);
    if (res.length >= 1)
        return res[0].item.cookieStoreId;
    else {
        throw new Error("[Container.fuzzyMatch] no container matched that string");
    }
}
/** Helper function for create, returns a random valid IdentityColor for use if no color is applied at creation.*/
function chooseRandomColor() {
    const max = Math.floor(ContainerColor.length);
    const n = Math.floor(Math.random() * max);
    return ContainerColor[n];
}
function isValidColor(color) {
    return ContainerColor.indexOf(color) > -1;
}
function isValidIcon(icon) {
    return ContainerIcon.indexOf(icon) > -1;
}


/***/ }),

/***/ "./src/lib/convert.ts":
/*!****************************!*\
  !*** ./src/lib/convert.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "toBoolean": () => (/* binding */ toBoolean),
/* harmony export */   "toNumber": () => (/* binding */ toNumber)
/* harmony export */ });
function toBoolean(s) {
    if (s === "true")
        return true;
    else if (s === "false")
        return false;
    else
        throw new Error("Not a boolean");
}
function toNumber(s) {
    const n = Number(s);
    if (isNaN(n))
        throw new Error("Not a number! " + s);
    else
        return n;
}


/***/ }),

/***/ "./src/lib/css_util.ts":
/*!*****************************!*\
  !*** ./src/lib/css_util.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "findCssRules": () => (/* binding */ findCssRules),
/* harmony export */   "potentialRules": () => (/* binding */ potentialRules),
/* harmony export */   "metaRules": () => (/* binding */ metaRules),
/* harmony export */   "changeSingleCss": () => (/* binding */ changeSingleCss),
/* harmony export */   "changeCss": () => (/* binding */ changeCss)
/* harmony export */ });
/* harmony import */ var css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! css */ "./node_modules/css/index.js");
/* tslint:disable:no-string-literal */

// Layout (of bits we care about:
// {stylesheet: {
//          rules: [{
//                      type: "rule", selectors: [string], declarations: [
//                          {type: "declaration", property: string, value: string}
/** Find rules in sheet that match selector */
function findCssRules(selectors, sheet) {
    const filtSheet = [...sheet.stylesheet.rules.entries()].filter(x => {
        const rule = x[1];
        return (rule.type === "rule" &&
            "selectors" in rule &&
            // Make sure that there are as many selectors in the current rule
            // as there are in the rule we're looking for
            rule.selectors.length === selectors.length &&
            // Also make sure that each of the selectors of the current rule
            // are present in the rule we're looking for
            !rule.selectors.find(selector => !selectors.includes(selector)));
    });
    return filtSheet.map(x => x[0]);
}
/** Rulename -> { name: <selector>, options: { <option-name>: <css-string> } }
 *
 *  Multi-level map of rulename, options available for rule and css for each option.
 *
 *  *findCssRules and changeSingleCss rely on the selector not containing a comma.*
 *
 *  TODO: make this more flexible with cleverer matching of selectors, merging of options
 *
 */
const potentialRules = {
    statuspanel: {
        name: `#statuspanel`,
        options: {
            none: `display: none !important;`,
            right: `right: 0; display: inline;`,
            left: ``,
            "top-left": `top: 2em; z-index: 2; display: inline;`,
            "top-right": `top: 2em; z-index: 2; right: 0; display: inline;`,
        },
    },
    hoverlink: {
        name: `statuspanel[type="overLink"], #statuspanel[type="overLink"]`,
        options: {
            none: `display: none !important;`,
            right: `right: 0; display: inline;`,
            left: ``,
            "top-left": `top: 2em; z-index: 2; display: inline;`,
            "top-right": `top: 2em; z-index: 2; right: 0; display: inline;`,
        },
    },
    tabstoolbar: {
        name: `#TabsToolbar`,
        options: {
            none: `visibility: collapse;`,
            show: ``,
        },
    },
    tabstoolbarunfocused: {
        name: `:root:not([customizing]) #navigator-toolbox:not(:hover):not(:focus-within) #TabsToolbar`,
        options: {
            hide: `visibility: collapse;`,
            show: ``,
        },
    },
    tabcounter: {
        name: `tabs`,
        options: {
            off: ``,
            on: `counter-reset: tab-counter;`,
        },
    },
    tabcounters: {
        name: `.tab-label::before`,
        options: {
            hide: ``,
            show: ` counter-increment: tab-counter;
                    content: counter(tab-counter) " - ";`,
        },
    },
    navtoolboxunfocused: {
        name: `:root:not([customizing]) #navigator-toolbox:not(:hover):not(:focus-within)`,
        options: {
            hide: `max-height: 1px; min-height: calc(0px); overflow: hidden;`,
            show: ``,
        },
    },
    navbarunfocused: {
        name: `:root:not([customizing]) #navigator-toolbox:not(:hover):not(:focus-within) #nav-bar`,
        // tridactyl auto show zone doesn't seem to make a difference
        options: {
            hide: `max-height: 0;
                    min-height: 0!important;
                    --tridactyl-auto-show-zone: 10px;
                    margin-bottom: calc(-1 * var(--tridactyl-auto-show-zone));
                    opacity: 0;`,
            show: ``,
        },
    },
    // Annoying black line at top in fullscreen
    navbarafter: {
        name: `#navigator-toolbox::after`,
        options: {
            hide: `display: none !important;`,
            show: ``,
        },
    },
    // All children except add-on panels
    navbarnonaddonchildren: {
        name: `:root:not([customizing]) #nav-bar > :not(#customizationui-widget-panel)`,
        options: {
            hide: `display: none !important;`,
            show: ``,
        },
    },
    // Set navbar height to 0
    navbarnoheight: {
        name: `:root:not([customizing]) #nav-bar`,
        options: {
            hide: ``,
            show: `max-height: 0; min-height: 0 !important;`,
        },
    },
    // This inherits transparency if we aren't careful
    menubar: {
        name: `#navigator-toolbox:not(:hover):not(:focus-within) #toolbar-menubar > *`,
        options: {
            grey: `background-color: rgb(232, 232, 231);`,
            default: ``,
        },
    },
    // Window dectorations
    titlebar: {
        name: `#titlebar`,
        options: {
            hide: `display: none !important;`,
            show: ``,
        },
    },
    padwhenmaximised: {
        name: `#main-window[sizemode="maximized"] #content-deck`,
        options: {
            some: `padding-top: 8px;`,
            none: ``,
        },
    },
};
//  Vimperator's options for reference:
//  <tags>'go' 'guioptions'</tags>
//  <spec>'guioptions' 'go'</spec>
//
//  m          Menubar
//  T          Toolbar
//  B          Bookmark bar
//  A          Add-on bar
//  n          Tab number
//  b          Bottom scrollbar
//  r          Right scrollbar
//  l          Left scrollbar
//
//  was just a simple show/hide if the characters appeared in the setting
/** Rules that index into potentialRules or metaRules
 *
 *  Please don't add cycles to this table :)
 */
const metaRules = {
    gui: {
        none: {
            hoverlink: "none",
            tabs: "none",
            navbar: "autohide",
            menubar: "grey",
            padwhenmaximised: "some",
        },
        full: {
            hoverlink: "left",
            tabs: "always",
            navbar: "always",
            menubar: "default",
            padwhenmaximised: "none",
        },
    },
    tabs: {
        none: {
            tabstoolbar: "none",
            navtoolboxunfocused: "hide",
        },
        always: {
            tabstoolbar: "show",
            tabstoolbarunfocused: "show",
            navtoolboxunfocused: "show",
        },
        autohide: {
            tabstoolbar: "show",
            tabstoolbarunfocused: "hide",
            navtoolboxunfocused: "hide",
        },
        count: {
            tabcounter: "on",
            tabcounters: "show",
        },
        nocount: {
            tabcounter: "off",
            tabcounters: "hide",
        },
    },
    navbar: {
        autohide: {
            navbarunfocused: "hide",
            navtoolboxunfocused: "hide",
            navbarafter: "hide",
            navbarnonaddonchildren: "show",
            navbarnoheight: "hide",
        },
        always: {
            navbarunfocused: "show",
            navtoolboxunfocused: "show",
            navbarafter: "show",
            navbarnonaddonchildren: "show",
            navbarnoheight: "hide",
        },
        none: {
            navbarunfocused: "show",
            navtoolboxunfocused: "show",
            navbarafter: "hide",
            navbarnonaddonchildren: "hide",
            navbarnoheight: "show",
        },
    },
};
/** Add desired non-meta rule to stylesheet replacing existing rule with the same selector if present */
function changeSingleCss(rulename, optionname, sheet) {
    const selector = potentialRules[rulename].name;
    const newRule = `${selector} {
        ${potentialRules[rulename].options[optionname]}
    }`;
    const miniSheet = css__WEBPACK_IMPORTED_MODULE_0__.parse(newRule).stylesheet.rules[0];
    // Find pre-existing rules
    const oldRuleIndexes = findCssRules("selectors" in miniSheet ? miniSheet.selectors : [], sheet);
    if (oldRuleIndexes.length > 0) {
        sheet.stylesheet.rules[oldRuleIndexes[0]] = miniSheet;
    }
    else {
        sheet.stylesheet.rules = sheet.stylesheet.rules.concat(miniSheet);
    }
    return sheet;
}
/** Apply rule to stylesheet. rulename, optionname identify a rule. They may be meta rules */
function changeCss(rulename, optionname, sheet) {
    if (rulename in metaRules) {
        const metarule = metaRules[rulename][optionname];
        for (const rule of Object.keys(metarule)) {
            // have a metarule call itself for hours of fun
            sheet = changeCss(rule, metarule[rule], sheet);
        }
    }
    else
        sheet = changeSingleCss(rulename, optionname, sheet);
    return sheet;
}


/***/ }),

/***/ "./src/lib/editor.ts":
/*!***************************!*\
  !*** ./src/lib/editor.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "delete_char": () => (/* binding */ delete_char),
/* harmony export */   "delete_backward_char": () => (/* binding */ delete_backward_char),
/* harmony export */   "tab_insert": () => (/* binding */ tab_insert),
/* harmony export */   "transpose_chars": () => (/* binding */ transpose_chars),
/* harmony export */   "transpose_words": () => (/* binding */ transpose_words),
/* harmony export */   "upcase_word": () => (/* binding */ upcase_word),
/* harmony export */   "downcase_word": () => (/* binding */ downcase_word),
/* harmony export */   "capitalize_word": () => (/* binding */ capitalize_word),
/* harmony export */   "kill_line": () => (/* binding */ kill_line),
/* harmony export */   "backward_kill_line": () => (/* binding */ backward_kill_line),
/* harmony export */   "kill_whole_line": () => (/* binding */ kill_whole_line),
/* harmony export */   "kill_word": () => (/* binding */ kill_word),
/* harmony export */   "backward_kill_word": () => (/* binding */ backward_kill_word),
/* harmony export */   "beginning_of_line": () => (/* binding */ beginning_of_line),
/* harmony export */   "end_of_line": () => (/* binding */ end_of_line),
/* harmony export */   "forward_char": () => (/* binding */ forward_char),
/* harmony export */   "backward_char": () => (/* binding */ backward_char),
/* harmony export */   "forward_word": () => (/* binding */ forward_word),
/* harmony export */   "backward_word": () => (/* binding */ backward_word),
/* harmony export */   "insert_text": () => (/* binding */ insert_text),
/* harmony export */   "rot13": () => (/* binding */ rot13),
/* harmony export */   "jumble": () => (/* binding */ jumble)
/* harmony export */ });
/* harmony import */ var _src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/editor_utils */ "./src/lib/editor_utils.ts");
/** # Editor Functions
 *
 * This file contains functions to manipulate the content of textareas/input fields/contenteditable elements.
 *
 * If you want to bind them to keyboard shortcuts, be sure to prefix them with "text.". For example, if you want to bind control-a to `beginning_of_line` in all modes, use:
 *
 * ```
 * bind --mode=ex <C-a> text.beginning_of_line
 * bind --mode=input <C-a> text.beginning_of_line
 * bind --mode=insert <C-a> text.begining_of_line
 * ```
 *
 * Also keep in mind that if you want to bind something in insert mode, you'll probably also want to bind it in input mode (insert mode is entered by clicking on text areas while input mode is entered by using `gi`).
 *
 * If you're looking for command-line only functions, go [there](/static/docs/modules/_src_commandline_frame_.html).
 *
 * Contrary to the main tridactyl help page, this one doesn't tell you whether a specific function is bound to something. For now, you'll have to make do with with `:bind` and `:viewconfig`.
 *
 */
/** ignore this line */

/**
 * Behaves like readline's [delete_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. deletes the character to the right of the caret.
 **/
const delete_char = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart, selectionEnd) => {
    if (selectionStart !== selectionEnd) {
        // If the user selected text, then we need to delete that instead of a single char
        text =
            text.substring(0, selectionStart) + text.substring(selectionEnd);
    }
    else {
        text =
            text.substring(0, selectionStart) +
                text.substring(selectionStart + 1);
    }
    return [text, selectionStart, null];
}));
/**
 * Behaves like readline's [delete_backward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. deletes the character to the left of the caret.
 **/
const delete_backward_char = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart, selectionEnd) => {
    if (selectionStart !== selectionEnd) {
        text =
            text.substring(0, selectionStart) + text.substring(selectionEnd);
    }
    else {
        text =
            text.substring(0, selectionStart - 1) +
                text.substring(selectionStart);
    }
    selectionStart -= 1;
    return [text, selectionStart, null];
}));
/**
 * Behaves like readline's [tab_insert](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. inserts a tab character to the left of the caret.
 **/
const tab_insert = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart, selectionEnd) => {
    if (selectionStart !== selectionEnd) {
        text =
            text.substring(0, selectionStart) +
                "\t" +
                text.substring(selectionEnd);
    }
    else {
        text =
            text.substring(0, selectionStart) +
                "\t" +
                text.substring(selectionStart);
    }
    selectionStart += 1;
    return [text, selectionStart, null];
});
/**
 * Behaves like readline's [transpose_chars](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. transposes the character to the left of the caret with the character to the right of the caret and then moves the caret one character to the right. If there are no characters to the right or to the left of the caret, uses the two characters the closest to the caret.
 **/
const transpose_chars = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart) => {
    if (text.length < 2)
        return [null, null, null];
    // When at the beginning of the text, transpose the first and second characters
    if (selectionStart === 0)
        selectionStart = 1;
    // When at the end of the text, transpose the last and second-to-last characters
    if (selectionStart >= text.length)
        selectionStart = text.length - 1;
    text =
        text.substring(0, selectionStart - 1) +
            text.substring(selectionStart, selectionStart + 1) +
            text.substring(selectionStart - 1, selectionStart) +
            text.substring(selectionStart + 1);
    selectionStart += 1;
    return [text, selectionStart, null];
});
/** @hidden
 * Applies a function to the word the caret is in, or to the next word if the caret is not in a word, or to the previous word if the current word is empty.
 */
function applyWord(text, selectionStart, selectionEnd, fn) {
    if (text.length === 0)
        return [null, null, null];
    // If the caret is at the end of the text, move it just before the last character
    if (selectionStart >= text.length) {
        selectionStart = text.length - 1;
    }
    const boundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, selectionStart, false);
    const beginning = text.substring(0, boundaries[0]) +
        fn(text.substring(boundaries[0], boundaries[1]));
    text = beginning + text.substring(boundaries[1]);
    selectionStart = beginning.length + 1;
    return [text, selectionStart, null];
}
/**
 * Behaves like readline's [transpose_words](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Basically equivalent to [[im_transpose_chars]], but using words as defined by the wordpattern setting.
 **/
const transpose_words = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    if (selectionStart >= text.length) {
        selectionStart = text.length - 1;
    }
    // Find the word the caret is in
    let firstBoundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, selectionStart, false);
    let secondBoundaries = firstBoundaries;
    // If there is a word after the word the caret is in, use it for the transselectionStartition, otherwise use the word before it
    const nextWord = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wordAfterPos)(text, firstBoundaries[1]);
    if (nextWord > -1) {
        secondBoundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, nextWord, false);
    }
    else {
        firstBoundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, firstBoundaries[0] - 1, true);
    }
    const firstWord = text.substring(firstBoundaries[0], firstBoundaries[1]);
    const secondWord = text.substring(secondBoundaries[0], secondBoundaries[1]);
    const beginning = text.substring(0, firstBoundaries[0]) +
        secondWord +
        text.substring(firstBoundaries[1], secondBoundaries[0]);
    selectionStart = beginning.length;
    return [
        beginning + firstWord + text.substring(secondBoundaries[1]),
        selectionStart,
        null,
    ];
}));
/**
 * Behaves like readline's [upcase_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the word the caret is in uppercase.
 **/
const upcase_word = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart, selectionEnd) => applyWord(text, selectionStart, selectionEnd, word => word.toUpperCase())));
/**
 * Behaves like readline's [downcase_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the word the caret is in lowercase.
 **/
const downcase_word = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart, selectionEnd) => applyWord(text, selectionStart, selectionEnd, word => word.toLowerCase())));
/**
 * Behaves like readline's [capitalize_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the initial character of the word the caret is in uppercase.
 **/
const capitalize_word = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart, selectionEnd) => applyWord(text, selectionStart, selectionEnd, word => word[0].toUpperCase() + word.substring(1))));
/**
 * Behaves like readline's [kill_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15), i.e. deletes every character to the right of the caret until reaching either the end of the text or the newline character (\n).
 **/
const kill_line = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    let newLine = text.substring(selectionStart).search("\n");
    if (newLine !== -1) {
        // If the caret is right before the newline, kill the newline
        if (newLine === 0)
            newLine = 1;
        text =
            text.substring(0, selectionStart) +
                text.substring(selectionStart + newLine);
    }
    else {
        text = text.substring(0, selectionStart);
    }
    return [text, selectionStart, null];
}));
/**
 * Behaves like readline's [backward_kill_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15), i.e. deletes every character to the left of the caret until either the beginning of the text is found or a newline character ("\n") is reached.
 **/
const backward_kill_line = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    // If the caret is at the beginning of a line, join the lines
    if (selectionStart > 0 && text[selectionStart - 1] === "\n") {
        return [
            text.substring(0, selectionStart - 1) +
                text.substring(selectionStart),
            selectionStart,
            null,
        ];
    }
    let newLine;
    // Find the closest newline
    for (newLine = selectionStart; newLine > 0 && text[newLine - 1] !== "\n"; --newLine)
        ;
    // Remove everything between the newline and the caret
    return [
        text.substring(0, newLine) + text.substring(selectionStart),
        newLine,
        null,
    ];
}));
/**
 * Behaves like readline's [kill_whole_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15). Deletes every character between the two newlines the caret is in. If a newline can't be found on the left of the caret, everything is deleted until the beginning of the text is reached. If a newline can't be found on the right, everything is deleted until the end of the text is found.
 **/
const kill_whole_line = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    let firstNewLine;
    let secondNewLine;
    // Find the newline before the caret
    for (firstNewLine = selectionStart; firstNewLine > 0 && text[firstNewLine - 1] !== "\n"; --firstNewLine)
        ;
    // Find the newline after the caret
    for (secondNewLine = selectionStart; secondNewLine < text.length && text[secondNewLine - 1] !== "\n"; ++secondNewLine)
        ;
    // Remove everything between the newline and the caret
    return [
        text.substring(0, firstNewLine) + text.substring(secondNewLine),
        firstNewLine,
        null,
    ];
}));
/**
 * Behaves like readline's [kill_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15). Deletes every character from the caret to the end of a word, with words being defined by the wordpattern setting.
 **/
const kill_word = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    const boundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, selectionStart, false);
    if (selectionStart < boundaries[1]) {
        boundaries[0] = selectionStart;
        // Remove everything between the newline and the caret
        return [
            text.substring(0, boundaries[0]) +
                text.substring(boundaries[1]),
            boundaries[0],
            null,
        ];
    }
    else {
        return [null, selectionStart, null];
    }
}));
/**
 * Behaves like readline's [backward_kill_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15). Deletes every character from the caret to the beginning of a word with word being defined by the wordpattern setting.
 **/
const backward_kill_word = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    const boundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, selectionStart, true);
    if (selectionStart > boundaries[0]) {
        boundaries[1] = selectionStart;
        // Remove everything between the newline and the caret
        return [
            text.substring(0, boundaries[0]) +
                text.substring(boundaries[1]),
            boundaries[0],
            null,
        ];
    }
    else {
        return [null, selectionStart, null];
    }
}));
/**
 * Behaves like readline's [beginning_of_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret to the right of the first newline character found at the left of the caret. If no newline can be found, move the caret to the beginning of the text.
 **/
const beginning_of_line = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    while (text[selectionStart - 1] !== undefined &&
        text[selectionStart - 1] !== "\n")
        selectionStart -= 1;
    return [null, selectionStart, null];
}));
/**
 * Behaves like readline's [end_of_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret to the left of the first newline character found at the right of the caret. If no newline can be found, move the caret to the end of the text.
 **/
const end_of_line = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    while (text[selectionStart] !== undefined &&
        text[selectionStart] !== "\n")
        selectionStart += 1;
    return [null, selectionStart, null];
}));
/**
 * Behaves like readline's [forward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one character to the right.
 **/
const forward_char = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart) => [
    null,
    selectionStart + 1,
    null,
]);
/**
 * Behaves like readline's [backward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one character to the left.
 **/
const backward_char = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart) => [null, selectionStart - 1, null]);
/**
 * Behaves like readline's [forward_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one word to the right, with words being defined by the wordpattern setting.
 **/
const forward_word = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.needs_text)((text, selectionStart) => {
    if (selectionStart === text.length)
        return [null, null, null];
    const boundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, selectionStart, false);
    return [null, boundaries[1], null];
}));
/**
 * Behaves like readline's [backward_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one word to the left, with words being defined by the wordpattern setting.
 **/
const backward_word = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart) => {
    if (selectionStart === 0)
        return [null, null, null];
    const boundaries = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.getWordBoundaries)(text, selectionStart, true);
    return [null, boundaries[0], null];
});
/**
 * Insert text in the current input.
 **/
const insert_text = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart, selectionEnd, arg) => [
    text.slice(0, selectionStart) + arg + text.slice(selectionEnd),
    selectionStart + arg.length,
    null,
]);
const rot13 = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart, selectionEnd) => [
    (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.rot13_helper)(text.slice(0, selectionStart) + text.slice(selectionEnd)),
    selectionStart,
    null,
]);
const jumble = (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.wrap_input)((text, selectionStart, selectionEnd) => [
    (0,_src_lib_editor_utils__WEBPACK_IMPORTED_MODULE_0__.jumble_helper)(text.slice(0, selectionStart) + text.slice(selectionEnd)),
    selectionStart,
    null,
]);


/***/ }),

/***/ "./src/lib/editor_utils.ts":
/*!*********************************!*\
  !*** ./src/lib/editor_utils.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "applyToElem": () => (/* binding */ applyToElem),
/* harmony export */   "getSimpleValues": () => (/* binding */ getSimpleValues),
/* harmony export */   "getContentEditableValues": () => (/* binding */ getContentEditableValues),
/* harmony export */   "setSimpleValues": () => (/* binding */ setSimpleValues),
/* harmony export */   "setContentEditableValues": () => (/* binding */ setContentEditableValues),
/* harmony export */   "wrap_input": () => (/* binding */ wrap_input),
/* harmony export */   "needs_text": () => (/* binding */ needs_text),
/* harmony export */   "getLineAndColNumber": () => (/* binding */ getLineAndColNumber),
/* harmony export */   "getWordBoundaries": () => (/* binding */ getWordBoundaries),
/* harmony export */   "wordAfterPos": () => (/* binding */ wordAfterPos),
/* harmony export */   "rot13_helper": () => (/* binding */ rot13_helper),
/* harmony export */   "charesar": () => (/* binding */ charesar),
/* harmony export */   "jumble_helper": () => (/* binding */ jumble_helper),
/* harmony export */   "shuffle": () => (/* binding */ shuffle)
/* harmony export */ });
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
// We have a single dependency on config: getting the value of the WORDPATTERN setting
// Perhaps we could find a way to get rid of it?

/**
 * Applies a function to an element. If the element is an HTMLInputElement and its type isn't "text", it is first turned into a "text" element. This is necessary because some elements (e.g. "email") do not have a selectionStart/selectionEnd.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange .
 **/
function applyToElem(e, fn) {
    let result;
    if (e instanceof HTMLInputElement && e.type !== "text") {
        const t = e.type;
        e.type = "text";
        result = fn(e);
        e.type = t;
    }
    else {
        result = fn(e);
    }
    return result;
}
/**
 * Returns values necessary for editor functions to work on textarea/input elements
 *
 * @param e the element
 * @return [string, number, number] The content of the element, the position of the caret, the position of the end of the visual selection
 */
function getSimpleValues(e) {
    return applyToElem(e, e => [e.value, e.selectionStart, e.selectionEnd]);
}
/**
 * Returns values necessary for editor functions to work on contentEditable elements
 *
 * @param e a contentEditable element
 * @return [string, number, number] The content of the element, the position of the caret, the position of the end of the visual selection
 */
function getContentEditableValues(e) {
    const selection = e.ownerDocument.getSelection();
    // The selection might actually not be in e so we need to make sure it is
    let n = selection.anchorNode;
    while (n && n !== e)
        n = n.parentNode;
    // The selection isn't for e, so we can't do anything
    if (!n)
        return [null, null, null];
    // selection might span multiple elements, might not start with the first element in e or end with the last element in e so the easiest way to compute caret position from beginning of e is to first compute distance from caret to end of e, then move beginning of selection to beginning of e and then use distance from end of selection to compute distance from beginning of selection
    const r = selection.getRangeAt(0).cloneRange();
    const selectionLength = r.toString().length;
    r.setEnd(e, e.childNodes.length);
    const lengthFromCaretToEndOfText = r.toString().length;
    r.setStart(e, 0);
    const s = r.toString();
    const caretPos = s.length - lengthFromCaretToEndOfText;
    return [s, caretPos, caretPos + selectionLength];
}
/**
 * Change text in regular textarea/input fields. Note: this destroys the field's history (i.e. C-z won't work).
 *
 * @param e The element
 * @param text The new content of the element, null if it shouldn't change
 * @param start The new position of the caret, null if the caret shouldn't move
 * @param end The end of the visual selection, null if you just want to move the caret
 */
function setSimpleValues(e, text, start, end) {
    return applyToElem(e, e => {
        if (text !== null)
            e.value = text;
        if (start !== null) {
            if (end === null)
                end = start;
            e.selectionStart = start;
            e.selectionEnd = end;
        }
    });
}
/**
 * Change text in contentEditable elements in a non-destructive way (i.e. C-z will undo changes).
 * @param e The content editable element
 * @param text The new content the element should have. null if you just want to move the caret around
 * @param start The new caret position. null if you just want to change text.
 * @param end The end of the visual selection. null if you just want to move the caret.
 */
function setContentEditableValues(e, text, start, end) {
    const selection = e.ownerDocument.getSelection();
    if (selection.rangeCount < 1) {
        const r = new Range();
        r.setStart(e, 0);
        r.setEnd(e, e.childNodes.length);
        selection.addRange(r);
    }
    if (text !== null) {
        const range = selection.getRangeAt(0);
        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        range.setStart(anchorNode, 0);
        range.setEndAfter(focusNode, focusNode.length);
        e.ownerDocument.execCommand("insertText", false, text);
    }
    if (start !== null) {
        if (end === null)
            end = start;
        let range = selection.getRangeAt(0);
        range.setStart(range.startContainer, start);
        range = selection.getRangeAt(0);
        range.setEnd(range.startContainer, end);
    }
}
/**
 * Take an editor function as parameter and return it wrapped in a function that will handle grabbing text and caret position from the HTML element it takes as parameter
 *
 * @param editor_function A function that takes a [string, selectionStart, selectionEnd] tuple as argument and returns a [string, selectionStart, selectionEnd] tuple corresponding to the new state of the text.
 *
 * @return boolean Whether the editor function was actually called or not
 *
 **/
function wrap_input(fn) {
    return (e, arg) => {
        let getValues = getSimpleValues;
        let setValues = setSimpleValues;
        if (e.isContentEditable) {
            getValues = getContentEditableValues;
            setValues = setContentEditableValues;
        }
        const [origText, origStart, origEnd] = getValues(e);
        if (origText === null || origStart === null)
            return false;
        setValues(e, ...fn(origText, origStart, origEnd, arg));
        return true;
    };
}
/**
 * Take an editor function as parameter and wrap it in a function that will handle error conditions
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
function needs_text(fn, arg) {
    return (text, selectionStart, selectionEnd, arg) => {
        if (text.length === 0 ||
            selectionStart === null ||
            selectionStart === undefined)
            return [null, null, null];
        return fn(text, selectionStart, typeof selectionEnd === "number" ? selectionEnd : selectionStart, arg);
    };
}
/**
 * Returns line and column number.
 */
function getLineAndColNumber(text, start) {
    const lines = text.split("\n");
    let totalChars = 0;
    for (let i = 0; i < lines.length; ++i) {
        // +1 because we also need to take '\n' into account
        if (totalChars + lines[i].length + 1 > start) {
            return [text, i + 1, start - totalChars];
        }
        totalChars += lines[i].length + 1;
    }
    return [text, lines.length, 1];
}
/**
 * Detects the boundaries of a word in text according to the wordpattern setting. If POSITION is in a word, the boundaries of this word are returned. If POSITION is out of a word and BEFORE is true, the word before POSITION is returned. If BEFORE is false, the word after the caret is returned.
 */
function getWordBoundaries(text, position, before) {
    if (position < 0 || position > text.length)
        throw new Error(`getWordBoundaries: position (${position}) should be within text ("${text}") boundaries (0, ${text.length})`);
    const pattern = new RegExp(_src_lib_config__WEBPACK_IMPORTED_MODULE_0__.get("wordpattern"), "g");
    let boundary1 = position < text.length ? position : text.length;
    const direction = before ? -1 : 1;
    // if the caret is not in a word, try to find the word before or after it
    // For `before`, we should check the char before the caret
    if (before && boundary1 > 0)
        boundary1 -= 1;
    while (boundary1 >= 0 &&
        boundary1 < text.length &&
        !text[boundary1].match(pattern)) {
        boundary1 += direction;
    }
    if (boundary1 < 0)
        boundary1 = 0;
    else if (boundary1 >= text.length)
        boundary1 = text.length - 1;
    // if a word couldn't be found in this direction, try the other one
    while (boundary1 >= 0 &&
        boundary1 < text.length &&
        !text[boundary1].match(pattern)) {
        boundary1 -= direction;
    }
    if (boundary1 < 0)
        boundary1 = 0;
    else if (boundary1 >= text.length)
        boundary1 = text.length - 1;
    if (!text[boundary1].match(pattern)) {
        // there is no word in text
        throw new Error(`getWordBoundaries: no characters matching wordpattern (${pattern.source}) in text (${text})`);
    }
    // now that we know the caret is in a word (it could be in the middle depending on POSITION!), try to find its beginning/end
    while (boundary1 >= 0 &&
        boundary1 < text.length &&
        !!text[boundary1].match(pattern)) {
        boundary1 += direction;
    }
    // boundary1 is now outside of the word, bring it back inside of it
    boundary1 -= direction;
    let boundary2 = boundary1;
    // now that we know the caret is at the beginning/end of a word, we need to find the other boundary
    while (boundary2 >= 0 &&
        boundary2 < text.length &&
        !!text[boundary2].match(pattern)) {
        boundary2 -= direction;
    }
    // boundary2 is outside of the word, bring it back in
    boundary2 += direction;
    // Add 1 to the end boundary because the end of a word is marked by the character after said word
    if (boundary1 > boundary2)
        return [boundary2, boundary1 + 1];
    return [boundary1, boundary2 + 1];
}
/** @hidden
 * Finds the next word as defined by the wordpattern setting after POSITION. If POSITION is in a word, POSITION is moved forward until it is out of the word.
 * @return number The position of the next word in text or -1 if the next word can't be found.
 */
function wordAfterPos(text, position) {
    if (position < 0)
        throw new Error(`wordAfterPos: position (${position}) is less that 0`);
    const pattern = new RegExp(_src_lib_config__WEBPACK_IMPORTED_MODULE_0__.get("wordpattern"), "g");
    // move position out of the current word
    while (position < text.length && !!text[position].match(pattern))
        position += 1;
    // try to find characters that match wordpattern
    while (position < text.length && !text[position].match(pattern))
        position += 1;
    if (position >= text.length)
        return -1;
    return position;
}
/** @hidden
 * Rots by 13.
 */
const rot13_helper = (s, n = 13) => {
    let sa = s.split("");
    sa = sa.map(x => charesar(x, n));
    return sa.join("");
};
const charesar = (c, n = 13) => {
    const cn = c.charCodeAt(0);
    if (cn >= 65 && cn <= 90)
        return String.fromCharCode(((cn - 65 + n) % 26) + 65);
    if (cn >= 97 && cn <= 122)
        return String.fromCharCode(((cn - 97 + n) % 26) + 97);
    return c;
};
/** @hidden
 * Shuffles only letters except for the first and last letter in a word, where "word"
 * is a sequence of one of: only lowercase letters OR 5 or more uppercase letters OR an uppercase letter followed
 * by only lowercase letters.
 */
const jumble_helper = (text) => {
    const wordSplitRegex = new RegExp("([^a-zA-Z]|[A-Z][a-z]+)");
    return text.split(wordSplitRegex).map(jumbleWord).join("");
};
function jumbleWord(word) {
    if (word.length < 4 || isAcronym()) {
        return word;
    }
    const innerText = word.slice(1, -1);
    return word.charAt(0) + shuffle(innerText) + word.charAt(word.length - 1);
    function isAcronym() {
        return word.length < 5 && word.toUpperCase() === word;
    }
}
/**
 * Shuffles input string
 * @param text string to be shuffled
 */
const shuffle = (text) => {
    const arr = text.split("");
    for (let i = arr.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * i + 1);
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
    }
    return arr.join("");
};


/***/ }),

/***/ "./src/lib/extension_info.ts":
/*!***********************************!*\
  !*** ./src/lib/extension_info.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "KNOWN_EXTENSIONS": () => (/* binding */ KNOWN_EXTENSIONS),
/* harmony export */   "getExtensionEnabled": () => (/* binding */ getExtensionEnabled),
/* harmony export */   "getExtensionInstalled": () => (/* binding */ getExtensionInstalled),
/* harmony export */   "init": () => (/* binding */ init),
/* harmony export */   "listExtensions": () => (/* binding */ listExtensions)
/* harmony export */ });
/** Extensions and compatibility

 Looks us and communicates with other installed extensions so we can
 be compatible with them.

 */
/** Friendly-names of extensions that are used in different places so
    that we can refer to them with more readable and less magic ids.
 */
const KNOWN_EXTENSIONS = {
    temp_containers: "{c607c8df-14a7-4f28-894f-29e8722976af}",
    multi_account_containers: "@testpilot-containers",
};
/** List of currently installed extensions.
 */
const installedExtensions = {};
function updateExtensionInfo(extension) {
    installedExtensions[extension.id] = extension;
}
function getExtensionEnabled(id) {
    if (getExtensionInstalled(id)) {
        return installedExtensions[id].enabled;
    }
    else {
        return false;
    }
}
function getExtensionInstalled(id) {
    return id in installedExtensions;
}
async function hasManagementPermission() {
    return browser.permissions.contains({
        permissions: ["management"],
    });
}
/** Read installed extensions to populate the list at startup time.
 */
async function init() {
    // If we don't have the permission, bail out. Our list of
    // installed extensions will be left uninitialized, so all of our
    // external interfaces will pretend that no other extensions
    // exist. This SHOULD result in tridactyl acting the same as it
    // did before the extension interoperability feature was added in
    // the first place, which isn't a great loss.
    const hasPermission = await hasManagementPermission();
    if (!hasPermission) {
        return;
    }
    // Code borrowed from
    // https://github.com/stoically/temporary-containers/blob/master/src/background/management.js
    let extensions = [];
    try {
        extensions = await browser.management.getAll();
    }
    catch (e) {
        return;
    }
    for (const extension of extensions) {
        installedExtensions[extension.id] = extension;
    }
    browser.management.onInstalled.addListener(updateExtensionInfo);
    browser.management.onEnabled.addListener(updateExtensionInfo);
    browser.management.onDisabled.addListener(updateExtensionInfo);
    browser.management.onUninstalled.addListener(updateExtensionInfo);
}
/** Return a list of extensions installed by the user.
 */
async function listExtensions() {
    await init();
    return Object.keys(installedExtensions)
        .map(key => installedExtensions[key])
        .filter(obj => obj.optionsUrl.length > 0);
}


/***/ }),

/***/ "./src/lib/itertools.ts":
/*!******************************!*\
  !*** ./src/lib/itertools.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "head": () => (/* binding */ head),
/* harmony export */   "tail": () => (/* binding */ tail),
/* harmony export */   "filter": () => (/* binding */ filter),
/* harmony export */   "find": () => (/* binding */ find),
/* harmony export */   "zip": () => (/* binding */ zip),
/* harmony export */   "range": () => (/* binding */ range),
/* harmony export */   "enumerate": () => (/* binding */ enumerate),
/* harmony export */   "izip": () => (/* binding */ izip),
/* harmony export */   "iterEq": () => (/* binding */ iterEq),
/* harmony export */   "zeros": () => (/* binding */ zeros),
/* harmony export */   "islice": () => (/* binding */ islice),
/* harmony export */   "chain": () => (/* binding */ chain),
/* harmony export */   "permutationsWithReplacement": () => (/* binding */ permutationsWithReplacement),
/* harmony export */   "map": () => (/* binding */ map),
/* harmony export */   "unique": () => (/* binding */ unique),
/* harmony export */   "uniqueBy": () => (/* binding */ uniqueBy),
/* harmony export */   "dropwhile": () => (/* binding */ dropwhile),
/* harmony export */   "takewhile": () => (/* binding */ takewhile)
/* harmony export */ });
/* harmony import */ var _src_lib_number_mod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/number.mod */ "./src/lib/number.mod.ts");

function head(iterable) {
    const iterator = iterable[Symbol.iterator]();
    const result = iterator.next();
    if (result.done)
        throw RangeError("Empty iterator has no head/tail");
    else
        return result.value;
}
/** Get the last item of an array or iterable */
function tail(iter) {
    if (Array.isArray(iter)) {
        if (iter.length < 1)
            throw RangeError("Empty iterator has no head/tail");
        return iter[iter.length - 1];
    }
    else {
        // Re-use error handling in head()
        let last = head(iter);
        for (last of iter)
            ;
        return last;
    }
}
function* filter(iter, predicate) {
    for (const v of iter) {
        if (predicate(v))
            yield v;
    }
}
function find(iter, predicate) {
    return head(filter(iter, predicate));
}
/** Zip some arrays together

    If you need variable length args, you need izip for now.

*/
function zip(...arrays) {
    // Make an array of length values
    // TODO: Explain how this works
    return [...Array(arrays[0].length)].map((_, i) => arrays.map(a => a[i]));
}
function* range(length) {
    if (length < 0)
        return;
    for (let index = 0; index < length; index++) {
        yield index;
    }
}
function* enumerate(iterable) {
    let index = 0;
    for (const element of iterable) {
        yield [index, element];
        index++;
    }
}
/* Zip arbitrary iterators together */
function* izip(...arrays) {
    const iterators = arrays.map(e => e[Symbol.iterator]());
    const box = Array(arrays.length);
    for (let v of iterators[0]) {
        box[0] = v;
        let i;
        try {
            for ([i, v] of enumerate(iterators.slice(1))) {
                box[i + 1] = head(v);
            }
            yield [...box];
        }
        catch (e) {
            return;
        }
    }
}
/* Test if two iterables are equal */
function iterEq(...arrays) {
    for (const a of zip(...arrays)) {
        if (!a.reduce((x, y) => x === y))
            return false;
    }
    return true;
}
function zeros(n) {
    return new Array(n).fill(0);
}
/** islice(iter, stop) = Give the first `stop` elements
    islice(iter, start, stop)
        skip `start` elements, then give `stop - start` elements,
        unless `stop` is null, then emit indefinitely

    If the iterator runs out early so will this.
*/
function* islice(iterable, start, stop) {
    const iter = iterable[Symbol.iterator]();
    // If stop is not defined then they're using the two argument variant
    if (stop === undefined) {
        stop = start;
        start = 0;
    }
    // Skip elements until start
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of range(start)) {
        const res = iter.next();
        if (res.done)
            return;
    }
    // Emit elements
    if (stop === null) {
        yield* iter;
    }
    else {
        for (let i = start; i < stop; i++) {
            const res = iter.next();
            if (res.done)
                return;
            else
                yield res.value;
        }
    }
}
function* chain(...iterables) {
    for (const iter of iterables) {
        yield* iter[Symbol.iterator]();
    }
}
/** All permutations of n items from array */
function* permutationsWithReplacement(arr, n) {
    const len = arr.length;
    const counters = zeros(n);
    let index = 1;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of range(Math.pow(len, n))) {
        yield counters.map(i => arr[i]);
        for (const i of range(counters.length)) {
            if (index.mod(Math.pow(len, counters.length - 1 - i)) === 0)
                counters[i] = (counters[i] + 1).mod(len);
        }
        index++;
    }
}
function* map(arr, func) {
    for (const v of arr)
        yield func(v);
}
// Returns an array of unique elements.
function unique(arr) {
    return arr.reduce((acc, cur) => {
        if (!acc.includes(cur))
            acc.push(cur);
        return acc;
    }, []);
}
/** Yield values that are unique under hasher(value) */
function* uniqueBy(arr, hasher) {
    const hashes = new Set();
    for (const e of arr) {
        const hash = hasher(e);
        if (!hashes.has(hash)) {
            yield e;
            hashes.add(hash);
        }
    }
}
/** Drop from iterable until predicate is false */
function* dropwhile(iterable, predicate) {
    let allmatched = true;
    for (const elem of iterable) {
        if (!(allmatched && predicate(elem))) {
            allmatched = false;
            yield elem;
        }
    }
}
/** Take from iterable until predicate is false */
function* takewhile(iterable, predicate) {
    for (const elem of iterable) {
        if (predicate(elem)) {
            yield elem;
        }
        else {
            return;
        }
    }
}


/***/ }),

/***/ "./src/lib/keyseq.ts":
/*!***************************!*\
  !*** ./src/lib/keyseq.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MinimalKey": () => (/* binding */ MinimalKey),
/* harmony export */   "stripOnlyModifiers": () => (/* binding */ stripOnlyModifiers),
/* harmony export */   "parse": () => (/* binding */ parse),
/* harmony export */   "completions": () => (/* binding */ completions),
/* harmony export */   "bracketexprToKey": () => (/* binding */ bracketexprToKey),
/* harmony export */   "mapstrToKeyseq": () => (/* binding */ mapstrToKeyseq),
/* harmony export */   "commandKey2jsKey": () => (/* binding */ commandKey2jsKey),
/* harmony export */   "mozMapToMinimalKey": () => (/* binding */ mozMapToMinimalKey),
/* harmony export */   "minimalKeyToMozMap": () => (/* binding */ minimalKeyToMozMap),
/* harmony export */   "mapstrMapToKeyMap": () => (/* binding */ mapstrMapToKeyMap),
/* harmony export */   "translateKeysInPlace": () => (/* binding */ translateKeysInPlace),
/* harmony export */   "keyMap": () => (/* binding */ keyMap),
/* harmony export */   "hasModifiers": () => (/* binding */ hasModifiers),
/* harmony export */   "hasNonShiftModifiers": () => (/* binding */ hasNonShiftModifiers),
/* harmony export */   "isSimpleKey": () => (/* binding */ isSimpleKey),
/* harmony export */   "translateKeysUsingKeyTranslateMap": () => (/* binding */ translateKeysUsingKeyTranslateMap)
/* harmony export */ });
/* harmony import */ var _src_lib_itertools__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/itertools */ "./src/lib/itertools.ts");
/* harmony import */ var _src_lib_nearley_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/nearley_utils */ "./src/lib/nearley_utils.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/propOr.js");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/invertObj.js");
/* harmony import */ var _src_grammars_bracketexpr_generated__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/grammars/.bracketexpr.generated */ "./src/grammars/.bracketexpr.generated.ts");
/** Key-sequence parser

    If `map` is a Map of `MinimalKey[]` to objects (exstrs or callbacks)
    and `keyseq` is an array of [[MinimalKey]] compatible objects...

     - `parse(keyseq, map)` returns the mapped object and a count OR a prefix
       of `MinimalKey[]` (possibly empty) that, if more keys are pressed, could
       map to an object.
     - `completions(keyseq, map)` returns the fragment of `map` that keyseq is
       a valid prefix of.
     - `mapstrToKeySeq` generates KeySequences for the rest of the API.

    No key sequence in a `map` may be a prefix of another key sequence in that
    map. This is a point of difference from Vim that removes any time-dependence
    in the parser. Vimperator, Pentadactyl, saka-key, etc, all share this
    limitation.

    If a key is represented by a single character then the shift modifier state
    is ignored unless other modifiers are also present.

*/
/** */





const bracketexpr_grammar = _src_grammars_bracketexpr_generated__WEBPACK_IMPORTED_MODULE_3__.default;
const bracketexpr_parser = new _src_lib_nearley_utils__WEBPACK_IMPORTED_MODULE_1__.Parser(bracketexpr_grammar);
class MinimalKey {
    constructor(key, modifiers) {
        this.key = key;
        this.altKey = false;
        this.ctrlKey = false;
        this.metaKey = false;
        this.shiftKey = false;
        if (modifiers !== undefined) {
            for (const mod of Object.keys(modifiers)) {
                this[mod] = modifiers[mod];
            }
        }
    }
    /** Does this key match a given MinimalKey extending object? */
    match(keyevent) {
        // 'in' doesn't include prototypes, so it's safe for this object.
        for (const attr in this) {
            // Don't check shiftKey for normal keys.
            if (attr === "shiftKey" && this.key.length === 1)
                continue;
            if (this[attr] !== keyevent[attr])
                return false;
        }
        return true;
    }
    toMapstr() {
        let str = "";
        let needsBrackets = this.key.length > 1;
        // Format modifiers
        const modifiers = new Map([
            ["A", "altKey"],
            ["C", "ctrlKey"],
            ["M", "metaKey"],
            ["S", "shiftKey"],
        ]);
        for (const [letter, attr] of modifiers.entries()) {
            if (this[attr]) {
                str += letter;
                needsBrackets = true;
            }
        }
        if (str) {
            str += "-";
        }
        let key = this.key;
        if (key === " ") {
            key = "Space";
            needsBrackets = true;
        }
        // Format the rest
        str += key;
        if (needsBrackets) {
            str = "<" + str + ">";
        }
        return str;
    }
}
function splitNumericPrefix(keyseq) {
    // If the first key is in 1:9, partition all numbers until you reach a non-number.
    if (!hasModifiers(keyseq[0]) &&
        [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(keyseq[0].key))) {
        const prefix = [keyseq[0]];
        for (const ke of keyseq.slice(1)) {
            if (!hasModifiers(ke) &&
                [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(ke.key)))
                prefix.push(ke);
            else
                break;
        }
        const rest = keyseq.slice(prefix.length);
        return [prefix, rest];
    }
    else {
        return [[], keyseq];
    }
}
function stripOnlyModifiers(keyseq) {
    return keyseq.filter(key => !["Control", "Shift", "Alt", "AltGraph", "Meta"].includes(key.key));
}
function parse(keyseq, map) {
    // Remove bare modifiers
    keyseq = stripOnlyModifiers(keyseq);
    // If the keyseq is now empty, abort.
    if (keyseq.length === 0)
        return { keys: [], isMatch: false };
    // Split into numeric prefix and non-numeric suffix
    let numericPrefix;
    [numericPrefix, keyseq] = splitNumericPrefix(keyseq);
    // If keyseq is a prefix of a key in map, proceed, else try dropping keys
    // from keyseq until it is empty or is a prefix.
    let possibleMappings = completions(keyseq, map);
    while (possibleMappings.size === 0 && keyseq.length > 0) {
        keyseq.shift();
        numericPrefix = [];
        possibleMappings = completions(keyseq, map);
    }
    if (possibleMappings.size > 0) {
        // Check if any of the mappings is a perfect match (this will only
        // happen if some sequences in the KeyMap are prefixes of other seqs).
        try {
            const perfect = (0,_src_lib_itertools__WEBPACK_IMPORTED_MODULE_0__.find)(possibleMappings, ([k, _v]) => k.length === keyseq.length);
            return {
                value: perfect[1],
                exstr: perfect[1] + numericPrefixToExstrSuffix(numericPrefix),
                isMatch: true,
                numericPrefix: numericPrefix.length
                    ? Number(numericPrefix.map(ke => ke.key).join(""))
                    : undefined,
                keys: [],
            };
        }
        catch (e) {
            if (!(e instanceof RangeError))
                throw e;
        }
    }
    // keyseq is the longest suffix of keyseq that is the prefix of a
    // command, numericPrefix is a numeric prefix of that. We want to
    // preserve that whole thing, so concat them back together before
    // returning.
    return { keys: numericPrefix.concat(keyseq), isMatch: keyseq.length > 0 };
}
/** True if seq1 is a prefix or equal to seq2 */
function prefixes(seq1, seq2) {
    if (seq1.length > seq2.length) {
        return false;
    }
    else {
        for (const [key1, key2] of (0,_src_lib_itertools__WEBPACK_IMPORTED_MODULE_0__.izip)(seq1, seq2)) {
            if (!key2.match(key1))
                return false;
        }
        return true;
    }
}
/** returns the fragment of `map` that keyseq is a valid prefix of. */
function completions(keyseq, map) {
    return new Map((0,_src_lib_itertools__WEBPACK_IMPORTED_MODULE_0__.filter)(map.entries(), ([ks, _maptarget]) => prefixes(keyseq, ks)));
}
// }}}
// {{{ mapStrToKeySeq stuff
/** Expand special key aliases that Vim provides to canonical values

    Vim aliases are case insensitive.
*/
function expandAliases(key) {
    // Vim compatibility aliases
    const aliases = {
        cr: "Enter",
        esc: "Escape",
        return: "Enter",
        enter: "Enter",
        space: " ",
        bar: "|",
        del: "Delete",
        bs: "Backspace",
        lt: "<",
    };
    if (key.toLowerCase() in aliases)
        return aliases[key.toLowerCase()];
    else
        return key;
}
/** String starting with a `<` to MinimalKey and remainder.

    Bracket expressions generally start with a `<` contain no angle brackets or
    whitespace and end with a `>.` These special-cased expressions are also
    permitted: `<{modifier}<>`, `<{modifier}>>`, and `<{modifier}->`.

    If the string passed does not match this definition, it is treated as a
    literal `<.`

    Backus Naur approximation:

    ```
        - bracketexpr ::= '<' modifier? key '>'
        - modifier ::= 'm'|'s'|'a'|'c' '-'
        - key ::= '<'|'>'|/[^\s<>-]+/
    ```

    See `src/grammars/bracketExpr.ne` for the canonical definition.

    Modifiers are case insensitive.

    Some case insensitive vim compatibility aliases are also defined, see
    [[expandAliases]].

    Compatibility breaks:

    Shift + key must use the correct capitalisation of key:
        `<S-j> != J, <S-J> == J`.

    In Vim `<A-x> == <M-x>` on most systems. Not so here: we can't detect
    platform, so just have to use what the browser gives us.

    Vim has a predefined list of special key sequences, we don't: there are too
    many (and they're non-standard) [1].

    In the future, we may just use the names as defined in keyNameList.h [2].

    In Vim, you're still allowed to use `<lt>` within angled brackets:
        `<M-<> == <M-lt> == <M-<lt>>`
    Here only the first two will work.

    Restrictions:

    It is not possible to map to a keyevent that actually sends the key value
    of any of the aliases or to any multi-character sequence containing a space
    or `>.` It is unlikely that browsers will ever do either of those things.

    [1]: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
    [2]: https://searchfox.org/mozilla-central/source/dom/events/KeyNameList.h

*/
function bracketexprToKey(inputStr) {
    if (inputStr.indexOf(">") > 0) {
        try {
            const [[modifiers, key], remainder,] = bracketexpr_parser.feedUntilError(inputStr);
            return [new MinimalKey(expandAliases(key), modifiers), remainder];
        }
        catch (e) {
            // No valid bracketExpr
            return [new MinimalKey("<"), inputStr.slice(1)];
        }
    }
    else {
        // No end bracket to match == no valid bracketExpr
        return [new MinimalKey("<"), inputStr.slice(1)];
    }
}
/** Generate KeySequences for the rest of the API.

    A map expression is something like:

    ```
    j scrollline 10
    <C-f> scrollpage 0.5
    <C-d> scrollpage 0.5
    <C-/><C-n> mode normal
    ```

    A mapstr is the bit before the space.

    mapstrToKeyseq turns a mapstr into a keySequence that looks like this:

    ```
    [MinimalKey {key: 'j'}]
    [MinimalKey {key: 'f', ctrlKey: true}]
    [MinimalKey {key: 'd', ctrlKey: true}]
    [MinimalKey {key: '/', ctrlKey: true}, MinimalKey {key: 'n', ctrlKey: true}]
    ```

    (All four {modifier}Key flags are actually provided on all MinimalKeys)
*/
function mapstrToKeyseq(mapstr) {
    const keyseq = [];
    let key;
    // Reduce mapstr by one character or one bracket expression per iteration
    while (mapstr.length) {
        if (mapstr[0] === "<") {
            ;
            [key, mapstr] = bracketexprToKey(mapstr);
            keyseq.push(key);
        }
        else {
            keyseq.push(new MinimalKey(mapstr[0]));
            mapstr = mapstr.slice(1);
        }
    }
    return keyseq;
}
const commandKey2jsKey = {
    Comma: ",",
    Period: ".",
    Up: "ArrowUp",
    Down: "ArrowDown",
    Left: "ArrowLeft",
    Right: "ArrowRight",
    Space: " ",
};
/*
 * Convert a Commands API shortcut string to a MinimalKey. NB: no error checking done, media keys probably unsupported.
 */
function mozMapToMinimalKey(mozmap) {
    const arr = mozmap.split("+");
    const modifiers = {
        altKey: arr.includes("Alt"),
        ctrlKey: arr.includes("MacCtrl"),
        shiftKey: arr.includes("Shift"),
        metaKey: arr.includes("Command"),
    };
    let key = arr[arr.length - 1];
    key = ramda__WEBPACK_IMPORTED_MODULE_4__.default(key.toLowerCase(), key, commandKey2jsKey);
    // TODO: support mediakeys: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#Media_keys
    return new MinimalKey(key, modifiers);
}
/*
 * Convert a minimal key to a Commands API compatible bind. NB: no error checking done.
 *
 * Ctrl-key behaviour on Mac may be surprising.
 */
function minimalKeyToMozMap(key) {
    const mozMap = [];
    key.altKey && mozMap.push("Alt");
    key.ctrlKey && mozMap.push("MacCtrl");
    key.shiftKey && mozMap.push("Shift");
    key.metaKey && mozMap.push("Command");
    const jsKey2commandKey = ramda__WEBPACK_IMPORTED_MODULE_5__.default(commandKey2jsKey);
    mozMap.push(ramda__WEBPACK_IMPORTED_MODULE_4__.default(key.key.toUpperCase(), key.key, jsKey2commandKey));
    return mozMap.join("+");
}
/** Convert a map of mapstrs (e.g. from config) to a KeyMap */
function mapstrMapToKeyMap(mapstrMap) {
    const newKeyMap = new Map();
    for (const [mapstr, target] of mapstrMap.entries()) {
        newKeyMap.set(mapstrToKeyseq(mapstr), target);
    }
    return newKeyMap;
}
let KEYMAP_CACHE = {};
function translateKeysInPlace(keys, conf) {
    // If so configured, translate keys using the key translation map
    if (_src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("keytranslatemodes")[conf] === "true") {
        const translationmap = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("keytranslatemap");
        translateKeysUsingKeyTranslateMap(keys, translationmap);
    }
}
/**
 * Return a "*maps" config converted into sequences of minimalkeys (e.g. "nmaps")
 */
function keyMap(conf) {
    if (KEYMAP_CACHE[conf])
        return KEYMAP_CACHE[conf];
    // Fail silently and pass keys through to page if Tridactyl hasn't loaded yet
    if (!_src_lib_config__WEBPACK_IMPORTED_MODULE_2__.INITIALISED)
        return new Map();
    const mapobj = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get(conf);
    if (mapobj === undefined)
        throw new Error("No binds defined for this mode. Reload page with <C-r> and add binds, e.g. :bind --mode=[mode] <Esc> mode normal");
    // Convert to KeyMap
    const maps = new Map(Object.entries(mapobj));
    KEYMAP_CACHE[conf] = mapstrMapToKeyMap(maps);
    return KEYMAP_CACHE[conf];
}
// }}}
// {{{ Utility functions for dealing with KeyboardEvents
function hasModifiers(keyEvent) {
    return (keyEvent.ctrlKey ||
        keyEvent.altKey ||
        keyEvent.metaKey ||
        keyEvent.shiftKey);
}
/** shiftKey is true for any capital letter, most numbers, etc. Generally care about other modifiers. */
function hasNonShiftModifiers(keyEvent) {
    return keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey;
}
/** A simple key event is a non-special key (length 1) that is not modified by ctrl, alt, or shift. */
function isSimpleKey(keyEvent) {
    return !(keyEvent.key.length > 1 || hasNonShiftModifiers(keyEvent));
}
function numericPrefixToExstrSuffix(numericPrefix) {
    if (numericPrefix.length > 0) {
        return " " + numericPrefix.map(k => k.key).join("");
    }
    else {
        return "";
    }
}
/**
 * Translates the given set of keyEvents (in place) as specified by
 * the given key translation map. All keys *and* values in the key
 * translation map must be length-1 strings.
 */
function translateKeysUsingKeyTranslateMap(keyEvents, keytranslatemap) {
    for (let index = 0; index < keyEvents.length; index++) {
        const keyEvent = keyEvents[index];
        const newkey = keytranslatemap[keyEvent.key];
        // KeyboardEvents can't have been translated, MinimalKeys may
        // have been. We can't add anything to the MinimalKey without
        // breaking a ton of other stuff, so instead we'll just assume
        // that the only way we've gotten a MinimalKey is if the key
        // has already been translated. We err way on the side of
        // safety becase translating anything more than once would
        // almost certainly mean oscillations and other super-weird
        // breakage.
        const neverTranslated = keyEvent instanceof KeyboardEvent;
        if (neverTranslated && newkey !== undefined) {
            // We can't update the keyEvent in place. However, the
            // entire pipeline works with MinimalKeys all the way
            // through, so we just swap the key event out for a new
            // MinimalKey with the right key and modifiers copied from
            // the original.
            keyEvents[index] = new MinimalKey(newkey, {
                altKey: keyEvent.altKey,
                ctrlKey: keyEvent.ctrlKey,
                metaKey: keyEvent.metaKey,
                shiftKey: keyEvent.shiftKey,
            });
        }
    }
}
// }}}
browser.storage.onChanged.addListener((changes) => {
    if ("userconfig" in changes) {
        KEYMAP_CACHE = {};
    }
});


/***/ }),

/***/ "./src/lib/logging.ts":
/*!****************************!*\
  !*** ./src/lib/logging.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Logger": () => (/* binding */ Logger),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/**
 * Helper functions for logging
 */

const LevelToNum = new Map();
LevelToNum.set("never", 0);
LevelToNum.set("error", 1);
LevelToNum.set("warning", 2);
LevelToNum.set("info", 3);
LevelToNum.set("debug", 4);
class Logger {
    /**
     * Config-aware Logger class.
     *
     * @param logModule     the logging module name: this is ued to look up the
     *                      configured/default level in the user config
     */
    constructor(logModule) {
        this.logModule = logModule;
    }
    /**
     * Config-aware logging function.
     *
     * @param level         the level of the logging - if <= configured, the message
     *                      will be shown
     *
     * @return              logging function: this is returned as a function to
     *                      retain the call site
     */
    log(level) {
        const configedLevel = _src_lib_config__WEBPACK_IMPORTED_MODULE_0__.get("logging", this.logModule);
        if (LevelToNum.get(level) <= LevelToNum.get(configedLevel)) {
            // hand over to console.log, error or debug as needed
            switch (level) {
                case "error":
                    // TODO: replicate this for other levels, don't steal focus
                    // work out how to import messaging/webext without breaking everything
                    return async (...message) => {
                        console.error(...message);
                        return browser.runtime.sendMessage({
                            type: "controller_background",
                            command: "acceptExCmd",
                            args: [
                                "fillcmdline_nofocus # " + message.join(" "),
                            ],
                        });
                    };
                case "warning":
                    return console.warn;
                case "info":
                    return console.log;
                case "debug":
                    return console.debug;
            }
        }
        // do nothing with the message
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return function () { };
    }
    // These are all getters so that logger.debug = console.debug and
    // logger.debug('blah') translates into console.debug('blah') with the
    // filename and line correct.
    get debug() {
        return this.log("debug");
    }
    get info() {
        return this.log("info");
    }
    get warning() {
        return this.log("warning");
    }
    get error() {
        return this.log("error");
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Logger);


/***/ }),

/***/ "./src/lib/math.ts":
/*!*************************!*\
  !*** ./src/lib/math.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "log": () => (/* binding */ log),
/* harmony export */   "linspace": () => (/* binding */ linspace),
/* harmony export */   "buckets": () => (/* binding */ buckets),
/* harmony export */   "bucketize": () => (/* binding */ bucketize)
/* harmony export */ });
function log(x, base) {
    return Math.log(x) / Math.log(base);
}
// Copied from Numeric Javascript under the MIT license
// https://github.com/sloisel/numeric/blob/656fa1254be540f428710738ca9c1539625777f1/src/numeric.js#L922
function linspace(a, b, n) {
    if (typeof n === "undefined")
        n = Math.max(Math.round(b - a) + 1, 1);
    if (n < 2) {
        return n === 1 ? [a] : [];
    }
    let i;
    const ret = Array(n);
    n--;
    for (i = n; i >= 0; i--) {
        ret[i] = (i * b + (n - i) * a) / n;
    }
    return ret;
}
function buckets(values, numBuckets) {
    const min = values.reduce((a, b) => Math.min(a, b));
    const max = values.reduce((a, b) => Math.max(a, b));
    return linspace(min, max, numBuckets);
}
function bucketize(values, buckets) {
    // Init result storage
    const result = new Map();
    for (const bucketval of buckets) {
        result.set(bucketval, 0);
    }
    // We place a value in a bucket by going through the buckets from
    // smallest to largest, finding the smallest bucket that's larger
    // than or equal to than the value. This will have the following
    // results:
    //
    // * A value that's larger than all bucket values will not be
    //   placed at all.
    // * A value with exactly the value of the largest bucket will be
    //   placed in the largest bucket.
    // * A value with exactly the value of the smallest bucket will be
    //   placed in the smallest bucket.
    // * A value that's smaller than all bucket values will be placed
    //   in the smallest bucket.
    //
    // If we build our buckets as linspace(min(values), max(values)),
    // then this means that the largest bucket is guaranteed to have
    // exactly one element in it.
    const placeValue = (val) => {
        for (const bucketval of buckets) {
            if (bucketval >= val) {
                result.set(bucketval, result.get(bucketval) + 1);
                return;
            }
        }
    };
    // Bucketize every value.
    for (const val of values) {
        placeValue(val);
    }
    // Return just the counts in each bucket
    return result;
}


/***/ }),

/***/ "./src/lib/messaging.ts":
/*!******************************!*\
  !*** ./src/lib/messaging.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "attributeCaller": () => (/* binding */ attributeCaller),
/* harmony export */   "setupListener": () => (/* binding */ setupListener),
/* harmony export */   "message": () => (/* binding */ message),
/* harmony export */   "messageActiveTab": () => (/* binding */ messageActiveTab),
/* harmony export */   "messageTab": () => (/* binding */ messageTab),
/* harmony export */   "messageOwnTab": () => (/* binding */ messageOwnTab),
/* harmony export */   "messageAllTabs": () => (/* binding */ messageAllTabs),
/* harmony export */   "addListener": () => (/* binding */ addListener)
/* harmony export */ });
/* harmony import */ var _src_lib_webext__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/webext */ "./src/lib/webext.ts");
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");


const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_1__.default("messaging");
// Calls methods on obj that match .command and sends responses back
function attributeCaller(obj) {
    function handler(message, sender, sendResponse) {
        logger.debug(message);
        // Args may be undefined, but you can't spread undefined...
        if (message.args === undefined)
            message.args = [];
        // Call command on obj
        try {
            const response = obj[message.command](...message.args);
            // Return response to sender
            if (response instanceof Promise) {
                logger.debug("Returning promise...", response);
                sendResponse(response);
                // Docs say you should be able to return a promise, but that
                // doesn't work.
                /* return response */
            }
            else if (response !== undefined) {
                logger.debug("Returning synchronously...", response);
                sendResponse(response);
            }
        }
        catch (e) {
            logger.error(`Error processing ${message.command}(${message.args})`, e);
            return Promise.reject(e);
        }
    }
    return handler;
}
function backgroundHandler(root, message) {
    return root[message.type][message.command](...message.args);
}
function setupListener(root) {
    browser.runtime.onMessage.addListener((message) => {
        if (message.type in root) {
            if (!(message.command in root[message.type]))
                throw new Error(`missing handler in protocol ${message.type} ${message.command}`);
            if (!Array.isArray(message.args))
                throw new Error(`wrong arguments in protocol ${message.type} ${message.command}`);
            return Promise.resolve(backgroundHandler(root, message));
        }
    });
}
// type StripPromise<T> = T extends Promise<infer U> ? U : T
/** Send a message to non-content scripts */
async function message(type, command, ...args) {
    const message = {
        type,
        command,
        args,
    };
    // Typescript didn't like this
    // return browser.runtime.sendMessage<typeof message, StripPromise<ReturnType<F>>>(message)
    return browser.runtime.sendMessage(message);
}
/** Message the active tab of the currentWindow */
async function messageActiveTab(type, command, args) {
    return messageTab(await (0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_0__.activeTabId)(), type, command, args);
}
async function messageTab(tabId, type, command, args) {
    const message = {
        type,
        command,
        args,
    };
    return _src_lib_webext__WEBPACK_IMPORTED_MODULE_0__.browserBg.tabs.sendMessage(tabId, message);
}
let _ownTabId;
async function messageOwnTab(type, command, args) {
    if (_ownTabId === undefined) {
        _ownTabId = await (0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_0__.ownTabId)();
    }
    if (_ownTabId === undefined)
        throw new Error("Can't message own tab: _ownTabId is undefined");
    return messageTab(_ownTabId, type, command, args);
}
async function messageAllTabs(type, command, args) {
    const responses = [];
    for (const tab of await _src_lib_webext__WEBPACK_IMPORTED_MODULE_0__.browserBg.tabs.query({})) {
        try {
            responses.push(await messageTab(tab.id, type, command, args));
        }
        catch (e) {
            // Skip errors caused by tabs we aren't running on
            if (e.message !=
                "Could not establish connection. Receiving end does not exist.") {
                logger.error(e);
            }
        }
    }
    return responses;
}
const listeners = new Map();
/** Register a listener to be called for each message with type */
function addListener(type, callback) {
    if (!listeners.get(type)) {
        listeners.set(type, new Set());
    }
    listeners.get(type).add(callback);
    return () => {
        listeners.get(type).delete(callback);
    };
}
if ((0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_0__.getContext)() === "background") {
    // Warning: lib/webext.ts:ownTab() relies on this listener being added in order to work
    addListener("owntab_background", (message, sender, sendResponse) => {
        const x = Object.assign(Object.create(null), sender.tab);
        x.mutedInfo = Object.assign(Object.create(null), sender.tab.mutedInfo);
        x.sharingState = Object.assign(Object.create(null), sender.tab.sharingState);
        sendResponse(Promise.resolve(x));
    });
}
/** Recv a message from runtime.onMessage and send to all listeners */
function onMessage(message, sender, sendResponse) {
    if (listeners.get(message.type)) {
        for (const listener of listeners.get(message.type)) {
            listener(message, sender, sendResponse);
        }
    }
}
browser.runtime.onMessage.addListener(onMessage);


/***/ }),

/***/ "./src/lib/native.ts":
/*!***************************!*\
  !*** ./src/lib/native.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getrcpath": () => (/* binding */ getrcpath),
/* harmony export */   "getrc": () => (/* binding */ getrc),
/* harmony export */   "getNativeMessengerVersion": () => (/* binding */ getNativeMessengerVersion),
/* harmony export */   "getBestEditor": () => (/* binding */ getBestEditor),
/* harmony export */   "nativegate": () => (/* binding */ nativegate),
/* harmony export */   "inpath": () => (/* binding */ inpath),
/* harmony export */   "firstinpath": () => (/* binding */ firstinpath),
/* harmony export */   "editor": () => (/* binding */ editor),
/* harmony export */   "read": () => (/* binding */ read),
/* harmony export */   "write": () => (/* binding */ write),
/* harmony export */   "writerc": () => (/* binding */ writerc),
/* harmony export */   "mkdir": () => (/* binding */ mkdir),
/* harmony export */   "temp": () => (/* binding */ temp),
/* harmony export */   "move": () => (/* binding */ move),
/* harmony export */   "listDir": () => (/* binding */ listDir),
/* harmony export */   "winFirefoxRestart": () => (/* binding */ winFirefoxRestart),
/* harmony export */   "run": () => (/* binding */ run),
/* harmony export */   "runAsync": () => (/* binding */ runAsync),
/* harmony export */   "pyeval": () => (/* binding */ pyeval),
/* harmony export */   "getenv": () => (/* binding */ getenv),
/* harmony export */   "clipboard": () => (/* binding */ clipboard),
/* harmony export */   "ff_cmdline": () => (/* binding */ ff_cmdline),
/* harmony export */   "parseProfilesIni": () => (/* binding */ parseProfilesIni),
/* harmony export */   "getFirefoxDir": () => (/* binding */ getFirefoxDir),
/* harmony export */   "getProfileUncached": () => (/* binding */ getProfileUncached),
/* harmony export */   "getProfile": () => (/* binding */ getProfile),
/* harmony export */   "getProfileName": () => (/* binding */ getProfileName),
/* harmony export */   "getProfileDir": () => (/* binding */ getProfileDir),
/* harmony export */   "parsePrefs": () => (/* binding */ parsePrefs),
/* harmony export */   "loadPrefs": () => (/* binding */ loadPrefs),
/* harmony export */   "getPrefs": () => (/* binding */ getPrefs),
/* harmony export */   "getPref": () => (/* binding */ getPref),
/* harmony export */   "getConfElsePref": () => (/* binding */ getConfElsePref),
/* harmony export */   "getConfElsePrefElseDefault": () => (/* binding */ getConfElsePrefElseDefault),
/* harmony export */   "writePref": () => (/* binding */ writePref),
/* harmony export */   "removePref": () => (/* binding */ removePref),
/* harmony export */   "unfixamo": () => (/* binding */ unfixamo)
/* harmony export */ });
/* harmony import */ var semver_compare__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! semver-compare */ "./node_modules/semver-compare/index.js");
/* harmony import */ var semver_compare__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(semver_compare__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/webext */ "./src/lib/webext.ts");
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");
/**
 * Background functions for the native messenger interface
 */




const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_3__.default("native");
const NATIVE_NAME = "tridactyl";
/**
 * Posts using the one-time message API; native is killed after message returns
 */
async function sendNativeMsg(cmd, opts, quiet = false) {
    const send = Object.assign({ cmd }, opts);
    let resp;
    logger.info(`Sending message: ${JSON.stringify(send)}`);
    try {
        resp = await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.sendNativeMessage(NATIVE_NAME, send);
        logger.info(`Received response:`, resp);
        return resp;
    }
    catch (e) {
        if (!quiet) {
            throw new Error("Failed to send message to native messenger. If it is correctly installed (run `:native`), please report this bug on https://github.com/tridactyl/tridactyl/issues .");
        }
    }
}
async function getrcpath(separator = "auto") {
    const res = await sendNativeMsg("getconfigpath", {});
    if (res.code !== 0)
        throw new Error("getrcpath error: " + res.code);
    if (separator == "unix" &&
        (await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os == "win") {
        return res.content.replace(/\\/g, "/");
    }
    else {
        return res.content;
    }
}
async function getrc() {
    const res = await sendNativeMsg("getconfig", {});
    if (res.content && !res.error) {
        logger.info(`Successfully retrieved fs config:\n${res.content}`);
        return res.content;
    }
    else {
        // Have to make this a warning as async exceptions apparently don't get caught
        logger.info(`Error in retrieving config: ${res.error}`);
    }
}
let NATIVE_VERSION_CACHE;
async function getNativeMessengerVersion(quiet = false) {
    if (NATIVE_VERSION_CACHE !== undefined) {
        return NATIVE_VERSION_CACHE;
    }
    const res = await sendNativeMsg("version", {}, quiet);
    if (res === undefined) {
        if (quiet)
            return undefined;
        throw new Error(`Error retrieving version: ${res.error}`);
    }
    if (res.version && !res.error) {
        logger.info(`Native version: ${res.version}`);
        NATIVE_VERSION_CACHE = res.version.toString();
        // Wipe cache after 500ms
        setTimeout(() => (NATIVE_VERSION_CACHE = undefined), 500);
        return NATIVE_VERSION_CACHE;
    }
}
async function getBestEditor() {
    const gui_candidates = [];
    const term_emulators = [];
    const tui_editors = [];
    const last_resorts = [];
    const os = (await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os;
    const arg_quote = os === "win" ? '"' : "'";
    const vim_positioning_arg = ` ${arg_quote}+normal!%lGzv%c|${arg_quote}`;
    if (os === "mac") {
        gui_candidates.push(...[
            "/Applications/MacVim.app/Contents/bin/mvim -f" +
                vim_positioning_arg,
            "/usr/local/bin/vimr --wait --nvim +only",
        ]);
        // if anyone knows of any "sensible" terminals that let you send them commands to run,
        // please let us know in issue #451!
        term_emulators.push(...[
            "/Applications/cool-retro-term.app/Contents/MacOS/cool-retro-term -e",
        ]);
        last_resorts.push(...["open -nWt"]);
    }
    else {
        // Tempted to put this behind another config setting: prefergui
        gui_candidates.push(...["gvim -f" + vim_positioning_arg]);
        // These terminal emulators can't normally be run on Windows, usually because they require X11.
        if (os === "linux" || os === "openbsd") {
            term_emulators.push(...[
                // we generally try to give the terminal the class "tridactyl_editor" so that
                // it can be made floating, e.g in i3:
                // for_window [class="tridactyl_editor"] floating enable border pixel 1
                "st -c tridactyl_editor",
                "xterm -class tridactyl_editor -e",
                "uxterm -class tridactyl_editor -e",
                "urxvt -e",
                'termite --class tridactyl_editor -e "%c"',
                "sakura --class tridactyl_editor -e",
                "lilyterm -e",
                "mlterm -N tridactyl_editor -e",
                "roxterm -e",
                "cool-retro-term -e",
                // Terminator doesn't appear to honour -c, but the option is
                // documented in its manpage and seems to cause no errors when supplied.
                'terminator -u -c tridactyl_editor -e "%c"',
            ]);
        }
        if (os === "win") {
            term_emulators.push(...["conemu -run", "mintty --class tridactyl_editor -e"]);
            if (await nativegate("0.2.1", false)) {
                term_emulators.push("start /wait");
            }
        }
        // These terminal emulators are cross-platform.
        term_emulators.push(...[
            "alacritty --class tridactyl_editor -e",
        ]);
        last_resorts.push(...[
            "emacs",
            "gedit",
            "kate",
            "sublime",
            "atom -w",
            "code -nw",
            "abiword",
            "notepad",
        ]);
    }
    tui_editors.push(...[
        "vim" + vim_positioning_arg,
        "nvim" + vim_positioning_arg,
        "nano %f",
        "emacs -nw %f",
    ]);
    // Try GUI editors.
    const guicmd = await firstinpath(gui_candidates);
    if (guicmd) {
        return guicmd;
    }
    // Try TUI editors.
    const termcmd = await firstinpath(term_emulators);
    const tuicmd = await firstinpath(tui_editors);
    if (termcmd && tuicmd) {
        if (termcmd.includes("%c")) {
            return tuicmd.replace("%c", tuicmd);
        }
        else {
            return termcmd + " " + tuicmd;
        }
    }
    // If all else fails, try some stupid stuff to scare users into setting
    // their editorcmd.
    return await firstinpath(last_resorts);
}
/**
 * Used internally to gate off functions that use the native messenger. Gives a
 * helpful error message in the command line if the native messenger is not
 * installed, or is the wrong version.
 *
 * @arg version: A string representing the minimal required version.
 * @arg interactive: True if a message should be displayed on version mismatch.
 * @return false if the required version is higher than the currently available
 * native messenger version.
 */
async function nativegate(version = "0", interactive = true, desiredOS = ["mac", "win", "linux", "openbsd"]) {
    if (!desiredOS.includes((await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os)) {
        if (interactive) {
            logger.error("# Tridactyl's native messenger doesn't support your operating system, yet.");
        }
        return false;
    }
    try {
        const actualVersion = await getNativeMessengerVersion();
        if (actualVersion !== undefined) {
            if (semver_compare__WEBPACK_IMPORTED_MODULE_0___default()(version, actualVersion) > 0) {
                if (interactive)
                    logger.error("# Please update to native messenger " +
                        version +
                        ", for example by running `:updatenative`.");
                // TODO: add update procedure and document here.
                return false;
            }
            return true;
        }
        else if (interactive)
            logger.error("# Native messenger not found. Please run `:installnative` and follow the instructions.");
        return false;
    }
    catch (e) {
        if (interactive)
            logger.error("# Native messenger not found. Please run `:installnative` and follow the instructions.");
        return false;
    }
}
async function inpath(cmd) {
    const pathcmd = (await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os === "win"
        ? "where "
        : "which ";
    return (await run(pathcmd + cmd.split(" ")[0])).code === 0;
}
async function firstinpath(cmdarray) {
    let ind = 0;
    let cmd = cmdarray[ind];
    // Try to find a text editor
    while (!(await inpath(cmd.split(" ")[0]))) {
        ind++;
        cmd = cmdarray[ind];
        if (cmd === undefined)
            break;
    }
    return cmd;
}
async function editor(file, line, col, content) {
    if (content !== undefined)
        await write(file, content);
    const editorcmd = (_src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("editorcmd") === "auto"
        ? await getBestEditor()
        : _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("editorcmd"))
        .replace(/%l/, line)
        .replace(/%c/, col);
    let exec;
    if (editorcmd.indexOf("%f") !== -1) {
        exec = await run(editorcmd.replace(/%f/, file));
    }
    else {
        exec = await run(editorcmd + " " + file);
    }
    if (exec.code != 0)
        return exec;
    return read(file);
}
async function read(file) {
    return sendNativeMsg("read", { file }).catch(e => {
        throw new Error(`Failed to read ${file}. ${e}`);
    });
}
async function write(file, content) {
    return sendNativeMsg("write", { file, content }).catch(e => {
        throw new Error(`Failed to write '${content}' to '${file}'. ${e}`);
    });
}
async function writerc(file, force, content) {
    return sendNativeMsg("writerc", { file, force, content }).catch(e => {
        throw new Error(`Failed to write '${content}' to '${file}'. ${e}`);
    });
}
async function mkdir(dir, exist_ok) {
    return sendNativeMsg("mkdir", { dir, exist_ok }).catch(e => {
        throw new Error(`Failed to create directory '${dir}'. ${e}`);
    });
}
async function temp(content, prefix) {
    return sendNativeMsg("temp", { content, prefix }).catch(e => {
        throw new Error(`Failed to write '${content}' to temp file '${prefix}'. ${e}`);
    });
}
async function move(from, to, overwrite, cleanup) {
    const requiredNativeMessengerVersion = "0.3.0";
    if ((await nativegate(requiredNativeMessengerVersion, false))) {
        return sendNativeMsg("move", { from, to, overwrite, cleanup }).catch(e => {
            throw new Error(`Failed to move '${from}' to '${to}'. ${e}.`);
        });
    }
    else {
        // older "saveas" scenario for native-messenger < 0.3.0
        return sendNativeMsg("move", { from, to }).catch(e => {
            throw new Error(`Failed to move '${from}' to '${to}'. ${e}.`);
        });
    }
}
async function listDir(dir) {
    return sendNativeMsg("list_dir", { path: dir }).catch(e => {
        throw new Error(`Failed to read directory '${dir}'. ${e}`);
    });
}
async function winFirefoxRestart(profiledir, browsercmd) {
    const required_version = "0.1.6";
    if (!(await nativegate(required_version, false))) {
        throw new Error(`'restart' on Windows needs native messenger version >= ${required_version}.`);
    }
    return sendNativeMsg("win_firefox_restart", { profiledir, browsercmd });
}
async function run(command, content = "") {
    const msg = await sendNativeMsg("run", { command, content });
    logger.info(msg);
    return msg;
}
async function runAsync(command) {
    const required_version = "0.3.1";
    if (!await nativegate(required_version, false)) {
        throw new Error(`runAsync needs native messenger version >= ${required_version}.`);
    }
    logger.info(await sendNativeMsg("run_async", { command }));
}
/** Evaluates a string in the native messenger. This has to be python code. If
 *  you want to run shell strings, use run() instead.
 *
 *  Only works for native messenger versions < 0.2.0.
 */
async function pyeval(command) {
    return sendNativeMsg("eval", { command });
}
async function getenv(variable) {
    const required_version = "0.1.2";
    if (!(await nativegate(required_version, false))) {
        throw new Error(`'getenv' needs native messenger version >= ${required_version}.`);
    }
    return (await sendNativeMsg("env", { var: variable })).content;
}
/** Calls an external program, to either set or get the content of the X selection.
 *  When setting the selection or if getting it failed, will return an empty string.
 **/
async function clipboard(action, str) {
    let clipcmd = await _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("externalclipboardcmd");
    if (clipcmd === "auto")
        clipcmd = await firstinpath(["xsel", "xclip"]);
    if (clipcmd === undefined) {
        throw new Error("Couldn't find an external clipboard executable");
    }
    if (action === "get") {
        const result = await run(clipcmd + " -o");
        if (result.code !== 0) {
            throw new Error(`External command failed with code ${result.code}: ${clipcmd}`);
        }
        return result.content;
    }
    else if (action === "set") {
        const required_version = "0.1.7";
        if (await nativegate(required_version, false)) {
            const result = await run(`${clipcmd} -i`, str);
            if (result.code !== 0)
                throw new Error(`External command failed with code ${result.code}: ${clipcmd}`);
            return "";
        }
        else {
            // Fall back to hacky old fashioned way
            // We're going to pretend that we don't know about stdin, and we need to insert str, which we can't trust, into the clipcmd
            // In order to do this safely we'll use here documents:
            // http://pubs.opengroup.org/onlinepubs/009695399/utilities/xcu_chap02.html#tag_02_07_04
            // Find a delimiter that isn't in str
            let heredoc = "TRIDACTYL";
            while (str.search(heredoc) !== -1)
                heredoc += Math.round(Math.random() * 10);
            // Use delimiter to insert str into clipcmd's stdin
            // We use sed to remove the newline added by the here document
            clipcmd = `sed -z 's/.$//' <<'${heredoc}' | ${clipcmd} -i \n${str}\n${heredoc}`;
            await run(clipcmd);
            return "";
        }
    }
    throw new Error("Unknown action!");
}
/**
 * This returns the commandline that was used to start Firefox.
 * You'll get both the binary (not necessarily an absolute path) and flags.
 */
async function ff_cmdline() {
    let output;
    if ((await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os === "win") {
        if (!(await nativegate("0.3.3", false))) {
            const browser_name = await _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("browser");
            output = await run(`powershell -NoProfile -Command "\
$processes = Get-CimInstance -Property ProcessId,ParentProcessId,Name,CommandLine -ClassName Win32_Process;\
if (-not ($processes | where { $_.Name -match '^${browser_name}' })) { exit 1; };\
$ppid = ($processes | where { $_.ProcessId -EQ $PID }).ParentProcessId;\
$pproc = $processes | where { $_.ProcessId -EQ $ppid };\
while ($pproc.Name -notmatch '^${browser_name}') {\
    $ppid = $pproc.ParentProcessId;\
    $pproc = $processes | where { $_.ProcessId -EQ $ppid };\
};\
Write-Output $pproc.CommandLine;\
"`);
        }
        else {
            output = await run(`powershell -NoProfile -Command "\
Get-CimInstance -Property CommandLine,ProcessId -ClassName Win32_Process \
| where { $_.ProcessId -EQ ${(await sendNativeMsg("ppid", {})).content} } \
| select -ExpandProperty CommandLine | Write-Output\
"`);
        }
    }
    else {
        const actualVersion = await getNativeMessengerVersion();
        // Backwards-compat for Python native messenger
        if (semver_compare__WEBPACK_IMPORTED_MODULE_0___default()("0.2.0", actualVersion) > 0) {
            output = await pyeval(
            // Using ' and + rather than ` because we don't want newlines
            'handleMessage({"cmd": "run", ' +
                '"command": "ps -p " + str(os.getppid()) + " -oargs="})["content"]');
        }
        else {
            const ppid = (await sendNativeMsg("ppid", {})).content.trim();
            output = await run("ps -p " + ppid + " -oargs=");
        }
        output.content = output.content.replace("\n", "");
    }
    return output.content.trim().split(" ");
}
async function parseProfilesIni(content, basePath) {
    const lines = content.split("\n");
    let current = "General";
    const result = {};
    for (const line of lines) {
        let match = /^\[([^\]]+)\]$/.exec(line);
        if (match !== null) {
            current = match[1];
            result[current] = {};
        }
        else {
            match = /^([^=]+)=([^=]+)$/.exec(line);
            if (match !== null) {
                result[current][match[1]] = match[2];
            }
        }
    }
    for (const profileName of Object.keys(result)) {
        const profile = result[profileName];
        // New profiles.ini have a useless section at the top
        if (profile.Path == undefined) {
            delete result[profileName];
            continue;
        }
        // On windows, profiles.ini paths will be expressed with `/`, but we're
        // on windows, so we need `\`
        if ((await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os === "win") {
            profile.Path = profile.Path.replace("/", "\\");
        }
        // profile.IsRelative can be 0, 1 or undefined
        if (profile.IsRelative === "1") {
            profile.relativePath = profile.Path;
            profile.absolutePath = basePath + profile.relativePath;
        }
        else if (profile.IsRelative === "0") {
            if (profile.Path.substring(0, basePath.length) !== basePath) {
                throw new Error(`Error parsing profiles ini: basePath "${basePath}" doesn't match profile path ${profile.Path}`);
            }
            profile.relativePath = profile.Path.substring(basePath.length);
            profile.absolutePath = profile.Path;
        }
    }
    return result;
}
async function getFirefoxDir() {
    switch ((await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os) {
        case "win":
            return getenv("APPDATA").then(path => path + "\\Mozilla\\Firefox\\");
        case "mac":
            return getenv("HOME").then(path => path + "/Library/Application Support/Firefox/");
        default:
            return getenv("HOME").then(path => path + "/.mozilla/firefox/");
    }
}
async function getProfileUncached() {
    const ffDir = await getFirefoxDir();
    const iniPath = ffDir + "profiles.ini";
    let iniObject = {};
    let iniSucceeded = false;
    const iniContent = await read(iniPath);
    if (iniContent.code === 0 && iniContent.content.length > 0) {
        try {
            iniObject = await parseProfilesIni(iniContent.content, ffDir);
            iniSucceeded = true;
        }
        catch (e) { }
    }
    const curProfileDir = _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("profiledir");
    // First, try to see if the 'profiledir' setting matches a profile in profile.ini
    if (curProfileDir !== "auto") {
        if (iniSucceeded) {
            for (const profileName of Object.keys(iniObject)) {
                const profile = iniObject[profileName];
                if (profile.absolutePath === curProfileDir) {
                    return profile;
                }
            }
        }
        return {
            Name: undefined,
            IsRelative: "0",
            Path: curProfileDir,
            relativePath: undefined,
            absolutePath: curProfileDir,
        };
    }
    // Then, try to find a profile path in the arguments given to Firefox
    const cmdline = await ff_cmdline().catch(() => "");
    let profile = cmdline.indexOf("--profile");
    if (profile === -1)
        profile = cmdline.indexOf("-profile");
    if (profile >= 0 && profile < cmdline.length - 1) {
        const profilePath = cmdline[profile + 1];
        if (iniSucceeded) {
            for (const profileName of Object.keys(iniObject)) {
                const profile = iniObject[profileName];
                if (profile.absolutePath === profilePath) {
                    return profile;
                }
            }
        }
        // We're running in a profile that isn't stored in profiles.ini
        // Let's fill in the default info profile.ini profiles have anyway
        return {
            Name: undefined,
            IsRelative: "0",
            Path: profilePath,
            relativePath: undefined,
            absolutePath: profilePath,
        };
    }
    if (iniSucceeded) {
        // Try to find a profile name in firefox's arguments
        let p = cmdline.indexOf("-p");
        if (p === -1)
            p = cmdline.indexOf("-P");
        if (p >= 0 && p < cmdline.length - 1) {
            const pName = cmdline[p + 1];
            for (const profileName of Object.keys(iniObject)) {
                const profile = iniObject[profileName];
                if (profile.Name === pName) {
                    return profile;
                }
            }
            throw new Error(`native.ts:getProfile() : '${cmdline[p]}' found in command line arguments but no matching profile name found in "${iniPath}"`);
        }
    }
    // Still nothing, try to find a profile in use
    let hacky_profile_finder = `find "${ffDir}" -maxdepth 2 -name lock`;
    if ((await _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getPlatformInfo()).os === "mac")
        hacky_profile_finder = `find "${ffDir}" -maxdepth 2 -name .parentlock`;
    const profilecmd = await run(hacky_profile_finder);
    if (profilecmd.code === 0 && profilecmd.content.length !== 0) {
        // Remove trailing newline
        profilecmd.content = profilecmd.content.trim();
        // If there's only one profile in use, use that to find the right profile
        if (profilecmd.content.split("\n").length === 1) {
            const path = profilecmd.content.split("/").slice(0, -1).join("/");
            if (iniSucceeded) {
                for (const profileName of Object.keys(iniObject)) {
                    const profile = iniObject[profileName];
                    if (profile.absolutePath === path) {
                        return profile;
                    }
                }
            }
            return {
                Name: undefined,
                IsRelative: "0",
                Path: path,
                relativePath: undefined,
                absolutePath: path,
            };
        }
    }
    if (iniSucceeded) {
        // Multiple profiles used but no -p or --profile, this means that we're using the default profile
        for (const profileName of Object.keys(iniObject)) {
            const profile = iniObject[profileName];
            if (profile.Default === 1 || profile.Default === "1") {
                return profile;
            }
        }
    }
    throw new Error(`Couldn't deduce which profile you want. See ':help profiledir'`);
}
// Disk operations are extremely slow on windows, let's cache our profile info
let cachedProfile;
async function getProfile() {
    if (cachedProfile === undefined)
        cachedProfile = await getProfileUncached();
    return cachedProfile;
}
// It makes sense to pre-fetch this value in the background script because it's
// long-lived. Other contexts are created and destroyed all the time so we
// don't want to pre-fetch in these.
if ((0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.getContext)() === "background") {
    getProfile();
}
_src_lib_config__WEBPACK_IMPORTED_MODULE_1__.addChangeListener("profiledir", () => {
    cachedProfile = undefined;
    getProfile();
});
function getProfileName() {
    return getProfile().then(p => p.Name);
}
async function getProfileDir() {
    const profiledir = _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("profiledir");
    if (profiledir !== "auto")
        return Promise.resolve(profiledir);
    return getProfile().then(p => p.absolutePath);
}
function parsePrefs(prefFileContent) {
    //  This RegExp currently only deals with " but for correctness it should
    //  also deal with ' and `
    //  We could also just give up on parsing and eval() the whole thing
    const regex = new RegExp(/^(user_|sticky_|lock)?[pP]ref\("([^"]+)",\s*"?([^\)]+?)"?\);$/);
    // Fragile parsing
    return prefFileContent.split("\n").reduce((prefs, line) => {
        const matches = regex.exec(line);
        if (!matches) {
            return prefs;
        }
        const key = matches[2];
        let value = matches[3];
        // value = " means that it should be an empty string
        if (value === '"')
            value = "";
        prefs[key] = value;
        return prefs;
    }, {});
}
/** When given the name of a firefox preference file, will load said file and
 *  return a promise for an object the keys of which correspond to preference
 *  names and the values of which correspond to preference values.
 *  When the file couldn't be loaded or doesn't contain any preferences, will
 *  return a promise for an empty object.
 */
async function loadPrefs(filename) {
    const result = await read(filename);
    if (result.code !== 0)
        return {};
    return parsePrefs(result.content);
}
let cached_prefs = null;
/** Returns a promise for an object that should contain every about:config
 *  setting.
 *
 *  Performance is slow so we need to cache the results.
 */
async function getPrefs() {
    if (cached_prefs !== null)
        return cached_prefs;
    const profile = (await getProfileDir()) + "/";
    const prefFiles = [
        // Debian has these
        "/usr/share/firefox/browser/defaults/preferences/firefox.js",
        "/usr/share/firefox/browser/defaults/preferences/debugger.js",
        "/usr/share/firefox/browser/defaults/preferences/devtools-startup-prefs.js",
        "/usr/share/firefox/browser/defaults/preferences/devtools.js",
        "/usr/share/firefox/browser/defaults/preferences/firefox-branding.js",
        "/usr/share/firefox/browser/defaults/preferences/vendor.js",
        "/usr/share/firefox/browser/defaults/preferences/firefox.js",
        "/etc/firefox/firefox.js",
        // Pref files can be found here:
        // https://developer.mozilla.org/en-US/docs/Mozilla/Preferences/A_brief_guide_to_Mozilla_preferences
        profile + "grepref.js",
        profile + "services/common/services-common.js",
        profile + "defaults/pref/services-sync.js",
        profile + "browser/app/profile/channel-prefs.js",
        profile + "browser/app/profile/firefox.js",
        profile + "browser/app/profile/firefox-branding.js",
        profile + "browser/defaults/preferences/firefox-l10n.js",
        profile + "prefs.js",
        profile + "user.js",
    ];
    const promises = [];
    // Starting all promises before awaiting because we want the calls to be
    // made in parallel
    for (const file of prefFiles) {
        promises.push(loadPrefs(file));
    }
    cached_prefs = promises.reduce(async (a, b) => Object.assign(await a, await b));
    return cached_prefs;
}
/** Returns the value for the corresponding about:config setting */
async function getPref(name) {
    return (await getPrefs())[name];
}
/** Fetches a config option from the config. If the option is undefined, fetch
 *  a preference from preferences. It would make more sense for this function to
 *  be in config.ts but this would require importing this file in config.ts and
 *  Webpack doesn't like circular dependencies.
 */
async function getConfElsePref(confName, prefName) {
    let option = await _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.getAsyncDynamic(confName);
    if (option === undefined) {
        try {
            option = await getPref(prefName);
        }
        catch (e) { }
    }
    return option;
}
/** Fetches a config option from the config. If the option is undefined, fetch
 *  prefName from the preferences. If prefName is undefined too, return a
 *  default.
 */
async function getConfElsePrefElseDefault(confName, prefName, def) {
    const option = await getConfElsePref(confName, prefName);
    if (option === undefined)
        return def;
    return option;
}
/** Writes a preference to user.js */
async function writePref(name, value) {
    if (cached_prefs)
        cached_prefs[name] = value;
    const file = (await getProfileDir()) + "/user.js";
    // No need to check the return code because read returns "" when failing to
    // read a file
    const text = (await read(file)).content;
    const prefPos = text.indexOf(`pref("${name}",`);
    if (prefPos < 0) {
        write(file, `${text}\nuser_pref("${name}", ${value});\n`);
    }
    else {
        let substr = text.substring(prefPos);
        const prefEnd = substr.indexOf(";\n");
        substr = text.substring(prefPos, prefPos + prefEnd);
        write(file, text.replace(substr, `pref("${name}", ${value})`));
    }
}
/** Removes a preference from user.js */
async function removePref(name) {
    const file = (await getProfileDir()) + "/user.js";
    // No need to check the return code because read returns "" when failing to
    // read a file
    const text = (await read(file)).content;
    const prefPos = text.indexOf(`user_pref("${name}",`);
    if (prefPos >= 0) {
        let substr = text.substring(prefPos);
        const prefEnd = substr.indexOf(";\n") + 1;
        substr = text.substring(prefPos, prefPos + prefEnd);
        write(file, text.replace(substr, ``));
    }
}
/** Obey Mozilla's orders https://github.com/tridactyl/tridactyl/issues/1800 */
async function unfixamo() {
    try {
        if (localStorage.unfixedamo2 === "true") {
            // this version of unfixamo already ran for the tridactyl instance in this profile
            return;
        }
        const profile = (await getProfileDir()) + "/";
        const userjs = await loadPrefs(profile + "user.js");
        const tridactylPref = "tridactyl.unfixedamo";
        const tridactylPref2 = "tridactyl.unfixedamo_removed";
        const restricted = "extensions.webextensions.restrictedDomains";
        const amoblocker = "privacy.resistFingerprinting.block_mozAddonManager";
        const restrictedDomains = '"accounts-static.cdn.mozilla.net,accounts.firefox.com,addons.cdn.mozilla.net,addons.mozilla.org,api.accounts.firefox.com,content.cdn.mozilla.net,discovery.addons.mozilla.org,install.mozilla.org,oauth.accounts.firefox.com,profile.accounts.firefox.com,support.mozilla.org,sync.services.mozilla.com"';
        // Exit if we've already run this once
        if (userjs[tridactylPref2] === "true")
            return;
        if (userjs[restricted] === "" ||
            userjs[restricted] === restrictedDomains) {
            await removePref(tridactylPref); // Clean up after first attempt if it exists
            await removePref(restricted);
            await removePref(amoblocker);
            await writePref(tridactylPref2, "true");
            _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.tabs.create({
                url: _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.browserBg.runtime.getURL("static/unfixamo.html"),
            });
        }
        return;
    }
    catch (e) {
        // if an exception is thrown, this means that the native messenger
        // isn't installed
    }
    finally {
        // Note: we store unfixedamo in localStorage and not in config because
        //       users might clear their config with :sanitize
        localStorage.unfixedamo2 = "true";
    }
}


/***/ }),

/***/ "./src/lib/nearley_utils.ts":
/*!**********************************!*\
  !*** ./src/lib/nearley_utils.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Parser": () => (/* binding */ Parser)
/* harmony export */ });
/* harmony import */ var nearley__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! nearley */ "./node_modules/nearley/lib/nearley.js");
/* harmony import */ var nearley__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(nearley__WEBPACK_IMPORTED_MODULE_0__);

/** Friendlier interface around nearley parsers */
class Parser {
    /* public results */
    constructor(grammar) {
        this.parser = new nearley__WEBPACK_IMPORTED_MODULE_0__.Parser(nearley__WEBPACK_IMPORTED_MODULE_0__.Grammar.fromCompiled(grammar));
        this.initial_state = this.parser.save();
        /* this.results = this.parser.results */
    }
    feedUntilError(input) {
        let lastResult;
        let consumedIndex = 0;
        try {
            for (const val of input) {
                this.parser.feed(val);
                lastResult = this.parser.results[0];
                consumedIndex++;
            }
        }
        finally {
            this.reset();
            if (lastResult === undefined) {
                throw new Error("Error: no result!");
            }
            else {
                return [lastResult, input.slice(consumedIndex)];
            }
        }
    }
    reset() {
        this.parser.restore(this.initial_state);
    }
}


/***/ }),

/***/ "./src/lib/number.clamp.ts":
/*!*********************************!*\
  !*** ./src/lib/number.clamp.ts ***!
  \*********************************/
/***/ (() => {

/*
 * Clamp a number n between two values lo, hi
 * such that if n is in [lo, hi], we return n
 * otherwise if n < lo, return lo
 * else return hi.
 */
Number.prototype.clamp = function (lo, hi) {
    return Math.max(lo, Math.min(this, hi));
};


/***/ }),

/***/ "./src/lib/number.mod.ts":
/*!*******************************!*\
  !*** ./src/lib/number.mod.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "knuth_mod": () => (/* binding */ knuth_mod),
/* harmony export */   "my_mod": () => (/* binding */ my_mod),
/* harmony export */   "euclid_mod": () => (/* binding */ euclid_mod)
/* harmony export */ });
/** Number theory-friendly modulo implementation

    If divisor is positive, return value will be too.
*/
Number.prototype.mod = function (n) {
    return knuth_mod(this, n);
};
/** Takes sign of divisor -- incl. returning -0 */
function knuth_mod(dividend, divisor) {
    return dividend - divisor * Math.floor(dividend / divisor);
}
/** Equivalent to knuth_mod but doesn't return -0 */
function my_mod(dividend, divisor) {
    return ((dividend % divisor) + divisor) % divisor;
}
/** Always gives a positive result.

    Equivalent to knuth_mod when divisor is +ve
    Equivalent to % when dividend is +ve
*/
function euclid_mod(dividend, divisor) {
    const abs_divisor = Math.abs(divisor);
    const quotient = Math.floor(dividend / abs_divisor);
    return dividend - abs_divisor * quotient;
}


/***/ }),

/***/ "./src/lib/patience.ts":
/*!*****************************!*\
  !*** ./src/lib/patience.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "sleep": () => (/* binding */ sleep),
/* harmony export */   "backoff": () => (/* binding */ backoff)
/* harmony export */ });
// Borrowed from
// https://tech.mybuilder.com/handling-retries-and-back-off-attempts-with-javascript-promises/
const sleep = (duration) => new Promise(res => setTimeout(res, duration));
const backoff = (fn, retries = 5, delay = 50) => fn().catch(err => {
    retries > 1
        ? sleep(delay).then(() => backoff(fn, retries - 1, delay * 2))
        : Promise.reject(err);
});


/***/ }),

/***/ "./src/lib/platform.ts":
/*!*****************************!*\
  !*** ./src/lib/platform.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getPlatformOs": () => (/* binding */ getPlatformOs)
/* harmony export */ });
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/keys.js");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/filter.js");

// Synchronous version of runtime.getPlatformInfo()
// Not as exhaustive as the real thing
// Will return undefined if it can't work it out
function getPlatformOs() {
    const platform = navigator.platform;
    const mapping = {
        "win": "Win",
        "openbsd": "BSD",
        "mac": "Mac",
        "linux": "Linux",
    };
    return ramda__WEBPACK_IMPORTED_MODULE_0__.default(ramda__WEBPACK_IMPORTED_MODULE_1__.default(x => platform.includes(x), mapping))[0];
}


/***/ }),

/***/ "./src/lib/url_util.ts":
/*!*****************************!*\
  !*** ./src/lib/url_util.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "incrementUrl": () => (/* binding */ incrementUrl),
/* harmony export */   "getUrlRoot": () => (/* binding */ getUrlRoot),
/* harmony export */   "getUrlParent": () => (/* binding */ getUrlParent),
/* harmony export */   "getDownloadFilenameForUrl": () => (/* binding */ getDownloadFilenameForUrl),
/* harmony export */   "deleteQuery": () => (/* binding */ deleteQuery),
/* harmony export */   "setQueryValue": () => (/* binding */ setQueryValue),
/* harmony export */   "replaceQueryValue": () => (/* binding */ replaceQueryValue),
/* harmony export */   "graftUrlPath": () => (/* binding */ graftUrlPath),
/* harmony export */   "interpolateSearchItem": () => (/* binding */ interpolateSearchItem),
/* harmony export */   "getAbsoluteURL": () => (/* binding */ getAbsoluteURL)
/* harmony export */ });
/** URL handling utlity functions
 */
/** Increment the last number in a URL.
 *
 * (perhaps this could be made so you can select the "nth" number in a
 * URL rather than just the last one?)
 *
 * @param url       the URL to increment
 * @param count     increment step to advance by (can be negative)
 * @return          the incremented URL, or null if cannot be incremented
 */
function incrementUrl(url, count) {
    // Find the final number in a URL
    const matches = url.match(/(.*?)(\d+)(\D*)$/);
    // no number in URL - nothing to do here
    if (matches === null) {
        return null;
    }
    const [, pre, number, post] = matches;
    const newNumber = parseInt(number, 10) + count;
    let newNumberStr = String(newNumber > 0 ? newNumber : 0);
    // Re-pad numbers that were zero-padded to be the same length:
    // 0009 + 1 => 0010
    if (number.match(/^0/)) {
        while (newNumberStr.length < number.length) {
            newNumberStr = "0" + newNumberStr;
        }
    }
    return pre + newNumberStr + post;
}
/** Get the root of a URL
 *
 * @param url   the url to find the root of
 * @return      the root of the URL, or the original URL when the URL isn't
 *              suitable for finding the root of.
 */
function getUrlRoot(url) {
    // exclude these special protocols for now;
    if (/(about|mailto):/.test(url.protocol)) {
        return null;
    }
    // this works even for file:/// where the root is ""
    return new URL(url.protocol + "//" + (url.host || ""));
}
/** Get the parent of the current URL. Parent is determined as:
 *
 * * if there is a hash fragment, strip that, or
 * * If there is a query string, strip that, or
 * * Remove one level from the path if there is one, or
 * * Remove one subdomain from the front if there is one
 *
 * @param url               the URL to get the parent of
 * @param trailingSlash     whether the returned URL has a trailing slash
 * @param count             how many "generations" you wish to go back (1 = parent, 2 = grandparent, etc.)
 * @return                  the parent of the URL, or null if there is no parent
 */
function getUrlParent(url, trailingSlash, count = 1) {
    // Helper function.
    function gup(parent, trailingSlash, count) {
        if (count < 1) {
            // remove trailing slash(s) if desired
            if (!trailingSlash) {
                // remove 1 or more trailing slashes
                parent.pathname = parent.pathname.replace(/\/+$/, "");
            }
            return parent;
        }
        // strip, in turn, hash/fragment and query/search
        if (parent.hash) {
            parent.hash = "";
            return gup(parent, trailingSlash, count - 1);
        }
        if (parent.search) {
            parent.search = "";
            return gup(parent, trailingSlash, count - 1);
        }
        // empty path is '/'
        if (parent.pathname !== "/") {
            // Remove trailing slashes and everything to the next slash:
            parent.pathname = parent.pathname.replace(/\/[^\/]*?\/*$/, "/");
            return gup(parent, trailingSlash, count - 1);
        }
        // strip off the first subdomain if there is one
        {
            const domains = parent.host.split(".");
            // more than domain + TLD
            if (domains.length > 2) {
                // domains.pop()
                parent.host = domains.slice(1).join(".");
                return gup(parent, trailingSlash, count - 1);
            }
        }
        // nothing to trim off URL, so no parent
        return null;
    }
    // exclude these special protocols where parents don't really make sense
    if (/(about|mailto):/.test(url.protocol)) {
        return null;
    }
    const parent = new URL(url);
    return gup(parent, trailingSlash, count);
}
/** Very incomplete lookup of extension for common mime types that might be
 * encountered when saving elements on a page. There are NPM libs for this,
 * but this should cover 99% of basic cases
 *
 * @param mime  mime type to get extension for (eg 'image/png')
 *
 * @return an extension for that mimetype, or undefined if that type is not
 * supported
 */
function getExtensionForMimetype(mime) {
    const types = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/gif": ".gif",
        "image/x-icon": ".ico",
        "image/svg+xml": ".svg",
        "image/tiff": ".tiff",
        "image/webp": ".webp",
        "text/plain": ".txt",
        "text/html": ".html",
        "text/css": ".css",
        "text/csv": ".csv",
        "text/calendar": ".ics",
        "application/octet-stream": ".bin",
        "application/javascript": ".js",
        "application/xhtml+xml": ".xhtml",
        "font/otf": ".otf",
        "font/woff": ".woff",
        "font/woff2": ".woff2",
        "font/ttf": ".ttf",
    };
    return types[mime] || "";
}
/** Get a suitable default filename for a given URL
 *
 * If the URL:
 *  - is a data URL, construct from the data and mimetype
 *  - has a path, use the last part of that (eg image.png, index.html)
 *  - otherwise, use the hostname of the URL
 *  - if that fails, "download"
 *
 * @param URL   the URL to make a filename for
 * @return      the filename according to the above rules
 */
function getDownloadFilenameForUrl(url) {
    // for a data URL, we have no really useful naming data intrinsic to the
    // data, so we construct one using the data and guessing an extension
    // from any mimetype
    if (url.protocol === "data:") {
        // data:[<mediatype>][;base64],<data>
        const [prefix, data] = url.pathname.split(",", 2);
        const [mediatype, b64] = prefix.split(";", 2);
        // take a 15-char prefix of the data as a reasonably unique name
        // sanitize in a very rough manner
        let filename = data
            .slice(0, 15)
            .replace(/[^a-zA-Z0-9_\-]/g, "_")
            .replace(/_{2,}/g, "_");
        // add a base64 prefix and the extension
        filename =
            (b64 ? b64 + "-" : "") +
                filename +
                getExtensionForMimetype(mediatype);
        return filename;
    }
    // if there's a useful path, use that directly
    if (url.pathname !== "/") {
        const paths = url.pathname.split("/").slice(1);
        // pop off empty pat bh tails
        // e.g. https://www.mozilla.org/en-GB/firefox/new/
        while (paths.length && !paths[paths.length - 1]) {
            paths.pop();
        }
        if (paths.length) {
            return paths.slice(-1)[0];
        }
    }
    // if there's no path, use the domain (otherwise the FF-provided
    // default is just "download"
    return url.hostname || "download";
}
/**
 * Get an Array of the queries in a URL.
 *
 * These could be like "query" or "query=val"
 */
function getUrlQueries(url) {
    let qys = [];
    if (url.search) {
        // get each query separately, leave the "?" off
        qys = url.search.slice(1).split("&");
    }
    return qys;
}
/**
 * Update a URL with a new array of queries
 */
function setUrlQueries(url, qys) {
    url.search = "";
    if (qys.length) {
        // rebuild string with the filtered list
        url.search = "?" + qys.join("&");
    }
}
/**
 * Delete a query (and its value) in a URL
 *
 * If a query appears multiple times (which is a bit odd),
 * all instances are removed
 *
 * @param url           the URL to act on
 * @param query         the query to delete
 *
 * @return              the modified URL
 */
function deleteQuery(url, matchQuery) {
    const newUrl = new URL(url.href);
    const qys = getUrlQueries(url);
    const new_qys = qys.filter(q => q.split("=")[0] !== matchQuery);
    setUrlQueries(newUrl, new_qys);
    return newUrl;
}
/**
 * Sets the value of a query in a URL with a specific one
 *
 * @param url           the URL to act on
 * @param matchQuery    the query key to set the value for
 * @param value         the value to use
 */
function setQueryValue(url, matchQuery, value) {
    const newUrl = new URL(url.href);
    // get each query separately, leave the "?" off
    const qys = getUrlQueries(url);
    // if the query exists just replace it
    if (qys.map(q => q.split("=")[0]).includes(matchQuery)) {
        return replaceQueryValue(url, matchQuery, value);
    }
    // the query does not exist so add it
    qys.push(matchQuery + "=" + value);
    setUrlQueries(newUrl, qys);
    return newUrl;
}
/**
 * Replace the value of a query in a URL with a new one
 *
 * @param url           the URL to act on
 * @param matchQuery    the query key to replace the value for
 * @param newVal        the new value to use
 */
function replaceQueryValue(url, matchQuery, newVal) {
    const newUrl = new URL(url.href);
    // get each query separately, leave the "?" off
    const qys = getUrlQueries(url);
    const new_qys = qys.map(q => {
        const [key] = q.split("=");
        // found a matching query key
        if (q.split("=")[0] === matchQuery) {
            // return key=val or key as needed
            if (newVal) {
                return key + "=" + newVal;
            }
            else {
                return key;
            }
        }
        // don't touch it
        return q;
    });
    setUrlQueries(newUrl, new_qys);
    return newUrl;
}
/**
 * Graft a new path onto some parent of the current URL
 *
 * E.g. grafting "by-name/foobar" onto the 2nd parent path:
 *      example.com/items/by-id/42 -> example.com/items/by-name/foobar
 *
 * @param url       the URL to modify
 * @param newTail   the new "grafted" URL path tail
 * @param level     the graft point in terms of path levels
 *                      >= 0: start at / and count right
 *                      <0: start at the current path and count left
 */
function graftUrlPath(url, newTail, level) {
    const newUrl = new URL(url.href);
    // path parts, ignore first /
    const pathParts = url.pathname.split("/").splice(1);
    // more levels than we can handle
    // (remember, if level <0, we start at -1)
    if ((level >= 0 && level > pathParts.length) ||
        (level < 0 && -level - 1 > pathParts.length)) {
        return null;
    }
    const graftPoint = level >= 0 ? level : pathParts.length + level + 1;
    // lop off parts after the graft point
    pathParts.splice(graftPoint, pathParts.length - graftPoint);
    // extend part array with new parts
    pathParts.push(...newTail.split("/"));
    newUrl.pathname = pathParts.join("/");
    return newUrl;
}
/**
 * Interpolates a query or other search item into a URL
 *
 * If the URL pattern contains "%s", the query is interpolated there. If not,
 * it is appended to the end of the pattern.
 *
 * If the interpolation point is in the query string of the URL, it is
 * percent encoded, otherwise it is is inserted verbatim.
 *
 * @param urlPattern        a URL to interpolate/append a query to
 * @param query             a query to interpolate/append into the URL
 *
 * @return                  the URL with the query encoded (if needed) and
 *                          inserted at the relevant point
 */
function interpolateSearchItem(urlPattern, query) {
    const hasInterpolationPoint = urlPattern.href.includes("%s");
    let queryWords = query.split(" ");
    // percent-encode if theres a %s in the query string, or if we're apppending
    // and there's a query string
    if ((hasInterpolationPoint && urlPattern.search.includes("%s")) ||
        urlPattern.search !== "") {
        query = encodeURIComponent(query);
        queryWords = queryWords.map(w => encodeURIComponent(w));
    }
    // replace or append as needed
    if (hasInterpolationPoint) {
        const resultingURL = new URL(urlPattern.href.replace(/%s\d+/g, function (x) {
            const index = parseInt(x.slice(2), 10) - 1;
            if (index >= queryWords.length) {
                return "";
            }
            return queryWords[index];
        }));
        return new URL(resultingURL.href.replace("%s", query));
    }
    else {
        return new URL(urlPattern.href + query);
    }
}
/**
 * @param url May be either an absolute or a relative URL.
 * @param baseURI The URL the absolute URL should be relative to. This is
 * usually the URL of the current page.
 */
function getAbsoluteURL(url, baseURI = document.baseURI) {
    // We can choose between using complicated RegEx and string manipulation,
    // or just letting the browser do it for us. The latter is probably safer,
    // which should make it worth the (small) overhead of constructing an URL
    // just for this.
    return new URL(url, baseURI).href;
}


/***/ }),

/***/ "./src/lib/webext.ts":
/*!***************************!*\
  !*** ./src/lib/webext.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "inContentScript": () => (/* binding */ inContentScript),
/* harmony export */   "getTriVersion": () => (/* binding */ getTriVersion),
/* harmony export */   "getPrettyTriVersion": () => (/* binding */ getPrettyTriVersion),
/* harmony export */   "notBackground": () => (/* binding */ notBackground),
/* harmony export */   "getContext": () => (/* binding */ getContext),
/* harmony export */   "browserBg": () => (/* binding */ browserBg),
/* harmony export */   "activeTab": () => (/* binding */ activeTab),
/* harmony export */   "activeTabId": () => (/* binding */ activeTabId),
/* harmony export */   "activeTabContainerId": () => (/* binding */ activeTabContainerId),
/* harmony export */   "ownTab": () => (/* binding */ ownTab),
/* harmony export */   "ownTabId": () => (/* binding */ ownTabId),
/* harmony export */   "ownWinTriIndex": () => (/* binding */ ownWinTriIndex),
/* harmony export */   "getWinIdFromIndex": () => (/* binding */ getWinIdFromIndex),
/* harmony export */   "ownTabContainer": () => (/* binding */ ownTabContainer),
/* harmony export */   "activeTabContainer": () => (/* binding */ activeTabContainer),
/* harmony export */   "firefoxVersionAtLeast": () => (/* binding */ firefoxVersionAtLeast),
/* harmony export */   "openInNewTab": () => (/* binding */ openInNewTab),
/* harmony export */   "openInNewWindow": () => (/* binding */ openInNewWindow),
/* harmony export */   "queryAndURLwrangler": () => (/* binding */ queryAndURLwrangler),
/* harmony export */   "openInTab": () => (/* binding */ openInTab)
/* harmony export */ });
/* harmony import */ var _src_lib_convert__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/convert */ "./src/lib/convert.ts");
/* harmony import */ var _src_lib_browser_proxy__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/browser_proxy */ "./src/lib/browser_proxy.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_url_util__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/url_util */ "./src/lib/url_util.ts");
/* harmony import */ var _src_lib_patience__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @src/lib/patience */ "./src/lib/patience.ts");





function inContentScript() {
    return getContext() === "content";
}
function getTriVersion() {
    const manifest = browser.runtime.getManifest();
    return manifest.version_name;
}
function getPrettyTriVersion() {
    const manifest = browser.runtime.getManifest();
    return manifest.name + " " + getTriVersion();
}
function notBackground() {
    return getContext() !== "background";
}
/** WebExt code can be run from three contexts:

    Content script
    Extension page
    Background page
*/
function getContext() {
    if (!browser.tabs) {
        return "content";
    }
    else if (browser.runtime.getURL("_generated_background_page.html") ===
        window.location.href) {
        return "background";
    }
    else {
        return "extension";
    }
}
// Make this library work for both content and background.
const browserBg = inContentScript() ? _src_lib_browser_proxy__WEBPACK_IMPORTED_MODULE_1__.default : browser;
/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
async function activeTab() {
    return (await browserBg.tabs.query({
        active: true,
        currentWindow: true,
    }))[0];
}
async function activeTabId() {
    return (await activeTab()).id;
}
async function activeTabContainerId() {
    return (await activeTab()).cookieStoreId;
}
async function ownTab() {
    // Warning: this relies on the owntab_background listener being set in messaging.ts in order to work
    return browser.runtime.sendMessage({ type: "owntab_background" });
}
async function ownTabId() {
    return (await ownTab()).id;
}
async function windows() {
    return (await browserBg.windows.getAll())
        .map(w => w.id)
        .sort((a, b) => a - b);
}
/* Returns Tridactyl's window index. */
async function ownWinTriIndex() {
    return (await windows()).indexOf((await ownTab()).windowId);
}
/* Returns mozilla's internal window id from Tridactyl's index. */
async function getWinIdFromIndex(index) {
    return (await windows())[index];
}
async function ownTabContainer() {
    return browserBg.contextualIdentities.get((await ownTab()).cookieStoreId);
}
async function activeTabContainer() {
    const containerId = await activeTabContainerId();
    if (containerId !== "firefox-default")
        return browserBg.contextualIdentities.get(containerId);
    else
        throw new Error("firefox-default is not a valid contextualIdentity (activeTabContainer)");
}
/** Compare major firefox versions */
async function firefoxVersionAtLeast(desiredmajor) {
    const versionstr = (await browserBg.runtime.getBrowserInfo()).version;
    const actualmajor = _src_lib_convert__WEBPACK_IMPORTED_MODULE_0__.toNumber(versionstr.split(".")[0]);
    return actualmajor >= desiredmajor;
}
/** Simpler tabs.create option.

    If related = true && relatedopenpos = 'related' then open a new tab with
    some URL as if that URL had been middle clicked on the current tab. If
    relatedopenpos = 'next', open it as the next tab. If 'last', open it last
    and don't tell Firefox who opened it.

    Similarly for tabopenpos, but only tell FF that the newtab is related to
    the activeTab if tabopenpos == 'related'.

    i.e. place that tab just after the current tab and set openerTabId
*/
async function openInNewTab(url, kwargs = {
    active: true,
    related: false,
    cookieStoreId: undefined,
}, waitForDOM = false) {
    const thisTab = await activeTab();
    const options = {
        active: false,
        url,
        cookieStoreId: kwargs.cookieStoreId,
    };
    // Be nice to behrmann, #342
    let pos;
    if (kwargs.related)
        pos = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("relatedopenpos");
    else
        pos = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("tabopenpos");
    switch (pos) {
        case "next":
            options.index = thisTab.index + 1;
            if (kwargs.related && (await firefoxVersionAtLeast(57)))
                options.openerTabId = thisTab.id;
            break;
        case "last":
            // Infinity can't be serialised, apparently.
            options.index = (await browserBg.tabs.query({
                currentWindow: true,
            })).length;
            break;
        case "related":
            if (await firefoxVersionAtLeast(57)) {
                options.openerTabId = thisTab.id;
            }
            else {
                options.index = thisTab.index + 1;
            }
            break;
    }
    const tabCreateWrapper = async (options) => {
        const tab = await browserBg.tabs.create(options);
        const answer = new Promise(resolve => {
            // This can't run in content scripts, obviously
            // surely we never call this from a content script?
            if (waitForDOM) {
                const listener = (message, sender) => {
                    var _a;
                    if (message === "dom_loaded_background" &&
                        ((_a = sender === null || sender === void 0 ? void 0 : sender.tab) === null || _a === void 0 ? void 0 : _a.id) === tab.id) {
                        browserBg.runtime.onMessage.removeListener(listener);
                        resolve(tab);
                    }
                };
                browserBg.runtime.onMessage.addListener(listener);
            }
            else {
                resolve(tab);
            }
        });
        // Return on slow- / extremely quick- loading pages anyway
        return Promise.race([
            answer,
            (async () => {
                await (0,_src_lib_patience__WEBPACK_IMPORTED_MODULE_4__.sleep)(750);
                return tab;
            })(),
        ]);
    };
    if (kwargs.active === false) {
        // load in background
        return tabCreateWrapper(options);
    }
    else {
        // load in background and then activate, per issue #1993
        return tabCreateWrapper(options).then(newtab => browserBg.tabs.update(newtab.id, { active: true }));
    }
}
// lazily copied from excmds.ts' winopen - forceURI really ought to be moved to lib/webext
// Should consider changing interface of this to match openInNewTab or vice versa
function openInNewWindow(createData = {}) {
    browserBg.windows.create(createData);
}
// Returns object if we should use the search engine instead
async function queryAndURLwrangler(query) {
    let address = query.join(" ");
    if (address === "") {
        address = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("newtab");
    }
    // Special ritual for about:newtab: we can access it but only if we don't ask for it
    if (address === "about:newtab") {
        return undefined;
    }
    const index = address.indexOf(" ");
    let firstWord = address;
    if (index > -1)
        firstWord = address.substr(0, index);
    if (firstWord === "") {
        // No query, no newtab set, the user is asking for Tridactyl's newtab page, which we deal with in :tabopen / :open directly
        return undefined;
    }
    // Perhaps the user typed a URL?
    if (/^[a-zA-Z0-9+.-]+:[^\s:]/.test(address)) {
        try {
            return new URL(address).href;
        }
        catch (e) {
            // Not a problem, we'll treat address as a regular search query
        }
    }
    // `+ 1` because we want to get rid of the space
    const rest = address.substr(firstWord.length + 1);
    const searchurls = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("searchurls");
    if (searchurls[firstWord]) {
        const url = _src_lib_url_util__WEBPACK_IMPORTED_MODULE_3__.interpolateSearchItem(new URL(searchurls[firstWord]), rest);
        // firstWord is a searchurl, so let's use that
        return url.href;
    }
    const searchEngines = await browserBg.search.get();
    let engine = searchEngines.find(engine => engine.alias === firstWord);
    // Maybe firstWord is the name of a firefox search engine?
    if (engine !== undefined) {
        return { engine: engine.name, query: rest };
    }
    // Maybe it's a domain without protocol
    try {
        const url = new URL("http://" + address);
        // Ignore unlikely domains
        if (url.hostname.indexOf(".") > 0 || url.port || url.password) {
            return url.href;
        }
    }
    catch (e) { }
    // Let's default to the user's search engine then
    // if firstWord is "search", remove it from the query.
    // This allows users to search for a URL or a word they defined as searchurl
    let queryString = address;
    if (firstWord === "search") {
        queryString = rest;
    }
    const enginename = _src_lib_config__WEBPACK_IMPORTED_MODULE_2__.get("searchengine");
    // firstWord is neither a searchurl nor a search engine, let's see if a search engine has been defined in Tridactyl
    if (enginename) {
        if (searchurls[enginename]) {
            const url = _src_lib_url_util__WEBPACK_IMPORTED_MODULE_3__.interpolateSearchItem(new URL(searchurls[enginename]), queryString);
            return url.href;
        }
        engine = searchEngines.find(engine => engine.alias === enginename);
        if (engine !== undefined) {
            return { engine: engine.name, query: queryString };
        }
    }
    // No search engine has been defined in Tridactyl, let's use firefox's default search engine
    return { query: queryString };
}
async function openInTab(tab, opts = {}, strarr) {
    const maybeURL = await queryAndURLwrangler(strarr);
    if (typeof maybeURL === "string") {
        return browserBg.tabs.update(tab.id, Object.assign({ url: maybeURL }, opts));
    }
    if (typeof maybeURL === "object") {
        return browserBg.search.search(Object.assign({ tabId: tab.id }, maybeURL));
    }
    // Fall back to our new tab page
    return browserBg.tabs.update(tab.id, Object.assign({ url: "/static/newtab.html" }, opts));
}


/***/ }),

/***/ "./src/parsers/genericmode.ts":
/*!************************************!*\
  !*** ./src/parsers/genericmode.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "parser": () => (/* binding */ parser)
/* harmony export */ });
/* harmony import */ var _src_lib_keyseq__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/keyseq */ "./src/lib/keyseq.ts");
/** Tridactyl helper mode */

function parser(conf, keys) {
    const maps = _src_lib_keyseq__WEBPACK_IMPORTED_MODULE_0__.keyMap(conf);
    _src_lib_keyseq__WEBPACK_IMPORTED_MODULE_0__.translateKeysInPlace(keys, conf);
    return _src_lib_keyseq__WEBPACK_IMPORTED_MODULE_0__.parse(keys, maps);
}


/***/ }),

/***/ "./src/perf.ts":
/*!*********************!*\
  !*** ./src/perf.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "measured": () => (/* binding */ measured),
/* harmony export */   "measuredAsync": () => (/* binding */ measuredAsync),
/* harmony export */   "Marker": () => (/* binding */ Marker),
/* harmony export */   "listenForCounters": () => (/* binding */ listenForCounters),
/* harmony export */   "StatsLogger": () => (/* binding */ StatsLogger),
/* harmony export */   "renderStatsHistogram": () => (/* binding */ renderStatsHistogram),
/* harmony export */   "StatsFilter": () => (/* binding */ StatsFilter)
/* harmony export */ });
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");
/* harmony import */ var _src_lib_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/config */ "./src/lib/config.ts");
/* harmony import */ var _src_lib_math__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/math */ "./src/lib/math.ts");
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");
/**
 * Library used for measuring performance. The basic steps are as follows:
 *
 * 1. Set up a persistent StatsLogger object to store samples.
 * 2. Invoke listenForCounters with the StatsLogger to start logging
 *    performance counters to the stats logger.
 * 3. If you have other scripts (content, iframes, web workers, etc),
 *    set up to receive stats from those other sources:
 *    * Set the stats logger up with an attributeCaller receiving messages as
 *      "performance_background".
 *    * For each other context, invoke listenForCounters without arguments and
 *      hold on to the resulting object.
 * 4. Instrument methods using the @measured or @measuredAsync
 *    decorators (for class methods) or by using Marker objects in
 *    your functions.
 * 5. Collect data!
 * 6. Use getEntries to retrieve data from the statsLogger.
 */




const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_3__.Logger("performance");
/**
 * Decorator for performance measuring. If performance is enabled,
 * wraps the function call with performance marks and a measure that
 * can be used for profiling. The mark's ownerName will be the name of
 * the containing class and the functionName will be the name of the
 * function. For example:
 *
 * class Foo {
 *   @Perf.measured
 *   function doFoos() { stuff() }
 * }
 *
 * These counters can be obtained using listenForCounters and a
 * StatsLogger.
 *
 */
function measured(cls, propertyKey, descriptor) {
    if (!performanceApiAvailable())
        return;
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        const marker = new Marker(cls.constructor.name, propertyKey).start();
        const result = originalMethod.apply(this, args);
        marker.end();
        return result;
    };
    return descriptor;
}
/**
 * Like the @measured decorator, but properly handles async functions
 * by chaining a resolution onto the promise that marks completion
 * when the function resolves its promise.
 */
function measuredAsync(cls, propertyKey, descriptor) {
    if (!performanceApiAvailable())
        return;
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
        const marker = new Marker(cls.constructor.name, propertyKey).start();
        const result = await originalMethod.apply(this, args);
        marker.end();
        return result;
    };
    return descriptor;
}
/**
 * Convenience object for collecting timing information. Create it and
 * call start() to create a mark entry for the start of the duration
 * to measure. Later, call end() to create a mark entry for the end of
 * the duration and a measure entry for the duration from the start
 * mark to the end mark. Marks are given a unique identifier to ensure
 * that async, multi-threaded, or reentrant code doesn't have collisions.
 *
 * WARNING! Will SILENTLY DEACTIVATE ITSELF if the "perfcounters"
 * config option is not set to "true"! This is done to minimize the
 * performance overhead of instrumentation when performance counters
 * are turned off.
 *
 * The ownerName and functionName are encoded into the name of the
 * performance entry in a way that allows entries to be retrieved
 * using StatsFilters.
 *
 */
class Marker {
    constructor(ownerName, functionName, active = performanceApiAvailable() &&
        _src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("perfcounters") === "true", metricName = new MetricName(ownerName, functionName)) {
        this.active = active;
        this.metricName = metricName;
    }
    start() {
        if (!this.active)
            return this;
        logger.debug("Marking startpoint of performance counter for %o", this.metricName);
        performance.mark(this.metricName.startName);
        return this;
    }
    end() {
        if (!this.active)
            return this;
        logger.debug("Marking endpoint of performance counter for %o", this.metricName);
        performance.mark(this.metricName.endName);
        performance.measure(this.metricName.fullName, this.metricName.startName, this.metricName.endName);
        return this;
    }
}
/**
 * Start listening for performance counters. Note that you _must_
 * attach the returned PerformanceObserver to some long-lived object
 * like the window; there's some kind of bug that causes
 * PerformanceObservers to be incorrectly garbage-collected even if
 * they're still attached and observing.
 *
 * @param statsLogger If given, stats will be logged directly to the
 * given stats logger. If absent, stats will be sent to the
 * performance_background receiver using messaging.
 */
function listenForCounters(statsLogger) {
    let callback;
    if (statsLogger === undefined) {
        callback = (list) => {
            sendStats(list.getEntries());
        };
    }
    else {
        callback = (list) => {
            statsLogger.pushList(list.getEntries());
        };
    }
    const perfObserver = new PerformanceObserver(callback);
    perfObserver.observe({ entryTypes: ["mark", "measure"] });
    return perfObserver;
}
/**
 * Stores a bounded-size buffer of performance entries and provides
 * convenience functions for accessing subsets of the buffer. Very
 * simple circular buffer.
 */
class StatsLogger {
    constructor() {
        // TODO: Consider mapping each name to a symbol and storing the
        // mapped symbol instead of the name so we're storing more like 50
        // bytes per sample instead of 130 @_@
        this.buffer = [];
        this.idx = 0;
        this.buffersize = 10000;
        this.lastError = 0;
    }
    /**
     * Target for receiving stats entries from other threads - there
     * was some issue with encoding that I couldn't figure out so I
     * just kludged it.
     */
    receiveStatsJson(entriesJson) {
        this.pushList(JSON.parse(entriesJson));
    }
    /**
     * Ingests the given performance entries into the buffer.
     */
    pushList(entries) {
        for (const entry of entries) {
            this.pushEntry(entry);
        }
    }
    /**
     * Returns only entries that match _all_ of the given filter
     * configs.
     */
    getEntries(...filterConfigs) {
        // Explicit stream fusion, wheeeee.
        //
        // Well, sort of. We're not fusing all the way up to the regex
        // match, so that's a ton of duplicated work. Not that it
        // matters, since this should only ever be invoked when a
        // developer asks for data.
        const filters = filterConfigs.map(fc => new StatsFilter(fc));
        const filterFun = e => filters.every(f => f.matches(e));
        return this.buffer.filter(filterFun);
    }
    updateBuffersize() {
        // Changing the buffer length while this is running will
        // probably result in weirdness, but that shouldn't be a major
        // issue - it's not like we need these to be in order or
        // otherwise coherent, we're just trying to store a big pile
        // of recent-ish samples.
        const perfsamples = Number(_src_lib_config__WEBPACK_IMPORTED_MODULE_1__.get("perfsamples"));
        // Check for NaN or non-integer
        if (Number.isInteger(perfsamples)) {
            this.buffersize = perfsamples;
        }
        else {
            // This function could be called a hundred times a second
            // and would error out every single time if someone has
            // given an invalid config, so rate-limit the error log -
            // one every five seconds.
            if (performance.now() - this.lastError > 5000) {
                this.lastError = performance.now();
                logger.error("perfsamples must be an integer, is %O", perfsamples);
            }
        }
    }
    pushEntry(entry) {
        logger.debug("Pushing performance entry %o into performance counters", entry);
        // Drop samples that aren't for tridactyl, since performance
        // events are global and there are some badly-behaved
        // libraries spamming them all over our own data.
        if (!entry.name.startsWith(TRI_PERFORMANCE_NAME_PREFIX))
            return;
        // We depend on arrays auto-vivifying when elements past the
        // end are set to make this easy.
        this.buffer[this.idx] = entry;
        this.incrementIdx();
    }
    incrementIdx() {
        this.idx = (this.idx + 1) % this.buffersize;
    }
}
/**
 * Pretty-prints a pile of performance samples of type measure (others
 * won't work because they have duration zero or undefined) as a
 * horizontal ASCII histogram. Useful if you just want basic
 * statistics about performance and don't want to spend a bunch of
 * time mucking about in python or julia.
 *
 * A very small example of what you'll get:
 *
 *   0     ####
 *   125   ##########
 *   250   ###############
 *   375   ######
 *   500   ##
 *
 * @param samples A set of samples to plot.
 * @param buckets The number of bins to divide the samples into.
 * @param width The width of the chart.
 */
function renderStatsHistogram(samples, buckets = 15, width = 80) {
    const durs = samples.map(sample => sample.duration);
    const min = durs.reduce((a, b) => Math.min(a, b));
    const max = durs.reduce((a, b) => Math.max(a, b));
    const bucketvals = _src_lib_math__WEBPACK_IMPORTED_MODULE_2__.linspace(min, max, buckets);
    const bucketed = _src_lib_math__WEBPACK_IMPORTED_MODULE_2__.bucketize(durs, bucketvals);
    const maxcount = Array.from(bucketed.values()).reduce((a, b) => Math.max(a, b), 0);
    const labelwidth = 20;
    const barwidth = width - labelwidth;
    const tobarwidth = n => (barwidth * n) / maxcount;
    const result = [];
    for (const [bucketval, bucketcount] of bucketed.entries()) {
        const bar = "#".repeat(tobarwidth(bucketcount));
        const label = bucketval.toString().padEnd(labelwidth);
        result.push(label + bar);
    }
    return result.join("\n");
}
/**
 * Implements filtering of performance entries using the
 * StatsFilterConfig. Exposed so users of the library can do more
 * filtering themselves if they want to.
 */
class StatsFilter {
    constructor(config) {
        this.config = config;
    }
    matches(entry) {
        const metricNameInfo = extractMetricName(entry.name);
        if (this.config.kind === "functionName" &&
            this.config.functionName !== metricNameInfo.functionName) {
            return false;
        }
        if (this.config.kind === "ownerName" &&
            this.config.ownerName !== metricNameInfo.ownerName) {
            return false;
        }
        if (this.config.kind === "eventType" &&
            this.config.eventType !== entry.entryType) {
            return false;
        }
        return true;
    }
}
const TRI_PERFORMANCE_NAME_PREFIX = "tri";
function performanceApiAvailable() {
    return performance.mark !== undefined;
}
const extractRegExp = new RegExp(`^${TRI_PERFORMANCE_NAME_PREFIX}` +
    // owner name
    `/([^/]+)` +
    // function name
    `/([^:]+)` +
    // unique suffix
    `:([^:]+)`);
function extractMetricName(counterName) {
    const matchresult = extractRegExp.exec(counterName);
    if (!matchresult)
        return;
    const [ownerName, functionName, uniqueSuffix] = matchresult.slice(1);
    return {
        ownerName,
        functionName,
        uniqueSuffix,
    };
}
class MetricName {
    constructor(ownerName, functionName) {
        const uniqueSuffix = Math.floor(Math.random() * Math.floor(1e6)).toString();
        this.fullName = `${TRI_PERFORMANCE_NAME_PREFIX}/${ownerName}/${functionName}:${uniqueSuffix}`;
        this.startName = `${this.fullName}:start`;
        this.endName = `${this.fullName}:end`;
    }
}
function sendStats(list) {
    _src_lib_messaging__WEBPACK_IMPORTED_MODULE_0__.message("performance_background", "receiveStatsJson", JSON.stringify(list));
}


/***/ }),

/***/ "./src/state.ts":
/*!**********************!*\
  !*** ./src/state.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getAsync": () => (/* binding */ getAsync),
/* harmony export */   "default": () => (/* binding */ state)
/* harmony export */ });
/* harmony import */ var _src_lib_logging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @src/lib/logging */ "./src/lib/logging.ts");
/* harmony import */ var _src_lib_messaging__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @src/lib/messaging */ "./src/lib/messaging.ts");
/* harmony import */ var _src_lib_webext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @src/lib/webext */ "./src/lib/webext.ts");
/* harmony import */ var ramda__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ramda */ "./node_modules/ramda/es/pick.js");
/**
 * Tridactyl shared state
 *
 * __NB__: Here be dragons.
 *
 * In the background script, "state" can be used as a normal object. Just "import state from "@src/state"
 *
 * In the content scripts, "state" can be set as a normal object and changes will propagate to the background script.
 *
 * In the content scripts, "state" must be read using "import * as State from "@src/state" and "State.getAsync(property)". If you read it directly with `state` you should get an error at runtime. Certain methods like `concat` will not throw an error but their behaviour is not defined and should be avoided.
 */




const logger = new _src_lib_logging__WEBPACK_IMPORTED_MODULE_0__.default("state");
class State {
    constructor() {
        this.lastSearchQuery = undefined;
        this.cmdHistory = [];
        this.prevInputs = [
            {
                inputId: undefined,
                tab: undefined,
                jumppos: undefined,
            },
        ];
        this.last_ex_str = "echo";
    }
}
// Store these keys in the local browser storage to persist between restarts
const PERSISTENT_KEYS = ["cmdHistory"];
// Don't change these from const or you risk breaking the Proxy below.
const defaults = Object.freeze(new State());
const overlay = {};
browser.storage.local
    .get("state")
    .then(res => {
    if ("state" in res) {
        logger.debug("Loaded initial state:", res.state);
        Object.assign(overlay, res.state);
    }
})
    .catch((...args) => logger.error(...args));
const state = new Proxy(overlay, {
    /** Give defaults if overlay doesn't have the key */
    get(target, property) {
        if ((0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.notBackground)())
            throw new Error("State object must be accessed with getAsync in content");
        if (property in target) {
            return target[property];
        }
        else {
            return defaults[property];
        }
    },
    set(target, property, value) {
        logger.debug("State changed!", property, value);
        if ((0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.notBackground)()) {
            browser.runtime.sendMessage({
                type: "state",
                command: "stateUpdate",
                args: { property, value },
            });
            return true;
        }
        // Do we need a global storage lock?
        target[property] = value;
        // Persist "sets" to storage in the background for some keys
        if (PERSISTENT_KEYS.includes(property)) {
            // Ensure we don't accidentally store anything sensitive
            if (browser.extension.inIncognitoContext) {
                console.error("Attempted to write to storage in private window.");
                return false;
            }
            browser.storage.local.set({
                state: ramda__WEBPACK_IMPORTED_MODULE_3__.default(PERSISTENT_KEYS, target),
            });
        }
        return true;
    },
});
async function getAsync(property) {
    if ((0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.notBackground)())
        return browser.runtime.sendMessage({
            type: "state",
            command: "stateGet",
            args: [{ prop: property }],
        });
    else
        return state[property];
}
// Skip this in mock testing - the mock doesn't like notBackground
// Keep instances of state.ts synchronised with each other
_src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.notBackground &&
    !(0,_src_lib_webext__WEBPACK_IMPORTED_MODULE_2__.notBackground)() &&
    _src_lib_messaging__WEBPACK_IMPORTED_MODULE_1__.addListener("state", (message, sender, sendResponse) => {
        if (message.command == "stateUpdate") {
            const property = message.args.property;
            const value = message.args.value;
            logger.debug("State changed!", property, value);
            state[property] = value;
        }
        else if (message.command == "stateGet") {
            sendResponse(state[message.args[0].prop]);
        }
        else
            throw new Error("Unsupported message to state, type " + message.command);
    });



/***/ }),

/***/ "?b867":
/*!********************!*\
  !*** fs (ignored) ***!
  \********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?cdbe":
/*!**********************!*\
  !*** path (ignored) ***!
  \**********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?282e":
/*!**********************!*\
  !*** path (ignored) ***!
  \**********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?488f":
/*!*********************!*\
  !*** url (ignored) ***!
  \*********************/
/***/ (() => {

/* (ignored) */

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/commandline_frame.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=commandline_frame.js.map