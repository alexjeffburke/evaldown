var extend = require('./extend');
var Snippets = require('./Snippets');
var createExpect = require('./createExpect');
var passError = require('passerror');
var snippetRegexp = require('./snippetRegexp');
var marked = require('marked-papandreou');
var fs = require('fs');
var convertMarkdownToMocha = require('./convertMarkdownToMocha');

// Make the md-to-mocha transpiler avaliable as a side effect of requiring unexpected-markdown
// so that mocha --compilers md:unexpected-markdown will work:
require.extensions['.md'] = function (module, fileName) {
    module._compile(convertMarkdownToMocha(fs.readFileSync(fileName, 'utf-8'), fileName), fileName);
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
        retrieveSourceMap: function (source) {
            var map = UnexpectedMarkdown.maps[source];
            return map ? { url: null, map: map } : null;
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

UnexpectedMarkdown.maps = {};

UnexpectedMarkdown.prototype.toHtml = function (options, cb) {
    var content = this.content;
    var expect = createExpect(options);
    this.getSnippets(options, passError(cb, function (snippets) {
        var index = 0;
        var renderer = new marked.Renderer();
        renderer.code = function(code, blockInfoString, escaped) {
            var snippet = snippets.get(index);
            var previousSnippet = snippets.get(index - 1);
            index += 1;
            var lang = snippet.lang;
            if (lang === 'output') {
                if (previousSnippet && previousSnippet.lang === 'javascript') {
                    if (previousSnippet.htmlErrorMessage) {
                        return previousSnippet.htmlErrorMessage
                            .replace(styleRegex, 'class="output"');
                    }

                    return '<div class="output"></div>';
                } else {
                    throw new Error('No matching javascript block for output:\n' + snippet.code);
                }
            }

            return expect.output.clone('html').code(code, lang).toString()
                .replace(styleRegex, 'class="code ' + this.options.langPrefix + lang + '"');
        };

        try {
            cb(null, marked(content, extend({ renderer: renderer }, options)));
        } catch (err) {
            cb(err);
        }
    }));
};

UnexpectedMarkdown.prototype.getSnippets = function (options, cb) {
    var that = this;
    if (this.snippets) {
        cb(null, this.snippets);
    } else {
        Snippets.fromMarkdown(this.content, options, function (err, snippets) {
            that.snippets = snippets;
            cb(null, snippets);
        });
    }
};

UnexpectedMarkdown.prototype.withUpdatedExamples = function (options, cb) {
    var content = this.content;
    this.getSnippets(options, passError(cb, function (snippets) {
        var index = 0;
        var updateContent = content.replace(snippetRegexp, function ($0, lang, code) {
            var currentIndex = index;
            index += 1;
            var snippet = snippets.get(currentIndex);
            if (snippet.lang === 'output') {
                var example = snippets.get(currentIndex - 1);
                var output = '';
                if (example && example.lang === 'javascript') {
                    if (example.errorMessage) {
                        output = example.errorMessage;
                    }
                }
                return '```' + lang + '\n' + output + '\n```';
            } else {
                return $0;
            }
        });
        cb(null, new UnexpectedMarkdown(updateContent));
    }));
};

UnexpectedMarkdown.prototype.toString = function () {
    return this.content;
};

module.exports = UnexpectedMarkdown;
