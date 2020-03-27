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
    snippetInfo.codeIndex = m.index + m[2].length + 3; // ```
    snippetInfo.codeIndexEnd = snippetInfo.indexEnd - 4; // \n```;

    if (m[1]) {
      snippetInfo.index += m[1].length;
      snippetInfo.codeIndex += snippetInfo.index;

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

    snippets.push(snippetInfo);
  }
  return snippets;
};
