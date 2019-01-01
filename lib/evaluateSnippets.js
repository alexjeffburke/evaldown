/* global global */
var async = require('async');
var extend = require('./extend');
var vm = require('vm');
var fs = require('fs');
var createExpect = require('./createExpect');
var locateBabelrc = require('./locateBabelrc');

var transpile;
var hasBabel = false;
try {
    var babelCore = require.main.require('babel-core');
    var babelrc = locateBabelrc();
    var babelOptions = JSON.parse(fs.readFileSync(babelrc, 'utf-8'));
    hasBabel = true;

    transpile = function transpile(code) {
        var babelResult = babelCore.transform(code, extend({}, babelOptions, {
            sourceMaps: false,
            compact: false
        }));

        return babelResult.code.replace(/'use strict';/, '');
    };
} catch (e) {
    transpile = function transpile(code) {
        return code;
    };
}

function isPromise(value) {
    return value &&
        typeof value.then === 'function' &&
        typeof value.caught === 'function';
}

function getErrorMessage(expect, format, error) {
    if (error) {
        if (error.getErrorMessage) {
            var output = expect.createOutput ? expect.createOutput(format) : expect.output.clone(format);
            return error.getErrorMessage({ output: output }).toString(format);
        } else if (error.output) {
            return error.output.toString(format);
        } else {
            return expect.output.clone(format).error(error && error.message || '').toString(format);
        }
    } else {
        return '';
    }
}

module.exports = function (snippets, options, cb) {
    var oldGlobal = extend({}, global);
    var expect = createExpect(options);
    global.expect = expect.clone();
    global.require = require;

    if (hasBabel) {
        var preambleSeparator = '\n//---------------------preamble----------------------\n';
        var separator = '\n//---------------------separator---------------------\n';

        var exampleSnippets = snippets.filter(function (snippet) {
            return snippet.lang === 'javascript' && snippet.flags.evaluate;
        });

        if (exampleSnippets.length) {
            var codeForTranspilation = preambleSeparator + exampleSnippets.map(function (snippet) {
                return snippet.flags.async
                    ? '(function () {' + snippet.code + '})();'
                    : snippet.code;
            }).join(separator);

            var transpiledCode = transpile(codeForTranspilation);
            var transpiledSnippets = transpiledCode.split(new RegExp(preambleSeparator + '|' + separator));

            var preamble = transpiledSnippets[0];
            vm.runInThisContext(preamble);

            transpiledSnippets.slice(1).forEach(function (transpiledSnippet, i) {
                exampleSnippets[i].code = transpiledSnippet;
            });
        }
    }

    async.eachSeries(snippets, function (snippet, cb) {
        if (snippet.lang === 'javascript' && snippet.flags.evaluate) {
            try {
                if (snippet.flags.freshExpect) {
                    global.expect = expect.clone();
                }

                if (snippet.flags.async) {
                    var promise = vm.runInThisContext(
                        hasBabel
                            ? snippet.code
                            : '(function () {' + snippet.code + '})();'
                    );
                    if (!isPromise(promise)) {
                        throw new Error('Async code block did not return a promise or throw\n' + snippet.code);
                    }
                    promise.then(function () {
                        cb();
                    }).caught(function (e) {
                        snippet.htmlErrorMessage = getErrorMessage(global.expect, 'html', e);
                        snippet.errorMessage = getErrorMessage(global.expect, 'text', e);
                        cb();
                    });
                } else {
                    vm.runInThisContext(snippet.code);
                    cb();
                }
            } catch (e) {
                snippet.htmlErrorMessage = getErrorMessage(global.expect, 'html', e);
                snippet.errorMessage = getErrorMessage(global.expect, 'text', e);
                cb();
            }
        } else {
            cb();
        }
    }, function () {
        Object.keys(global).forEach(function (key) {
            if (!(key in oldGlobal)) {
                delete global[key];
            }
        });
        extend(global, oldGlobal);
        cb();
    });
};
