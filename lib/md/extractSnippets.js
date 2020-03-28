var snippetRegexp = require("./snippetRegexp");

function parseFlags(flagsString) {
  const flags = {};
  for (const flagString of flagsString.split(/,/)) {
    const m = /(\w+)\s*:\s*(\w+)/.exec(flagString.trim());
    flags[m[1]] = m[2] === "true";
  }
  return flags;
}

function parseSnippetInfo(str) {
  const m = /^(\w+)#(\w+:\w+(,\w+:\w+)*)/.exec(str);

  let lang;
  let flags;
  if (m) {
    lang = m[1];
    flags = parseFlags(m[2]);
  } else {
    lang = str;
    flags = {};
  }

  if (lang === "js") {
    lang = "javascript";
  }

  return { lang, flags };
}

module.exports = function(markdown) {
  const htmlCommentRegExp = /^<!--\s*unexpected-markdown\s+([^>]*)-->/gm;

  var snippets = [];

  var m;
  while ((m = snippetRegexp.exec(markdown))) {
    const { lang, flags } = parseSnippetInfo(m[2]);

    const snippetInfo = {};
    snippetInfo.code = m[3];
    snippetInfo.lang = lang;
    snippetInfo.flags = flags;
    snippetInfo.index = m.index;
    snippetInfo.indexEnd = m.index + m[0].length;
    snippetInfo.codeIndex = m.index + m[2].length + 4; // ```\n
    snippetInfo.codeIndexEnd = -1;
    if (snippetInfo.code.length > 0) {
      snippetInfo.codeIndexEnd = snippetInfo.indexEnd - 4; // char before ```
    } else {
      snippetInfo.codeIndexEnd = snippetInfo.codeIndex;
    }

    if (m[1]) {
      snippetInfo.index += m[1].length;
      snippetInfo.codeIndex += m[1].length;

      const matchHtmlComments = m[1].match(htmlCommentRegExp);
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

    snippets.push(snippetInfo);
  }
  return snippets;
};
