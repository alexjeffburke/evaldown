var Snippets = require("./Snippets");
var cleanStackTrace = require("./cleanStackTrace");
var createExpect = require("./createExpect");
var snippetRegexp = require("./snippetRegexp");
var marked = require("marked-papandreou");

var styleRegex = /style=".*?"/;

class Markdown {
  constructor(content) {
    this.content = content;
  }

  async toHtml(options) {
    var content = this.content;
    var expect = createExpect(options);

    const snippets = await this.getSnippets(options);

    var index = 0;
    var renderer = new marked.Renderer();
    renderer.code = function(code) {
      var snippet = snippets.get(index);
      var previousSnippet = snippets.get(index - 1);
      index += 1;
      var lang = snippet.lang;
      if (lang === "output") {
        if (previousSnippet && previousSnippet.lang === "javascript") {
          if (previousSnippet.htmlErrorMessage) {
            return previousSnippet.htmlErrorMessage.replace(
              styleRegex,
              'class="output"'
            );
          }

          return '<div class="output"></div>';
        } else {
          throw new Error(
            `No matching javascript block for output:\n${snippet.code}`
          );
        }
      }

      return expect.output
        .clone("html")
        .code(code, lang)
        .toString()
        .replace(styleRegex, `class="code ${this.options.langPrefix}${lang}"`);
    };

    return marked(content, { renderer: renderer, ...options });
  }

  async getSnippets(options) {
    if (this.snippets) {
      return this.snippets;
    } else {
      return Snippets.fromMarkdown(this.content).evaluate(options);
    }
  }

  async withUpdatedExamples(options) {
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
