const snippetRegexp = require("./snippetRegexp");

function checkMarker(marker) {
  if (
    !(typeof marker === "string" && /^[a-zA-z]+(-[a-zA-Z]+)*$/.test(marker))
  ) {
    throw new Error(`missing or invalid marker
criteria:
  * a non empty string
  * beginning and ending with a letter
  * separated by hyphen
`);
  }
  return marker;
}

function isObjectEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function parseFlags(flagsString) {
  const flags = {};
  for (const flagString of flagsString.split(/,/)) {
    const m = /(\w+)\s*:\s*(\w+)/.exec(flagString.trim());
    if (m === null) continue;
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
  if (lang === "ts") {
    lang = "typescript";
  }

  return { lang, flags };
}

module.exports = function(markdown, options) {
  options = options || {};

  const marker = checkMarker(options.marker);
  const htmlCommentRegExp = new RegExp(
    `^<!--\\s*${marker}\\s+([^>]*)-->`,
    "gm"
  );

  const snippets = [];

  let m;
  while ((m = snippetRegexp.exec(markdown))) {
    const [block, comment, header, code] = m;

    const { lang, flags: langFlags } = parseHeader(header);

    const baseIndex = m.index;
    let offset = header.length;
    let flags = { ...langFlags };

    if (comment) {
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
      includesLegacyFlags: !isObjectEmpty(langFlags),
      index: baseIndex,
      indexEnd: baseIndex + block.length,
      codeIndex: baseIndex + offset + 4, // ```\n
      codeIndexEnd: -1,
      comment: comment || "",
      output: null
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

module.exports.checkMarker = checkMarker;
