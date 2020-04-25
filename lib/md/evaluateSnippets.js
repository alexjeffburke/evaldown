var Module = require("module");
var path = require("path");
var vm = require("vm");

const createRequire = filepath => {
  const filename = path.join(filepath, "noop.js");
  // eslint-disable-next-line node/no-deprecated-api
  return (Module.createRequire || Module.createRequireFromPath)(filename);
};

const canEvaluate = require("./canEvaluate");
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

function getOutputString(expect, format, flags, output) {
  if (typeof output === "undefined" && flags.return) {
    return format === "html" ? `<div style="">&nbsp;</div>` : "";
  } else {
    return expect.inspect(output, 6, format).toString();
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
    return snippet.transpiled;
  }

  const { code } = snippet;
  if (flags.async) {
    return `(async function () {${convertForEval(code)}})();`;
  } else if (flags.return) {
    return `(function () {${convertForEval(code)}})();`;
  } else {
    return convertForEval(code);
  }
}

function prepareFlagsForExecution(capture, snippet) {
  const appliedFlagsSet = new Set(Object.keys(snippet.flags || {}));

  // Determine if the snippet has a flag set that should
  // take precedence over the capture mode. If one is found
  // do not set the capture mode key - note this is needed
  // because currently the modes are exclusive within eval.
  const hasExplicitCaptureFlag = ["console", "nowrap", "return"].some(flag =>
    appliedFlagsSet.has(flag)
  );

  return hasExplicitCaptureFlag
    ? { ...snippet.flags }
    : { [capture]: true, ...snippet.flags };
}

function prepareGlobalForExecution(options) {
  const { pwdPath, requirePath } = options;
  const fileGlobals = options.fileGlobals || {};
  const metadata = options.fileMetadata || {};

  // attach any custom globals that have been specified
  for (const [variable, createVariable] of Object.entries(fileGlobals)) {
    global[variable] = createVariable({ metadata });
  }

  // execute any supplied runtime preamble
  if (options.preamble) {
    // resolve require in the preamble relative to the module
    global.require = createRequire(requirePath || pwdPath);
    vm.runInThisContext(convertForEval(options.preamble));
  }
}

function prepareEnvironmentForExecution(flags, markdown, options) {
  const { pwdPath } = options;
  const globalsToReplace = {};

  if (flags.freshContext) {
    // mark everything to be put back after this snippet executes
    for (const key of Object.keys(global)) {
      globalsToReplace[key] = global[key];
    }

    // reinitialise the global
    prepareGlobalForExecution(options);
  }

  // resolve require in the snippets relavtive to the source markdown
  global.require = createRequire(pwdPath);

  if (flags.console) {
    globalsToReplace.console = global.console;
    global.console = markdown.inspectedConsole;
  }

  return function cleanup() {
    if (flags.freshContext) {
      removeExtraneousGlobals(global, globalsToReplace);
    }

    for (const key of Object.keys(globalsToReplace)) {
      global[key] = globalsToReplace[key];
    }
  };
}

function removeExtraneousGlobals(global, baseGlobal) {
  for (const key of Object.keys(global)) {
    if (!(key in baseGlobal)) {
      delete global[key];
      // failsafe
      if (global[key]) {
        // the symbol was not removed so trample it
        global[key] = undefined;
      }
    }
  }
}

async function evaluateSnippet(snippet, flags, { markdown }) {
  const hasGlobalExpect = !!(global.expect && global.expect._topLevelExpect);

  // set any local expect present in globals to be used for serialisation
  markdown.setExpect(hasGlobalExpect ? global.expect : null);

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
    if (isPromise(resultOrPromise)) {
      result = await resultOrPromise;
    } else {
      result = resultOrPromise;
    }

    if (flags.return || flags.async) {
      const expectForOutput = markdown.getExpect();
      output.kind = "result";
      output.html = getOutputString(expectForOutput, "html", flags, result);
      output.text = getOutputString(expectForOutput, "text", flags, result);
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

    const expectForError = markdown.getExpect();
    output.kind = "error";
    output.html = getErrorMessage(expectForError, "html", e);
    output.text = getErrorMessage(expectForError, "text", e);
  }

  return output;
}

module.exports = async function evaluateSnippets(snippets, options) {
  options = options || {};
  const { markdown, capture } = options;

  // capture all keys on the undisturbed global object
  const oldGlobal = Object.assign({}, global);

  prepareGlobalForExecution(options);

  const snippetErrors = {};

  for (const [index, snippet] of snippets.entries()) {
    debug(`snippet ${index}: lang=${snippet.lang}`);

    const flags = prepareFlagsForExecution(capture, snippet);
    const cleanup = prepareEnvironmentForExecution(flags, markdown, options);

    if (canEvaluate(snippet) && snippet.flags.evaluate) {
      try {
        snippet.output = await evaluateSnippet(snippet, flags, options);

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

  // remove any globals created by snippets
  removeExtraneousGlobals(global, oldGlobal);

  // reset all globals to their default values
  for (const key of Object.keys(oldGlobal)) {
    global[key] = oldGlobal[key];
  }

  // now that cleanup of the environment has run
  // report any errors that occurred to the caller
  return snippetErrors;
};

module.exports.evaluateSnippet = evaluateSnippet;
module.exports.prepareFlags = function prepareFlags(snippet, options) {
  return prepareFlagsForExecution(options.capture, snippet);
};
