var snippetRegexp = require("./snippetRegexp");

function parseFlags(flagsString) {
  var flags = {};
  for (const flagString of flagsString.split(/,/)) {
    var m = /(\w+)\s*:\s*(\w+)/.exec(flagString.trim());
    flags[m[1]] = m[2] === "true";
  }
  return flags;
}

function parseSnippetInfo(lang) {
  var m = /^(\w+)#(\w+:\w+(,\w+:\w+)*)/.exec(lang);
  var flags = {};
  if (m) {
    lang = m[1];
    Object.assign(flags, parseFlags(m[2]));
  }

  if (lang === "js") {
    lang = "javascript";
  }

  return {
    lang: lang,
    flags: flags
  };
}

module.exports = function(markdown) {
  var snippets = [];
  var m;
  while ((m = snippetRegexp.exec(markdown))) {
    var snippetInfo = parseSnippetInfo(m[2]);
    snippetInfo.index = m.index;
    if (m[1]) {
      snippetInfo.index += m[1].length;

      const matchHtmlComments = m[1].match(
        /^<!--\s*unexpected-markdown\s+([^>]*)-->/gm
      );
      if (matchHtmlComments) {
        for (const htmlCommentValue of Array.from(matchHtmlComments)) {
          snippetInfo.flags = Object.assign(
            parseFlags(htmlCommentValue),
            snippetInfo.flags
          );
        }
      }
    }
    if (typeof snippetInfo.flags.evaluate !== "boolean") {
      snippetInfo.flags.evaluate = true;
    }
    snippetInfo.code = m[3];
    snippets.push(snippetInfo);
  }
  return snippets;
};
