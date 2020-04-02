var Snippets = require("./Snippets");
var cleanStackTrace = require("./cleanStackTrace");
var createExpect = require("./createExpect");
var snippetRegexp = require("./snippetRegexp");
var marked = require("marked-papandreou");

var styleRegex = /style=".*?"/;

function flagsToHtmlComment(marker, flags) {
  const parts = [];
  for (const [key, value] of Object.entries(flags)) {
    if (key === "evaluate" && value) continue;
    parts.push(`${key}:${value}`);
  }
  return `<-- ${marker} ${parts.join(", ")}${parts.length > 0 ? " " : ""}-->`;
}

function spliceString(str, start, end, ...insertions) {
  const prefix = str.slice(0, start);
  const suffix = str.slice(end);

  let output = prefix;
  for (const insertion of insertions) {
    output += insertion;
  }
  output += suffix;

  return output;
}

class Markdown {
  constructor(content, options) {
    this.content = content;
    this.options = options || {};
    this.marker = Snippets.checkMarker(this.options.marker);

    this.baseExpect = createExpect(options);
    this.evalExpect = null;
    this.snippets = null;
  }

  _prepareGlobals(options) {
    const globals = options.globals || {};
    const customGlobals = options.customGlobals || {};

    // attach any other custom globals that have been specified
    for (const [variable, createVariable] of Object.entries(customGlobals)) {
      globals[variable] = createVariable();
    }

    // check for and record a custom inspection capable expect
    if (globals.expect && globals.expect._topLevelExpect) {
      this.evalExpect = globals.expect;
    }

    return globals;
  }

  _prepareOptions(options) {
    return { ...this.options, ...options };
  }

  getExpect() {
    return this.evalExpect || this.baseExpect;
  }

  getSnippets() {
    if (!this.snippets) {
      this.snippets = Snippets.fromMarkdown(this.content, {
        marker: this.marker
      });
    }

    return this.snippets;
  }

  async evaluateSnippets(options) {
    const globals = this._prepareGlobals(options);
    const evalOpts = { baseExpect: this.baseExpect, globals, ...options };

    const snippets = this.getSnippets();
    await snippets.evaluate(evalOpts);
    return snippets;
  }

  toHtml(options) {
    options = this._prepareOptions(options);
    return marked(this.content, options);
  }

  toString() {
    return this.content;
  }

  async withInlinedExamples(options) {
    options = this._prepareOptions(options);
    const snippets = await this.evaluateSnippets(options);

    let updatedContent = this.content.slice(0);
    let blockDelta = 0;
    for (const [index, snippet] of snippets.entries()) {
      const { code, lang } = snippet;
      const blockLength = snippet.indexEnd - snippet.index;

      let blockRendered;
      if (lang === "output") {
        // the presence of the matching previous snippet
        // is gauranteed when we evaluate the snippets
        const previousSnippet = snippets.get(index - 1);
        const previousSnippetOutput = previousSnippet.output;

        if (previousSnippetOutput && previousSnippetOutput.kind !== "") {
          blockRendered = previousSnippetOutput.html.replace(
            styleRegex,
            'class="output"'
          );
        } else {
          blockRendered = '<div class="output">&nbsp;</div>';
        }
      } else {
        blockRendered = this.getExpect()
          .output.clone("html")
          .code(code, lang)
          .toString()
          .replace(styleRegex, `class="code lang-${lang}"`);
      }

      updatedContent = spliceString(
        updatedContent,
        snippet.index + blockDelta,
        snippet.indexEnd + blockDelta,
        blockRendered
      );

      blockDelta += blockRendered.length - blockLength;
    }

    return new Markdown(updatedContent, this.options);
  }

  async withUpdatedExamples(options) {
    options = this._prepareOptions(options);
    const snippets = await this.evaluateSnippets(options);

    let index = 0;
    const updatedContent = this.content.replace(
      snippetRegexp,
      (block, htmlComments, lang) => {
        var currentIndex = index;
        index += 1;
        var snippet = snippets.get(currentIndex);
        if (snippet.lang === "output") {
          // the presence of the matching previous snippet
          // is gauranteed when we evaluate the snippets
          var example = snippets.get(currentIndex - 1);

          var output = "";
          if (example.output) {
            output = example.output.text;
            if (
              example.output.kind === "error" &&
              snippet.flags.cleanStackTrace
            ) {
              output = cleanStackTrace(output);
            }
          }

          return `${htmlComments || ""}\`\`\`${lang}\n${output}\n\`\`\``;
        } else if (snippet.includesLegacyFlags) {
          const langFlagsIndex = lang ? lang.indexOf("#") : -1;
          let htmlComments;
          if (langFlagsIndex > -1) {
            lang = lang.slice(0, langFlagsIndex);
            htmlComments = flagsToHtmlComment(
              "unexpected-markdown",
              snippet.flags
            );
            htmlComments += "\n";
          }
          return `${htmlComments || ""}\`\`\`${lang}\n${snippet.code}\n\`\`\``;
        } else {
          return block;
        }
      }
    );

    return new Markdown(updatedContent, this.options);
  }
}

module.exports = Markdown;
