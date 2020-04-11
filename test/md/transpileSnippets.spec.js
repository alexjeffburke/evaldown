const buble = require("buble");
const expect = require("unexpected")
  .clone()
  .use(require("unexpected-snapshot"));

const transpileSnippets = require("../../lib/md/transpileSnippets");

describe("transpileSnippets", () => {
  const testSnippet = {
    lang: "javascript",
    flags: { evaluate: true },
    code: [
      "class Greeter {",
      "  constructor(name) {",
      "    this.name = name;",
      "  }",
      "",
      "  greet() {",
      "    return 'Greetings, ' + this.name;",
      "  }",
      "}",
      "",
      "return new Greeter('foo').greet();"
    ].join("\n")
  };

  it("should prepare tranpiled versions of snippet code blocks", () => {
    const transpileFn = content => buble.transform(content).code;

    const snippets = [{ ...testSnippet }];
    transpileSnippets(snippets, transpileFn);

    expect(
      snippets[0].transpiled,
      "to equal snapshot",
      expect.unindent`
          var Greeter = function Greeter(name) {
            this.name = name;
          };

          Greeter.prototype.greet = function greet () {
            return 'Greetings, ' + this.name;
          };

          return new Greeter('foo').greet();
        `
    );
  });

  it("should leave the snippet code untouched", () => {
    const transpileFn = content => buble.transform(content).code;

    const snippets = [{ ...testSnippet }];
    transpileSnippets(snippets, transpileFn);
  });

  it("should ignore blocks with evaluate false or for output", () => {
    const transpileFn = content => buble.transform(content).code;

    const snippets = [
      {
        lang: "javascript",
        flags: { evaluate: false },
        code: "<<< blah blah invalid blah blah >>>"
      },
      {
        lang: "output",
        flags: {},
        code: "<<< blah blah invalid blah blah >>>"
      },
      { ...testSnippet }
    ];

    transpileSnippets(snippets, transpileFn);

    expect(snippets[0], "not to have property", "transpiled");
  });
});
