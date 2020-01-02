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
    var babelResult = babelCore.transform(code, {
      ...babelOptions,
      sourceMaps: false,
      compact: false
    });

    return babelResult.code.replace(/'use strict';/, '');
  };
} catch (e) {
  transpile = function transpile(code) {
    // Avoid "Identifier '...' has already been declared"
    return code.replace(/\b(?:const|let)\s/g, 'var ');
  };
}

function isPromise(value) {
  return value && typeof value.then === 'function';
}

function getErrorMessage(expect, format, error) {
  if (error) {
    if (error.getErrorMessage) {
      var output = expect.createOutput
        ? expect.createOutput(format)
        : expect.output.clone(format);
      return error.getErrorMessage({ output: output }).toString(format);
    } else if (error.output) {
      return error.output.toString(format);
    } else {
      return expect.output
        .clone(format)
        .error((error && error.message) || '')
        .toString(format);
    }
  } else {
    return '';
  }
}

module.exports = async function(snippets, options) {
  var oldGlobal = Object.assign({}, global);
  var expect = createExpect(options);
  global.expect = expect.clone();
  global.require = require;

  if (hasBabel) {
    var preambleSeparator =
      '\n//---------------------preamble----------------------\n';
    var separator = '\n//---------------------separator---------------------\n';

    var exampleSnippets = snippets.filter(function(snippet) {
      return snippet.lang === 'javascript' && snippet.flags.evaluate;
    });

    if (exampleSnippets.length) {
      var codeForTranspilation =
        preambleSeparator +
        exampleSnippets
          .map(function(snippet) {
            return snippet.flags.async
              ? `(function () {${snippet.code}})();`
              : snippet.code;
          })
          .join(separator);

      var transpiledCode = transpile(codeForTranspilation);
      var transpiledSnippets = transpiledCode.split(
        new RegExp(`${preambleSeparator}|${separator}`)
      );

      var preamble = transpiledSnippets[0];
      const remainingSnippets = transpiledSnippets.slice(1);

      vm.runInThisContext(preamble);

      for (const [i, transpiledSnippet] of remainingSnippets.entries()) {
        exampleSnippets[i].code = transpiledSnippet;
      }
    }
  }

  for (const snippet of snippets) {
    if (snippet.lang === 'javascript' && snippet.flags.evaluate) {
      try {
        if (snippet.flags.freshExpect) {
          global.expect = expect.clone();
        }

        if (snippet.flags.async) {
          var promise = vm.runInThisContext(
            hasBabel
              ? snippet.code
              : `(function () {${transpile(snippet.code)}})();`
          );

          if (!isPromise(promise)) {
            throw new Error(
              `Async code block did not return a promise or throw\n${snippet.code}`
            );
          }

          try {
            await promise;
          } catch (e) {
            snippet.htmlErrorMessage = getErrorMessage(
              global.expect,
              'html',
              e
            );
            snippet.errorMessage = getErrorMessage(global.expect, 'text', e);
          }
        } else {
          vm.runInThisContext(
            hasBabel ? snippet.code : transpile(snippet.code)
          );
        }
      } catch (e) {
        snippet.htmlErrorMessage = getErrorMessage(global.expect, 'html', e);
        snippet.errorMessage = getErrorMessage(global.expect, 'text', e);
      }
    }
  }

  for (const key of Object.keys(global)) {
    if (!(key in oldGlobal)) {
      delete global[key];
    }
  }

  // inline function used for compatibility with node 8
  for (const key of Object.keys(oldGlobal)) {
    global[key] = oldGlobal[key];
  }
};
