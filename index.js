"use strict";

var fs = require("fs");

var dirname = require("path").dirname;
var join_paths = require("path").join;

var _ = require("underscore");
var mkdirp = require("mkdirp");
var quick_temp = require("quick-temp");
var map_series = require("promise-map-series");
var walk_sync = require("walk-sync");

var filter = require("broccoli-dep-filter");

var parse_setup = require("grunt-stencil/lib/parse");
var compilers_setup = require("grunt-stencil/lib/compilers");
var process_file_setup = require("grunt-stencil/lib/process_file");

var dot_compiler = require("grunt-stencil/lib/dot_compiler")({});
var markdown_compiler = require("grunt-stencil/lib/markdown_compiler");

var META_DATA_SEPARATOR = /\r?\n\r?\n/;

module.exports = stencil;

function stencil (trees, options) {
  var pages_tree = trees.pages;
  var partials_tree = trees.partials;
  var templates_tree = trees.templates;

  options = options     || {};
  var env = options.env || {};

  var parse = parse_setup(META_DATA_SEPARATOR);

  var compile = compilers_setup({
    read_content: _.compose(parse.content, read_file),
    compilers:    [dot_compiler, markdown_compiler]
  });

  return filter({
    trees: {
      pages: pages_tree,
      partials: partials_tree,
      templates: templates_tree
    },
    iterated: ["pages"],
    init: init,
    extensions: ["html", "md"],
    target: "html",
    read: false
  });

  function init (roots) {
    var partials  = { root: roots.partials, paths: walk_sync(roots.partials) };
    var templates = { root: roots.templates, paths: walk_sync(roots.templates) };

    var process_file = process_file_setup({
      compile:            compile,
      read_header:        _.compose(parse.header, read_file),
      find_closest_match: find_closest_match,
      options: {
        env:       env,
        partials:  partials,
        templates: templates
      }
    });

    return process;

    function process (path) {
      return process_file(path).toString();
    }

    function find_closest_match (tree, name) {
      // Stencil for pages passes "." which should be changed
      if (tree === ".") return name;

      var path = tree.paths.filter(function (path) {
        return path.indexOf(name) === 0;
      })[0];

      return join_paths(tree.root, path);
    }
  }

  function cleanup () {
    quick_temp.remove(tmp, "path");
  }
}

function read_file (path) {
  return fs.readFileSync(path, "utf8");
}
