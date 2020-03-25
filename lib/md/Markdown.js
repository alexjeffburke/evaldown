var Snippets = require("./Snippets");
var cleanStackTrace = require("./cleanStackTrace");
var createExpect = require("./createExpect");
var snippetRegexp = require("./snippetRegexp");
var marked = require("marked-papandreou");

var styleRegex = /style=".*?"/;

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
    this.baseExpect = createExpect(options);
    this.evalExpect = null;
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

  async toHtml(options) {
    options = this._prepareOptions(options);
    const snippets = await this.getSnippets(options);

    let content = this.content.slice(0);
    let blockDelta = 0;
    for (const [index, snippet] of snippets.entries()) {
      var previousSnippet = snippets.get(index - 1);

      const { code, lang } = snippet;
      const blockLength = snippet.indexEnd - snippet.index;

      let blockRendered;
      if (lang === "output") {
        if (previousSnippet && previousSnippet.lang === "javascript") {
          if (previousSnippet.htmlErrorMessage) {
            blockRendered = previousSnippet.htmlErrorMessage.replace(
              styleRegex,
              'class="output"'
            );
          } else {
            blockRendered = '<div class="output">&nbsp;</div>';
          }
        } else {
          throw new Error(
            `No matching javascript block for output:\n${snippet.code}`
          );
        }
      } else {
        blockRendered = this.getExpect()
          .output.clone("html")
          .code(code, lang)
          .toString()
          .replace(styleRegex, `class="code lang-${lang}"`);
      }

      content = spliceString(
        content,
        snippet.index + blockDelta,
        snippet.indexEnd + blockDelta,
        blockRendered
      );

      blockDelta += blockRendered.length - blockLength;
    }

    return marked(content, options);
  }

  async getSnippets(options) {
    options = options || {};

    if (this.snippets) {
      return this.snippets;
    } else {
      const globals = this._prepareGlobals(options);
      const evalOpts = { baseExpect: this.baseExpect, globals, ...options };

      return Snippets.fromMarkdown(this.content).evaluate(evalOpts);
    }
  }

  async withUpdatedExamples(options) {
    options = this._prepareOptions(options);
    const snippets = await this.getSnippets(options);

    var index = 0;
    var updatedContent = this.content.replace(snippetRegexp, function(
      $0,
      htmlComments,
      lang
    ) {
      var currentIndex = index;
      index += 1;
      var snippet = snippets.get(currentIndex);
      if (snippet.lang === "output") {
        var example = snippets.get(currentIndex - 1);
        var output = "";
        if (example && example.lang === "javascript") {
          if (example.errorMessage) {
            output = example.errorMessage;
            if (snippet.flags.cleanStackTrace) {
              output = cleanStackTrace(output);
            }
          }
        }
        return `${htmlComments || ""}\`\`\`${lang}\n${output}\n\`\`\``;
      } else {
        return $0;
      }
    });

    return new Markdown(updatedContent);
  }

  toString() {
    return this.content;
  }
}

module.exports = Markdown;
