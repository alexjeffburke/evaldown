var canEvaluate = require("./canEvaluate");
var extractSnippets = require("./extractSnippets");
var evaluateSnippets = require("./evaluateSnippets");
var transpileSnippets = require("./transpileSnippets");

class Snippets {
  constructor(snippets) {
    this.evaluated = false;
    this.items = snippets;
  }

  get snippets() {
    this.check();
    return this.items;
  }

  check() {
    for (const [index, snippet] of this.items.entries()) {
      const previousSnippet = index > 0 ? this.get(index - 1) : {};
      if (snippet.lang !== "output") continue;
      if (!canEvaluate(previousSnippet)) {
        throw new Error(`No matching code block for output:\n${snippet.code}`);
      } else if (previousSnippet.flags.hide) {
        throw new Error(
          `Cannot match output block to hidden snippet:\n${previousSnippet.code}`
        );
      }
    }
  }

  entries() {
    return this.items.entries();
  }

  async evaluate(options) {
    if (this.evaluated) {
      throw new Error("the same snippets were evaluated twice");
    }
    options.preamble = options.preamble || "";
    const snippets = this.snippets;

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
    await evaluateSnippets(snippets, options);
    this.evaluated = true;
  }

  get(index) {
    return this.items[index];
  }

  getTests() {
    var tests = [];
    var evaluatedExampleIndex;

    for (const [index, snippet] of this.snippets.entries()) {
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
