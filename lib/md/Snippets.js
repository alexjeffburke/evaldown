var extractSnippets = require("./extractSnippets");
var evaluateSnippets = require("./evaluateSnippets");

class Snippets {
  constructor(snippets) {
    this.items = snippets;
  }

  get snippets() {
    this.check();
    return this.items;
  }

  check() {
    for (const [index, snippet] of this.items.entries()) {
      const previousSnippet = index > 0 ? this.get(index - 1) : {};
      if (snippet.lang === "output" && previousSnippet.lang !== "javascript") {
        throw new Error(
          `No matching javascript block for output:\n${snippet.code}`
        );
      }
    }
  }

  entries() {
    return this.items.entries();
  }

  async evaluate(options) {
    await evaluateSnippets(this.snippets, options);
    return this;
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

  static fromMarkdown(markdown) {
    return new Snippets(extractSnippets(markdown));
  }
}

module.exports = Snippets;
