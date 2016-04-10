/*global JSON*/
var extend = require('./extend');
var Snippets = require('./Snippets');
var createExpect = require('./createExpect');
var passError = require('passerror');
var snippetRegexp = require('./snippetRegexp');
var marked = require('marked-papandreou');
var fs = require('fs');
var pathModule = require('path');
var convertMarkdownToMocha = require('./convertMarkdownToMocha');
var sourceMap = require('source-map');
var locateBabelrc = require('./locateBabelrc');

var fs = require('fs');
var babelCore;
var babelOptions;
try {
    babelCore = require.main.require('babel-core');
    var babelrc = locateBabelrc();
    babelOptions = JSON.parse(fs.readFileSync(babelrc, 'utf-8'));
} catch (e) {
    babelCore = null;
}

var maps = {};

// Make the md-to-mocha transpiler avaliable as a side effect of requiring unexpected-markdown
// so that mocha --compilers md:unexpected-markdown will work:
require.extensions['.md'] = function (module, fileName) {
    var sourceMapWithCode = convertMarkdownToMocha(fs.readFileSync(fileName, 'utf-8'), fileName);

    var absoluteFileName = pathModule.resolve(process.cwd(), fileName);

    // Register the source map with the main UnexpectedMarkdown, which tries to detect the source-map-support
    // module and registers a handler with it:
    var map = sourceMapWithCode.map.toString();
    var code = sourceMapWithCode.code;

    if (babelCore) {
        var inputSourceMap = JSON.parse(map);

        // Sanitize source map so it's not rejected by babel
        // (waiting for https://phabricator.babeljs.io/T7151 to be addressed)
        var inputMapConsumer = new sourceMap.SourceMapConsumer(inputSourceMap);
        var sourceMapGenerator = new sourceMap.SourceMapGenerator({
            file: inputMapConsumer.file,
            sourceRoot: inputMapConsumer.sourceRoot
        });

        inputMapConsumer.eachMapping(function (mapping) {
            var generatedPosition = inputMapConsumer.generatedPositionFor({
                line: mapping.generatedLine,
                column: mapping.generatedColumn,
                source: mapping.source
            });
            if (mapping.source !== null && generatedPosition.line !== null && mapping.originalLine !== null && mapping.name !== null) {
                sourceMapGenerator.addMapping({
                    source: mapping.source,
                    original: {
                        line: mapping.originalLine,
                        column: mapping.originalColumn
                    },
                    generated: generatedPosition
                });
            }
        });

        inputSourceMap.file = fileName;

        var babelResult = babelCore.transform(code, extend({}, babelOptions, {
            sourceMaps: true,
            compact: false,
            inputSourceMap: sourceMapGenerator.toJSON()
        }));
        code = babelResult.code;
        map = babelResult.map;
    }

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
        retrieveSourceMap: function (source) {
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
