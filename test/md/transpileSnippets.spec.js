const buble = require("buble");
const expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
const sinon = require("sinon");

const transpileSnippets = require("../../lib/md/transpileSnippets");

describe("transpileSnippets", () => {
  afterEach(() => {
    sinon.restore();
  });

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

  it("should handle newline being removed from the start of the preamble", () => {
    const transpileFn = () => {
      return `//---------------------preamble----------------------\nfunction foo() {}`;
    };

    const snippets = [{ ...testSnippet }];
    transpileSnippets(snippets, transpileFn);

    expect(snippets[0], "to satisfy", {
      transpiled: "function foo() {}"
    });
  });

  it("should wrap async snippets for transpilation", () => {
    const transpileFn = sinon
      .stub()
      .named("transpileFn")
      .returnsArg(0);

    const snippets = [
      {
        lang: "javascript",
        code: "Promise.resolve('foo');",
        flags: { evaluate: true, async: true }
      }
    ];
    transpileSnippets(snippets, transpileFn);

    expect(transpileFn, "to have a call satisfying", [
      "\n//---------------------preamble----------------------\n(function () {Promise.resolve('foo');})();"
    ]);
  });

  it("should wrap return snippets for transpilation", () => {
    const transpileFn = sinon
      .stub()
      .named("transpileFn")
      .returnsArg(0);

    const snippets = [
      {
        lang: "javascript",
        code: "return { foo: 'bar' };",
        flags: { evaluate: true, return: true }
      }
    ];
    transpileSnippets(snippets, transpileFn);

    expect(transpileFn, "to have a call satisfying", [
      "\n//---------------------preamble----------------------\n(function () {return { foo: 'bar' };})();"
    ]);
  });
});
