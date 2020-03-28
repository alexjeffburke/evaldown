var vm = require("vm");

const debug = require("../debug").extend("evaluateSnippets");

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

function getOutputString(expect, format, output) {
  if (typeof output === "string") {
    return output;
  } else if (output) {
    return expect.inspect(output, 6, format).toString();
  } else {
    return "";
  }
}

module.exports = async function(snippets, options) {
  const { baseExpect, captureOutput, transpile } = options || {};

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

  for (const [index, snippet] of snippets.entries()) {
    debug(`snippet ${index}: lang=${snippet.lang}`);

    if (snippet.lang === "javascript" && snippet.flags.evaluate) {
      debug(`snippet ${index}: flags=`, snippet.flags);

      try {
        if (snippet.flags.freshExpect) {
          if (!hasGlobalExpect) {
            throw new Error(
              "cannot clone with missing or invalid expect global for freshExpect"
            );
          }
          global.expect = global.expect.clone();
        }

        let output;
        if (snippet.flags.async) {
          const codeToRun = hasTranspile
            ? snippet.code
            : `(function () {${convertForEval(snippet.code)}})();`;
          debug(`snippet ${index}: evaluating [async]...\n${codeToRun}`);
          const promise = vm.runInThisContext(codeToRun);

          if (!isPromise(promise)) {
            throw new Error(
              `Async code block did not return a promise or throw\n${snippet.code}`
            );
          }

          output = await promise;
        } else {
          let codeToRun = hasTranspile
            ? snippet.code
            : convertForEval(snippet.code);
          if (captureOutput) {
            codeToRun = `(function () {${codeToRun}})();`;
          }
          debug(`snippet ${index} - evaluating: ${codeToRun}`);
          output = vm.runInThisContext(codeToRun);
        }

        if (captureOutput) {
          const expectForOutput = hasGlobalExpect ? global.expect : baseExpect;
          snippet.htmlOutput = getOutputString(expectForOutput, "html", output);
          snippet.output = getOutputString(expectForOutput, "text", output);
        }
      } catch (e) {
        const expectForError = hasGlobalExpect ? global.expect : baseExpect;
        snippet.htmlErrorMessage = getErrorMessage(expectForError, "html", e);
        snippet.errorMessage = getErrorMessage(expectForError, "text", e);
      }
    } else {
      debug(`snippet ${index}: skipping`);
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
