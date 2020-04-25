var canEvaluate = require("./canEvaluate");
var errors = require("../errors");
var extractSnippets = require("./extractSnippets");
var evaluateSnippets = require("./evaluateSnippets");
var transpileSnippets = require("./transpileSnippets");

class Snippets {
  constructor(snippets) {
    this.evaluated = false;
    this.items = snippets;
  }

  check() {
    const checkErrors = {};

    for (const [index, snippet] of this.entries()) {
      const previousSnippet = index > 0 ? this.get(index - 1) : {};
      if (snippet.lang !== "output") continue;
      try {
        if (!canEvaluate(previousSnippet)) {
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
        data: { errors: snippetErrors }
      });
    }
  }

  get(index) {
    return this.items[index];
  }

  getTests() {
    var tests = [];
    var evaluatedExampleIndex;

    const checkErrors = this.check();
    if (checkErrors) {
      const firstKey = Object.keys(checkErrors)[0];
      const firstError = checkErrors[firstKey];
      throw firstError;
    }

    for (const [index, snippet] of this.entries()) {
      var flags = snippet.flags;

      switch (snippet.lang) {
        case "javascript":
          if (flags.evaluate) {
            evaluatedExampleIndex = index;
            tests.push({
              ...snippet,
              output: null
            });
          }
          break;
        case "output":
          if (evaluatedExampleIndex === index - 1) {
            tests[tests.length - 1].output = snippet.code;
          }
          break;
      }
    }

    return tests;
  }

  static checkMarker(marker) {
    return extractSnippets.checkMarker(marker);
  }

  static fromMarkdown(markdown, options) {
    return new Snippets(extractSnippets(markdown, options));
  }
}

module.exports = Snippets;
