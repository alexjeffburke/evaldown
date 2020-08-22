const canEvaluate = require("./canEvaluate");
const cleanStackTrace = require("./cleanStackTrace");
const errors = require("../errors");
const extractSnippets = require("./extractSnippets");
const evaluateSnippets = require("./evaluateSnippets");
const transpileSnippets = require("./transpileSnippets");

const snippetTestKeys = ["code", "lang", "flags", "output"];

function assertNoError(snippet) {
  const { output } = snippet;

  if (output.kind === "error") {
    throw new Error("snippet evaluation resulted in an error");
  }
}

function compareOutput(snippet, nextSnippet) {
  const { output } = snippet;
  const { code: expectedText = "" } = nextSnippet;

  const hasOutput = output && (output.kind || output.text);
  if (hasOutput) {
    let seenText = output.text;

    if (nextSnippet.flags.cleanStackTrace) {
      seenText = cleanStackTrace(seenText);
    }

    if (seenText !== expectedText) {
      throw new Error("snippet did not generate expected output");
    }
  } else if (expectedText) {
    throw new Error("snippet did not generate expected output");
  }
}

function pick(obj, keys) {
  const ret = {};
  for (const key of keys) {
    ret[key] = obj[key];
  }
  return ret;
}

class Snippets {
  constructor(snippets) {
    this.evaluated = false;
    this.items = snippets;
  }

  check() {
    const checkErrors = {};

    for (const [index, snippet] of this.entries()) {
      const previousSnippet = index > 0 ? this.get(index - 1) : {};
      try {
        if (canEvaluate(snippet)) {
          if (typeof snippet.flags.freshExpect === "boolean") {
            throw new Error(
              "freshExpect flag has been removed in favour of freshContext"
            );
          }
        } else if (snippet.lang !== "output") {
          continue;
        } else if (!canEvaluate(previousSnippet)) {
          throw new Error(`no matching code block for output snippet`);
        } else if (previousSnippet.flags.hide) {
          throw new Error(`cannot match hidden code block to output snippet`);
        }
      } catch (e) {
        checkErrors[index] = new errors.SnippetValidationError({
          message: e.message,
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

    let snippetErrors;

    const checkErrors = this.check();
    if (checkErrors) {
      snippetErrors = checkErrors;
    } else {
      snippetErrors = await evaluateSnippets(snippets, options);
    }

    // record evaluation
    this.evaluated = true;

    // signal an error if any of the snippets failed
    if (Object.keys(snippetErrors).length > 0) {
      throw new errors.FileEvaluationError({
        message: errors.snippetErrorsToMsg(snippetErrors),
        data: { errors: snippetErrors }
      });
    }
  }

  get(index) {
    return this.items[index];
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
      const { lang, flags } = snippet;

      if (lang === "output") {
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

  validate() {
    if (!this.evaluated) {
      throw new Error("cannot validate snippets without evaluation");
    }

    const lastSnippetIndex = this.items.length - 1;
    const validateResults = {};

    for (const [index, snippet] of this.entries()) {
      const validationResult = {
        compare: "none",
        status: "",
        error: null
      };

      if (!canEvaluate(snippet)) {
        continue;
      }

      // record the result
      validateResults[index] = validationResult;

      // reference following snippet for comparisons
      const nextSnippet = index < lastSnippetIndex ? this.get(index + 1) : {};

      try {
        if (snippet.flags.evaluate) {
          if (nextSnippet.lang === "output") {
            validationResult.compare = "output";
            compareOutput(snippet, nextSnippet);
          } else {
            validationResult.compare = "nothrow";
            assertNoError(snippet);
          }

          validationResult.status = "pass";
        } else {
          validationResult.status = "pending";
        }
      } catch (e) {
        validationResult.status = "fail";
        validationResult.error = new errors.SnippetValidationError({
          message: e.message,
          data: { original: e }
        });
      }
    }

    let error;
    const validateErrors = Object.values(validateResults)
      .map(result => result.error)
      .filter(Boolean);
    if (validateErrors.length > 0) {
      error = new errors.FileProcessingError({
        message: errors.snippetErrorsToMsg(validateErrors),
        data: { errors: validateErrors }
      });
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
