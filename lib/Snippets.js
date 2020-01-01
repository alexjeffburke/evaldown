var extractSnippets = require('./extractSnippets');
var evaluateSnippets = require('./evaluateSnippets');

class Snippets {
  constructor(snippets) {
    this.items = snippets;
  }

  evaluate(options, cb) {
    return evaluateSnippets(this.items, options).then(() => this);
  }

  get(index) {
    return this.items[index];
  }

  getTests() {
    var tests = [];
    var evaluatedExampleIndex;
    this.items.forEach(function(snippet, index) {
      var flags = snippet.flags;

      switch (snippet.lang) {
        case 'javascript':
          if (flags.evaluate) {
            evaluatedExampleIndex = index;
            tests.push({
              code: snippet.code,
              flags: flags
            });
          }
          break;
        case 'output':
          if (evaluatedExampleIndex === index - 1) {
            tests[tests.length - 1].output = snippet.code;
          }
          break;
      }
    });

    return tests;
  }
}

module.exports = {
  fromMarkdown: function(markdown) {
    return new Snippets(extractSnippets(markdown));
  }
};
