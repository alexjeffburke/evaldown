const vm = require("vm");

const createRequire = require("./createRequire");
const debug = require("../debug").extend("evaluateSnippets");
const errors = require("../errors");
const InspectedConsole = require("../InspectedConsole");
const rewriteSource = require("./rewriteSource");
const { canEvaluate } = require("./snippetIdentity");

const consoleSymbols = InspectedConsole.symbols;

function isPromise(value) {
  return value && typeof value.then === "function";
}

function getErrorMessage(expect, format, error) {
  if (typeof error === "undefined") {
    error = new Error("rejection or thrown exception without value");
  } else if (typeof error === "string") {
    const displayString = error.length > 0 ? error : "<empty>";
    error = new Error(
      `rejection or thrown exception with string value: ${displayString}`
    );
  } else if (!(error instanceof Error)) {
    error = new Error(
      `rejection or thrown exception with value: ${expect.inspect(error)}`
    );
  } else if (error.getErrorMessage) {
    const expectForOutput = error.expect || expect;
    if (error.expect) {
      expectForOutput.output.preferredWidth = 80;
    }
    const output = expectForOutput.createOutput
      ? expectForOutput.createOutput(format)
      : expectForOutput.output.clone(format);
    return error.getErrorMessage({ output: output }).toString(format);
  } else if (error.output) {
    return error.output.toString(format);
  }

  return expect.output
    .clone(format)
    .error(error.message)
    .toString(format);
}

function getOutputString(expect, format, flags, output) {
  if (typeof output === "undefined" && flags.return) {
    return format === "html" ? `<div style="">&nbsp;</div>` : "";
  } else {
    return expect.inspect(output, 6, format).toString();
  }
}

function identifyErrorForRethrow(e) {
  if (e && (e.name === "ReferenceError" || e.name === "InvalidCodeError")) {
    return new errors.SnippetEvaluationError({
      message: e.message,
      data: { original: e }
    });
  }

  return null;
}

function prepareCodeForExecution(snippet, flags) {
  let code;

  if (snippet.transpiled) {
    code = snippet.transpiled;
  } else {
    code = prepareCodeForParsing(snippet, flags);
  }

  if (code) {
    return rewriteSource(code);
  } else {
    return "";
  }
}

function prepareCodeForParsing(snippet, flags) {
  const { code } = snippet;
  if (!code) {
    return "";
  } else if (flags.async) {
    return `(async function () {\n${code}\n})();`;
  } else {
    return `(function () {\n${code}\n})();`;
  }
}

function prepareFlagsForExecution(capture, snippet) {
  const appliedFlagsSet = new Set(Object.keys(snippet.flags || {}));

  // Determine if the snippet has a flag set that should
  // take precedence over the capture mode. If one is found
  // do not set the capture mode key - note this is needed
  // because currently the modes are exclusive within eval.
  const hasExplicitCaptureFlag = ["console", "return"].some(flag =>
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

  global.__dirname = pwdPath;

  // execute any supplied runtime preamble
  if (options.preamble) {
    // resolve require in the preamble relative to the module
    global.require = createRequire(requirePath || pwdPath);
    // execute the preamble in global context
    vm.runInThisContext(rewriteSource(`(function () {${options.preamble}})()`));
  }

  // attach any custom globals that have been specified
  for (const [variable, createVariable] of Object.entries(fileGlobals)) {
    global[variable] = createVariable({ metadata });
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

    // remove everything from the global that was added by snippets
    removeExtraneousGlobals(global, options.baseGlobal);

    // reinitialise the global
    prepareGlobalForExecution(options);

    // restore any globals that were persisted
    Object.assign(global, options.persistContext);
  }

  // resolve require in the snippets relavtive to the source markdown
  global.require = createRequire(pwdPath);

  if (flags.console) {
    globalsToReplace.console = global.console;
    global.console = markdown.inspectedConsole;
    global.console[consoleSymbols.setOption]("isQuoted", false);
  }

  return function cleanup() {
    if (flags.freshContext) {
      removeExtraneousGlobals(global, globalsToReplace);
    } else if (flags.persist) {
      const persistGlobals = recordExtraneousGlobals(
        global,
        options.baseGlobal
      );

      Object.assign(options.persistContext, persistGlobals);
    }

    for (const key of Object.keys(globalsToReplace)) {
      global[key] = globalsToReplace[key];
    }
  };
}

function recordExtraneousGlobals(global, baseGlobal) {
  const extraneousGlobals = {};

  for (const key of Object.keys(global)) {
    if (!(key in baseGlobal)) {
      extraneousGlobals[key] = global[key];
    }
  }

  return extraneousGlobals;
}

function removeExtraneousGlobals(global, baseGlobal) {
  const extraneousGlobals = recordExtraneousGlobals(global, baseGlobal);

  for (const key of Object.keys(extraneousGlobals)) {
    delete global[key];
    // failsafe
    if (global[key]) {
      // the symbol was not removed so trample it
      global[key] = undefined;
    }
  }
}

async function evaluateSnippet(snippet, flags, context, { markdown }) {
  const hasGlobalExpect = !!(context.expect && context.expect._topLevelExpect);

  // set any local expect present in globals to be used for serialisation
  markdown.setExpect(hasGlobalExpect ? context.expect : null);

  if (!flags.evaluate) throw new errors.SnippetSkippedError();

  debug(`evaluating with flags=`, flags);

  const output = {
    kind: "",
    html: "",
    text: ""
  };

  try {
    debug(`preparing code to execute\n${snippet.code}`);

    const code = prepareCodeForExecution(snippet, flags);
    if (code === null) {
      throw new errors.InvalidCodeError("unable to parse code");
    }

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
    } else if (context.console instanceof InspectedConsole) {
      if (context.console[consoleSymbols.isEmpty]()) return output;
      const evalCons = context.console;
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
  options = options ? { ...options } : {};
  const { markdown, capture } = options;

  // capture all keys on the undisturbed global object
  const oldGlobal = Object.assign({}, global);

  prepareGlobalForExecution(options);

  // capture all keys on a populated global object
  const baseGlobal = Object.assign({}, global);
  options.baseGlobal = baseGlobal;

  // prepare storage for globals to persist into fresh context
  options.persistContext = {};

  const snippetErrors = {};

  for (const [index, snippet] of snippets.entries()) {
    debug(`snippet ${index}: lang=${snippet.lang}`);

    const flags = prepareFlagsForExecution(capture, snippet);
    const cleanup = prepareEnvironmentForExecution(flags, markdown, options);

    if (!canEvaluate(snippet)) continue;

    try {
      snippet.output = await evaluateSnippet(snippet, flags, global, options);

      debug(`snippet ${index}: evaluation SUCCEEDED`);
    } catch (e) {
      if (e.name === "SnippetSkippedError") {
        debug(`snippet ${index}: evaluation SKIPPED`);
        continue;
      }

      snippetErrors[index] = e;

      debug(`snippet ${index}: evaluation ERRORED`);
      debug(String(e));
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
module.exports.prepareCode = function prepareCode(snippet, flags) {
  return prepareCodeForParsing(snippet, flags);
};
module.exports.prepareFlags = function prepareFlags(snippet, options) {
  return prepareFlagsForExecution(options.capture, snippet);
};
