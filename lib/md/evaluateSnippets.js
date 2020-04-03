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
    return new errors.SnippetEvaluationError({
      message: e.message,
      data: { original: e }
    });
  }

  return null;
}

function prepareCodeForExecution(snippet, flags) {
  if (snippet.transpiled) {
    const { transpiled } = snippet;
    if (flags.async || flags.return) {
      return `(function () {${transpiled}})();`;
    } else {
      return snippet.transpiled;
    }
  }

  const { code } = snippet;
  if (flags.async || flags.return) {
    return `(function () {${convertForEval(code)}})();`;
  } else {
    return convertForEval(code);
  }
}

function prepareEnvironmentForExecution(flags, global, markdown) {
  const globalsToReplace = [];

  if (flags.console) {
    globalsToReplace.console = global.console;
    global.console = markdown.inspectedConsole;
  }

  return function cleanup() {
    for (const key of Object.keys(globalsToReplace)) {
      global[key] = globalsToReplace[key];
    }
  };
}

function transpileSnippetsAndApplyUpdate(snippets, transpileFn) {
  const snippetsForEval = snippets.filter(function(snippet) {
    return snippet.lang === "javascript" && snippet.flags.evaluate;
  });

  if (snippetsForEval.length === 0) {
    return;
  }

  const preambleSeparator =
    "\n//---------------------preamble----------------------\n";
  const blockSeparator =
    "\n//---------------------separator---------------------\n";
  const separatorRegexp = new RegExp(`${preambleSeparator}|${blockSeparator}`);

  // wrap the snippet code blocks prior to transpilation based on their flags
  const snippetCodeForTranspilation = snippetsForEval.map(snippet =>
    snippet.flags.async ? `(function () {${snippet.code}})();` : snippet.code
  );

  // execute transpilation of all the snippets
  const transpiledCode = transpileFn(
    `${preambleSeparator}${snippetCodeForTranspilation.join(blockSeparator)}`
  );

  const injectedCode = transpiledCode[0];
  if (injectedCode) {
    vm.runInThisContext(injectedCode);
  }

  // unpack the transpiled code block for each snippet
  const transpiledBlocks = transpiledCode.split(separatorRegexp).slice(1);

  for (const [i, transpiledSnippet] of transpiledBlocks.entries()) {
    snippetsForEval[i].transpiled = transpiledSnippet;
  }
}

async function evaluateSnippet(snippet, flags, { global, baseExpect }) {
  const hasGlobalExpect = !!(global.expect && global.expect._topLevelExpect);

  debug(`evaluating with flags=`, flags);

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

    const code = prepareCodeForExecution(snippet, flags);

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

    if (flags.return) {
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

module.exports = async function evaluateSnippets(snippets, options) {
  options = options || {};
  const { markdown, capture } = options;
  const baseExpect = markdown.getExpect();

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

  const hasTranspile = typeof options.transpileFn === "function";
  if (hasTranspile) {
    transpileSnippetsAndApplyUpdate(snippets, options.transpileFn);
  }

  const snippetErrors = {};

  for (const [index, snippet] of snippets.entries()) {
    debug(`snippet ${index}: lang=${snippet.lang}`);

    const flags = { [capture]: true, ...snippet.flags };
    const cleanup = prepareEnvironmentForExecution(flags, global, markdown);

    if (snippet.lang === "javascript" && snippet.flags.evaluate) {
      try {
        snippet.output = await evaluateSnippet(snippet, flags, {
          global,
          baseExpect
        });

        debug(`snippet ${index}: evaluation SUCCEEDED`);
      } catch (e) {
        snippetErrors[index] = e;

        debug(`snippet ${index}: evaluation ERRORED`);
        debug(String(e));
      }
    } else {
      debug(`snippet ${index}: evaluation SKIPPED`);
    }

    cleanup();
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

  // now that cleanup of the environment has run
  // signal an error if any of the snippets failed
  if (Object.keys(snippetErrors).length > 0) {
    throw new errors.FileEvaluationError({
      data: { errors: snippetErrors }
    });
  }
};

module.exports.evaluateSnippet = evaluateSnippet;
module.exports.transpileSnippetsAndApplyUpdate = transpileSnippetsAndApplyUpdate;
