var extractSnippets = require('./extractSnippets');
var evaluateSnippets = require('./evaluateSnippets');
var passError = require('passerror');

function Snippets(snippets) {
    this.items = snippets;
}

Snippets.prototype.get = function (index) {
    return this.items[index];
};

Snippets.prototype.getTests = function () {
    var tests = [];
    var evaluatedExampleIndex;
    this.items.forEach(function (snippet, index) {
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
};


module.exports = {
    fromMarkdown: function (markdown, options, cb) {
        var snippets = extractSnippets(markdown);
        evaluateSnippets(snippets, options, passError(cb, function () {
            cb(null, new Snippets(snippets));
        }));
    }
};
