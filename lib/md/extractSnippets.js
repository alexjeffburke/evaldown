const snippetRegexp = require("./snippetRegexp");

function parseFlags(flagsString) {
  const flags = {};
  for (const flagString of flagsString.split(/,/)) {
    const m = /(\w+)\s*:\s*(\w+)/.exec(flagString.trim());
    flags[m[1]] = m[2] === "true";
  }
  return flags;
}

function parseHeader(str) {
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

  const snippets = [];

  let m;
  while ((m = snippetRegexp.exec(markdown))) {
    const [block, comment, header, code] = m;

    const { lang, flags: langFlags } = parseHeader(header);

    const baseIndex = m.index;
    let index = baseIndex;
    let offset = header.length;
    let flags = langFlags;

    if (comment) {
      index += comment.length;
      offset += comment.length;

      const matchHtmlComments = comment.match(htmlCommentRegExp);
      if (matchHtmlComments) {
        for (const htmlCommentValue of Array.from(matchHtmlComments)) {
          flags = Object.assign(parseFlags(htmlCommentValue), flags);
        }
      }
    }

    if (typeof flags.evaluate !== "boolean") {
      flags.evaluate = true;
    }

    const snippet = {
      code: code,
      lang: lang,
      flags: flags,
      index: index,
      indexEnd: baseIndex + block.length,
      codeIndex: baseIndex + offset + 4, // ```\n
      codeIndexEnd: -1
    };
    if (code.length > 0) {
      snippet.codeIndexEnd = snippet.indexEnd - 4; // char before ```
    } else {
      snippet.codeIndexEnd = snippet.codeIndex;
    }
    snippets.push(snippet);
  }

  return snippets;
};
