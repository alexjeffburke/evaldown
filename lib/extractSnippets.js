var snippetRegexp = require('./snippetRegexp');
var extend = require('./extend');

function parseFlags(flagsString) {
    var flags = {};
    flagsString.split(/,/).forEach(function (flagString) {
        var m = /(\w+):(\w+)/.exec(flagString);
        flags[m[1]] = m[2] === 'true';
    });
    return flags;
}

function parseSnippetInfo(lang) {
    var m = /^(\w+)#(\w+:\w+(,\w+:\w+)*)/.exec(lang);
    var flags = { evaluate: true };
    if (m) {
        lang = m[1];
        extend(flags, parseFlags(m[2]));
    }

    if (lang === 'js') {
        lang = 'javascript';
    }

    return {
        lang: lang,
        flags: flags
    };
}

module.exports = function (markdown) {
    var snippets = [];
    var m;
    while ((m = snippetRegexp.exec(markdown))) {
        var snippetInfo = parseSnippetInfo(m[1]);
        snippetInfo.code = m[2];
        snippets.push(snippetInfo);
    }
    return snippets;
};
