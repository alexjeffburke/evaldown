var vm = require("vm");

const debug = require("../debug").extend("evaluateSnippets");
const errors = require("../errors");
const InspectedConsole = require("../InspectedConsole");

const consoleSymbols = InspectedConsole.symbols;

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

function identifyErrorForRethrow(e) {
  if (e.name === "ReferenceError") {
    return new errors.EvaluationError({
      message: e.message,
      data: { original: e }
    });
  }

  return null;
}

function prepareCodeForExecution(snippet, { captureOutput, hasTranspile }) {
  const { code, flags } = snippet;

  if (hasTranspile) {
    return code;
  } else if (flags.async || captureOutput) {
    return `(function () {${convertForEval(code)}})();`;
  } else {
    return convertForEval(code);
  }
}

async function evaluateSnippet(
  snippet,
  { global, baseExpect, captureOutput = false, hasTranspile = false }
) {
  const hasGlobalExpect = !!(global.expect && global.expect._topLevelExpect);

  debug(`evaluating with flags=`, snippet.flags);

  const output = {
    kind: "",
    html: "",
    text: ""
  };

  try {
    if (snippet.flags.freshExpect) {
      if (!hasGlobalExpect) {
        throw new Error(
          "cannot clone with missing or invalid expect global for freshExpect"
        );
      }
      global.expect = global.expect.clone();
    }

    debug(`preparing code to execute\n${snippet.code}`);

    const code = prepareCodeForExecution(snippet, {
      captureOutput,
      hasTranspile
    });

    debug(`executing${snippet.flags.async ? " [async]" : ""}...\n${code}`);

    const resultOrPromise = vm.runInThisContext(code);

    let result;
    if (snippet.flags.async) {
      if (!isPromise(resultOrPromise)) {
        throw new Error(
          `Async code block did not return a promise or throw\n${snippet.code}`
        );
      }

      result = await resultOrPromise;
    } else {
      result = resultOrPromise;
    }

    if (captureOutput) {
      const expectForOutput = hasGlobalExpect ? global.expect : baseExpect;
      output.kind = "result";
      output.html = getOutputString(expectForOutput, "html", result);
      output.text = getOutputString(expectForOutput, "text", result);
    } else if (global.console instanceof InspectedConsole) {
      if (global.console[consoleSymbols.isEmpty]()) return output;
      const evalCons = global.console;
      output.kind = "console";
      output.html = evalCons[consoleSymbols.toString]("html");
      output.text = evalCons[consoleSymbols.toString]("text");
      evalCons[consoleSymbols.reset]();
    }
  } catch (e) {
    let errorForRethrow;
    if ((errorForRethrow = identifyErrorForRethrow(e)) !== null) {
      throw errorForRethrow;
    }

    const expectForError = hasGlobalExpect ? global.expect : baseExpect;
    output.kind = "error";
    output.html = getErrorMessage(expectForError, "html", e);
    output.text = getErrorMessage(expectForError, "text", e);
  }

  return output;
}

module.exports = async function(snippets, options) {
  options = options || {};
  const { baseExpect, captureOutput, transpile } = options;

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
      snippet.output = await evaluateSnippet(snippet, {
        global,
        baseExpect,
        captureOutput,
        hasTranspile
      });

      debug(`snippet ${index}: evaluated`);
    } else {
      debug(`snippet ${index}: skipping`);
    }
  }

  for (const key of Object.keys(global)) {
    if (!(key in oldGlobal)) {
      delete global[key];
      // failsafe
      if (global[key]) {
        // the symbol was not removed so trample it
        global[key] = undefined;
      }
    }
  }

  // inline function used for compatibility with node 8
  for (const key of Object.keys(oldGlobal)) {
    global[key] = oldGlobal[key];
  }
};
