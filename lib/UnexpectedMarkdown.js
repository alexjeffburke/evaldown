var Snippets = require('./Snippets');
var createExpect = require('./createExpect');
var snippetRegexp = require('./snippetRegexp');
var marked = require('marked-papandreou');
var fs = require('fs');
var pathModule = require('path');
var convertMarkdownToMocha = require('./convertMarkdownToMocha');
var cleanStackTrace = require('./cleanStackTrace');

var maps = {};

// Make the md-to-mocha transpiler avaliable as a side effect of requiring unexpected-markdown
// so that mocha --compilers md:unexpected-markdown will work:
// eslint-disable-next-line node/no-deprecated-api
require.extensions['.md'] = function(module, fileName) {
  var sourceMapWithCode = convertMarkdownToMocha(
    fs.readFileSync(fileName, 'utf-8'),
    fileName
  );

  var absoluteFileName = pathModule.resolve(process.cwd(), fileName);

  // Register the source map with the main UnexpectedMarkdown, which tries to detect the source-map-support
  // module and registers a handler with it:
  var map = sourceMapWithCode.map.toString();
  var code = sourceMapWithCode.code;

  maps[absoluteFileName] = map;

  module._compile(code, fileName);
};

var sourceMapSupport;
try {
  sourceMapSupport = require.main.require('source-map-support');
} catch (e) {
  sourceMapSupport = require('source-map-support');
}

if (sourceMapSupport) {
  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    retrieveSourceMap: function(source) {
      return maps[source] ? { url: null, map: maps[source] } : null;
    }
  });
}

var styleRegex = /style=".*?"/;

function UnexpectedMarkdown(content) {
  if (!(this instanceof UnexpectedMarkdown)) {
    return new UnexpectedMarkdown(content);
  }
  this.content = content;
}

UnexpectedMarkdown.prototype.toHtml = async function(options) {
  var content = this.content;
  var expect = createExpect(options);

  const snippets = await this.getSnippets(options);

  var index = 0;
  var renderer = new marked.Renderer();
  renderer.code = function(code) {
    var snippet = snippets.get(index);
    var previousSnippet = snippets.get(index - 1);
    index += 1;
    var lang = snippet.lang;
    if (lang === 'output') {
      if (previousSnippet && previousSnippet.lang === 'javascript') {
        if (previousSnippet.htmlErrorMessage) {
          return previousSnippet.htmlErrorMessage.replace(
            styleRegex,
            'class="output"'
          );
        }

        return '<div class="output"></div>';
      } else {
        throw new Error(
          `No matching javascript block for output:\n${snippet.code}`
        );
      }
    }

    return expect.output
      .clone('html')
      .code(code, lang)
      .toString()
      .replace(styleRegex, `class="code ${this.options.langPrefix}${lang}"`);
  };

  return marked(content, { renderer: renderer, ...options });
};

UnexpectedMarkdown.prototype.getSnippets = async function(options) {
  if (this.snippets) {
    return this.snippets;
  } else {
    return Snippets.fromMarkdown(this.content).evaluate(options);
  }
};

UnexpectedMarkdown.prototype.withUpdatedExamples = async function(options) {
  const snippets = await this.getSnippets(options);

  var index = 0;
  var updatedContent = this.content.replace(snippetRegexp, function(
    $0,
    htmlComments,
    lang
  ) {
    var currentIndex = index;
    index += 1;
    var snippet = snippets.get(currentIndex);
    if (snippet.lang === 'output') {
      var example = snippets.get(currentIndex - 1);
      var output = '';
      if (example && example.lang === 'javascript') {
        if (example.errorMessage) {
          output = example.errorMessage;
          if (snippet.flags.cleanStackTrace) {
            output = cleanStackTrace(output);
          }
        }
      }
      return `${htmlComments || ''}\`\`\`${lang}\n${output}\n\`\`\``;
    } else {
      return $0;
    }
  });

  return new UnexpectedMarkdown(updatedContent);
};

UnexpectedMarkdown.prototype.toString = function() {
  return this.content;
};

module.exports = UnexpectedMarkdown;
