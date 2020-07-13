const canEvaluate = require("./canEvaluate");
const errors = require("../errors");
const extractSnippets = require("./extractSnippets");
const evaluateSnippets = require("./evaluateSnippets");
const transpileSnippets = require("./transpileSnippets");

const snippetTestKeys = ["code", "lang", "flags", "output"];

function compareOutput(snippet, nextSnippet) {
  const { output } = snippet;
  const { code: expectedOutput = "" } = nextSnippet;

  if (output.kind === "error" && nextSnippet.lang !== "output") {
    throw new Error("snippet evaluation resulted in an error");
  }

  const hasOutput = output && output.text;
  if (hasOutput) {
    if (nextSnippet.lang !== "output") {
      return;
    }
    if (output.text !== expectedOutput) {
      throw new Error("snippet did not generate expected output");
    }
  } else if (expectedOutput) {
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
        checkErrors[index] = new errors.SnippetProcessingError({
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
    const validateErrors = {};

    for (const [index, snippet] of this.entries()) {
      const nextSnippet = index < lastSnippetIndex ? this.get(index + 1) : {};

      try {
        if (canEvaluate(snippet) && snippet.flags.evaluate) {
          if (!snippet.output) {
            continue;
          }

          compareOutput(snippet, nextSnippet);
        }
      } catch (e) {
        validateErrors[index] = new errors.SnippetProcessingError({
          message: e.message,
          data: { original: e }
        });
      }
    }

    return Object.keys(validateErrors).length > 0 ? validateErrors : null;
  }

  validateSnippets() {
    const validateErrors = this.validate();
    if (validateErrors) {
      throw new errors.FileProcessingError({
        message: errors.snippetErrorsToMsg(validateErrors),
        data: { errors: validateErrors }
      });
    }
  }

  static checkMarker(marker) {
    return extractSnippets.checkMarker(marker);
  }

  static fromMarkdown(markdown, options) {
    return new Snippets(extractSnippets(markdown, options));
  }
}

module.exports = Snippets;
