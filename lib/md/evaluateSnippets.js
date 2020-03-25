var vm = require("vm");

function convertForEval(code) {
  // Avoid "Identifier '...' has already been declared"
  return code.replace(/\b(?:const|let)\s/g, "var ");
}

function isPromise(value) {
  return value && typeof value.then === "function";
}

function getErrorMessage(expect, format, error) {
  if (error) {
    if (error.getErrorMessage) {
      var expectForOutput = error.expect || expect;
      var output = expectForOutput.createOutput
        ? expectForOutput.createOutput(format)
        : expectForOutput.output.clone(format);
      return error.getErrorMessage({ output: output }).toString(format);
    } else if (error.output) {
      return error.output.toString(format);
    } else {
      return expect.output
        .clone(format)
        .error((error && error.message) || "")
        .toString(format);
    }
  } else {
    return "";
  }
}

module.exports = async function(snippets, options) {
  options = options || {};

  // capture all keys on the undisturbed global object
  const oldGlobal = Object.assign({}, global);
  // setup the new global environment
  global.require = require;
  // attach globals supplied via options
  for (const [variable, variableValue] of Object.entries(
    options.globals || {}
  )) {
    global[variable] = variableValue;
  }

  const hasGlobalExpect = !!(global.expect && global.expect._topLevelExpect);
  const transpile = options.transpile;
  const hasTranspile = typeof transpile === "function";

  if (hasTranspile) {
    var preambleSeparator =
      "\n//---------------------preamble----------------------\n";
    var separator = "\n//---------------------separator---------------------\n";

    var exampleSnippets = snippets.filter(function(snippet) {
      return snippet.lang === "javascript" && snippet.flags.evaluate;
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
    if (snippet.lang === "javascript" && snippet.flags.evaluate) {
      try {
        if (snippet.flags.freshExpect) {
          if (!hasGlobalExpect) {
            throw new Error(
              "cannot clone with missing or invalid expect global for freshExpect"
            );
          }
          global.expect = global.expect.clone();
        }

        if (snippet.flags.async) {
          var promise = vm.runInThisContext(
            hasTranspile
              ? snippet.code
              : `(function () {${convertForEval(snippet.code)}})();`
          );

          if (!isPromise(promise)) {
            throw new Error(
              `Async code block did not return a promise or throw\n${snippet.code}`
            );
          }

          await promise;
        } else {
          vm.runInThisContext(
            hasTranspile ? snippet.code : convertForEval(snippet.code)
          );
        }
      } catch (e) {
        const expectForError = hasGlobalExpect
          ? global.expect
          : options.baseExpect;
        snippet.htmlErrorMessage = getErrorMessage(expectForError, "html", e);
        snippet.errorMessage = getErrorMessage(expectForError, "text", e);
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
