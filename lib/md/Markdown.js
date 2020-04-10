var Snippets = require("./Snippets");
var cleanStackTrace = require("./cleanStackTrace");
var createExpect = require("./createExpect");
var marked = require("marked-papandreou");

const InspectedConsole = require("../InspectedConsole");

const metadataRegexp = /^---\n((?:\w+: .+\n)+)---\n/m;
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
    this.metadata = this._parseMetadata();
    this.options = options || {};
    this.marker = Snippets.checkMarker(this.options.marker);

    this.baseExpect = createExpect(options);
    this.evalExpect = null;
    this.snippets = null;

    // internals
    this._inspectedConsole = null;
  }

  get inspectedConsole() {
    if (!this._inspectedConsole) {
      this._inspectedConsole = new InspectedConsole(this);
    }

    return this._inspectedConsole;
  }

  _parseMetadata() {
    const matches = metadataRegexp.exec(this.content);
    if (!matches) return {};
    const pairs = matches[1].slice(0, -1).split("\n");
    const metadata = {};
    for (const pair of pairs) {
      const [option, value] = pair.split(": ");
      metadata[option] = value;
    }
    return metadata;
  }

  _prepareGlobals(options) {
    const globals = options.globals || {};
    const fileGlobals = options.fileGlobals || {};

    // attach any other custom globals that have been specified
    for (const [variable, createVariable] of Object.entries(fileGlobals)) {
      globals[variable] = createVariable({ metadata: this.metadata });
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

  async evaluate(options) {
    options = this._prepareOptions(options);
    const globals = this._prepareGlobals(options);
    const evalOpts = { markdown: this, globals, ...options };

    const snippets = this.getSnippets();
    await snippets.evaluate(evalOpts);
  }

  toHtml(options) {
    options = this._prepareOptions(options);
    return marked(this.content, options);
  }

  toText() {
    return this.content;
  }

  async withExamples(onSnippet) {
    const snippets = this.snippets;
    if (!(snippets && snippets.evaluated)) {
      throw new Error("snippets were not evaluated");
    }

    let updatedContent = this.content.slice(0);
    let blockDelta = 0;
    for (const [index, snippet] of snippets.entries()) {
      if (
        snippet.flags.ignore ||
        (snippet.lang === "output" && snippets.get(index - 1).flags.ignore)
      ) {
        continue;
      }

      const blockLength = snippet.indexEnd - snippet.index;
      const blockRendered = onSnippet(snippet, snippets, index);

      if (blockRendered === null) {
        continue;
      }

      updatedContent = spliceString(
        updatedContent,
        snippet.index + blockDelta,
        snippet.indexEnd + blockDelta,
        blockRendered
      );

      blockDelta += blockRendered.length - blockLength;
    }

    return updatedContent;
  }

  async withInlinedExamples() {
    const onSnippet = (snippet, snippets, index) => {
      const { code, lang } = snippet;

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

      if (this.options.format === "inlined") {
        blockRendered = blockRendered.replace(/^<div/, "<pre"); // start of the block
        blockRendered = blockRendered.replace(/\/div>$/, "/pre>"); // end of the block
      }

      return blockRendered;
    };

    const updatedContent = await this.withExamples(onSnippet);
    return new Markdown(updatedContent, this.options);
  }

  async withUpdatedExamples() {
    const onSnippet = (snippet, snippets, index) => {
      const { code, lang, comment } = snippet;

      if (lang === "output") {
        // the presence of the matching previous snippet
        // is gauranteed when we evaluate the snippets
        var example = snippets.get(index - 1);

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

        return `${comment || ""}\`\`\`${lang}\n${output}\n\`\`\``;
      } else if (snippet.includesLegacyFlags) {
        let htmlComments = flagsToHtmlComment(this.marker, snippet.flags);
        if (htmlComments.length > 0) htmlComments += "\n";
        return `${htmlComments}\`\`\`${lang}\n${code}\n\`\`\``;
      } else {
        return null;
      }
    };

    const updatedContent = await this.withExamples(onSnippet);
    return new Markdown(updatedContent, this.options);
  }
}

module.exports = Markdown;
