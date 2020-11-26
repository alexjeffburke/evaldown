const cleanStackTrace = require("./cleanStackTrace");
const createExpect = require("./createExpect");
const debug = require("../debug").extend("Snippets");
const errors = require("../errors");
const extractSnippets = require("./extractSnippets");
const evaluateSnippets = require("./evaluateSnippets");
const snippetIdentity = require("./snippetIdentity");
const transpileSnippets = require("./transpileSnippets");

const snippetTestKeys = ["code", "lang", "flags", "output"];

function assertNoError(snippet) {
  const { output } = snippet;

  if (output.kind === "error") {
    throw new Error("snippet evaluation resulted in an error");
  }
}

function compareOutput(snippet, nextSnippet, { expect }) {
  const { output } = snippet;
  const { code: expectedText = "" } = nextSnippet;

  const hasOutput = output && (output.kind || output.text);
  if (hasOutput) {
    let seenText = output.text;

    if (nextSnippet.flags.cleanStackTrace) {
      seenText = cleanStackTrace(seenText);
    }

    if (seenText !== expectedText) {
      expect(seenText, "to equal", expectedText);
    }
  } else if (expectedText) {
    throw new Error("snippet did not generate expected output");
  }
}

function errorToPlainText(err) {
  return err.isUnexpected
    ? `\n${err.getErrorMessage("text").toString()}\n`
    : err.message;
}

function makeFileError(aggregatedErrors, earlyErrors) {
  const ClasssOfFileError =
    earlyErrors && earlyErrors.type === "check"
      ? errors.FileProcessingError
      : errors.FileEvaluationError;
  return new ClasssOfFileError({
    message: errors.snippetErrorsToMsg(aggregatedErrors),
    data: { errors: aggregatedErrors }
  });
}

function pick(obj, keys) {
  const ret = {};
  for (const key of keys) {
    ret[key] = obj[key];
  }
  return ret;
}

function validationResultsToErrors(validateResults) {
  const validationErrors = {};

  for (const [index, result] of Object.entries(validateResults)) {
    if (!result.error) continue;
    validationErrors[index] = result.error;
  }

  return validationErrors;
}

class Snippets {
  constructor(snippets) {
    this.evaluated = false;
    this.items = snippets;
    this.itemsErrors = null;
  }

  check() {
    const checkErrors = {};

    for (const [index, snippet] of this.entries()) {
      const previousSnippet = index > 0 ? this.get(index - 1) : {};
      try {
        if (snippetIdentity.canEvaluate(snippet)) {
          if (typeof snippet.flags.freshExpect === "boolean") {
            throw new Error(
              "freshExpect flag has been removed in favour of freshContext"
            );
          }
        } else if (!snippetIdentity.holdsOutput(snippet)) {
          continue;
        } else if (!snippetIdentity.canEvaluate(previousSnippet)) {
          throw new Error(`no matching code block for output snippet`);
        } else if (previousSnippet.flags.hide) {
          debug("hidden code block matched to output snippet");
        }
      } catch (e) {
        checkErrors[index] = new errors.SnippetFailureError({
          data: { original: e }
        });
      }
    }

    return Object.keys(checkErrors).length > 0 ? checkErrors : null;
  }

  entries() {
    return this.items.entries();
  }

  async evaluate(options) {
    if (this.evaluated) {
      throw new Error("the same snippets were evaluated twice");
    }
    options.preamble = options.preamble || "";
    const snippets = this.items;

    // check whether TypeScript support is required
    const hasTsSnippets = snippets.some(
      snippet => snippet.lang === "typescript" && snippet.flags.evaluate
    );
    if (hasTsSnippets) {
      if (options.transpileFn) {
        throw new Error(
          "transpileFn cannot be specified with TypeScript snippets"
        );
      }
      if (!options.tsconfigPath) {
        throw new Error("tsconfig must be specified with TypeScript snippets");
      }
      options.transpileFn = transpileSnippets.createTranspileTypescript(
        options.tsconfigPath
      );
    }

    if (typeof options.transpileFn === "function") {
      if (options.preamble) options.preamble += "\n";
      options.preamble += transpileSnippets(snippets, options);
    }

    // record evaluation
    this.evaluated = true;

    const checkErrors = this.check();
    if (checkErrors) {
      this.itemsErrors = { type: "check", errors: checkErrors };
      return;
    }

    const snippetErrors = await evaluateSnippets(snippets, options);
    // signal an error if any of the snippets failed
    if (Object.keys(snippetErrors).length > 0) {
      this.itemsErrors = { type: "evaluate", errors: snippetErrors };
    }

    if (this.itemsErrors && options.throwOnError !== false) {
      const aggregatedErrors = this.itemsErrors.errors;
      throw makeFileError(aggregatedErrors, this.itemsErrors);
    }
  }

  get(index) {
    return this.items[index];
  }

  getError(index) {
    const itemsErrors = this.itemsErrors || {};
    const errors = itemsErrors.errors || {};
    return errors[index] || null;
  }

  getTests() {
    const tests = [];
    let evaluatedExampleIndex;

    const checkErrors = this.check();
    if (checkErrors) {
      const firstKey = Object.keys(checkErrors)[0];
      const firstError = checkErrors[firstKey];
      throw firstError;
    }

    for (const [index, snippet] of this.entries()) {
      const { flags } = snippet;

      if (snippetIdentity.holdsOutput(snippet)) {
        if (evaluatedExampleIndex === index - 1) {
          tests[tests.length - 1].output = snippet.code;
        }
      } else if (flags.evaluate) {
        evaluatedExampleIndex = index;
        tests.push({
          ...pick(snippet, snippetTestKeys),
          output: null
        });
      }
    }

    return tests;
  }

  validate(options) {
    if (!this.evaluated) {
      throw new Error("cannot validate snippets without evaluation");
    }

    options = options || {};

    const expect = createExpect(options);
    const lastSnippetIndex = this.items.length - 1;
    const validateResults = {};

    for (const [index, snippet] of this.entries()) {
      const validationResult = {
        snippet,
        compare: "none",
        status: "",
        error: null
      };

      if (!snippetIdentity.canEvaluate(snippet)) {
        continue;
      }

      // record the result
      validateResults[index] = validationResult;

      // reference following snippet for comparisons
      const nextSnippet = index < lastSnippetIndex ? this.get(index + 1) : {};

      try {
        const snippetError = this.getError(index);
        if (snippetError) throw snippetError;

        if (snippet.flags.evaluate) {
          if (snippetIdentity.holdsOutput(nextSnippet)) {
            validationResult.compare = "output";
            compareOutput(snippet, nextSnippet, { expect });
          } else {
            validationResult.compare = "nothrow";
            assertNoError(snippet);
          }

          validationResult.status = "pass";
        } else {
          validationResult.status = "pending";
        }
      } catch (e) {
        // eslint-disable-next-line no-ex-assign
        if (e instanceof errors.SnippetFailureError) e = e.data.original;
        validationResult.status = "fail";
        validationResult.error = new errors.SnippetValidationError({
          message: e.message,
          textMessage: errorToPlainText(e),
          htmlMessage: options.format === "html" ? e.htmlMessage : undefined,
          data: { original: e }
        });
      }
    }

    let error;
    const validateErrors = validationResultsToErrors(validateResults);
    if (Object.keys(validateErrors).length > 0) {
      error = makeFileError(validateErrors, this.itemsErrors);
    } else {
      error = null;
    }

    return { error, results: validateResults };
  }

  static checkMarker(marker) {
    return extractSnippets.checkMarker(marker);
  }

  static fromMarkdown(markdown, options) {
    return new Snippets(extractSnippets(markdown, options));
  }
}

module.exports = Snippets;
