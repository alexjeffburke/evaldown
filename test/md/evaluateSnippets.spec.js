const expect = require("unexpected")
  .clone()
  .use(require("unexpected-snapshot"));
const expectNoSnapshot = require("unexpected");

const errors = require("../../lib/errors");
const evaluateSnippets = require("../../lib/md/evaluateSnippets");

function createFakeMarkdown() {
  return {
    getExpect() {
      return expect;
    }
  };
}

describe("evaluateSnippets", () => {
  it("should evaluate javascript snippets", async () => {
    const snippets = [
      {
        lang: "javascript",
        flags: { evaluate: true },
        index: 24,
        code:
          'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")'
      },
      {
        lang: "output",
        flags: { cleanStackTrace: true, evaluate: true },
        index: 198,
        code:
          "foo\n  at bar (/path/to/file.js:x:y)\n  at quux (/path/to/file.js:x:y)"
      }
    ];

    await evaluateSnippets(snippets, {
      markdown: createFakeMarkdown()
    });

    expect(snippets[0].output, "to satisfy", {
      html:
        '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">foo</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;bar&nbsp;(/somewhere.js:1:2)</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;quux&nbsp;(/blah.js:3:4)</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;baz&nbsp;(/yadda.js:5:6)</span></div></div>',
      text:
        "foo\n  at bar (/somewhere.js:1:2)\n  at quux (/blah.js:3:4)\n  at baz (/yadda.js:5:6)"
    });
  });

  describe("with an aync snippet", () => {
    it("should evaluate javascript snippets", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { async: true, evaluate: true },
          index: 40,
          code: "return Promise.reject(new Error('boom'));"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown()
      });

      expect(snippets[0].output, "to satisfy", {
        html:
          '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">boom</span></div></div>',
        text: "boom"
      });
    });

    it("should record an error string if missing a return", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { async: true, evaluate: true },
          index: 40,
          code: "Promise.resolve();"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown()
      });

      expect(snippets[0].output, "to satisfy", {
        html:
          '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">Async&nbsp;code&nbsp;block&nbsp;did&nbsp;not&nbsp;return&nbsp;a&nbsp;promise&nbsp;or&nbsp;throw</span></div><div><span style="color: red; font-weight: bold">Promise.resolve();</span></div></div>',
        text:
          "Async code block did not return a promise or throw\nPromise.resolve();"
      });
    });
  });

  describe("with a customised expect", () => {
    const clonedExpect = expectNoSnapshot.clone().use(expect => {
      expect = expect.child();
      expect.addStyle("fancyQuotes", function(str) {
        this.red(">>")
          .text(str)
          .red("<<");
      });

      expect.exportAssertion("<any> to foo", (expect, subject) => {
        expect.subjectOutput = function() {
          // Used to fail with TypeError: this.fancyQuotes is not a function
          this.fancyQuotes(subject);
        };
        expect(subject, "to equal", "foo");
      });
    });

    it("should clone from the right expect when rendering for output capture", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          index: 24,
          code:
            "try  { expect('bar', 'to foo'); } catch (e) { return { message: e.getErrorMessage('text').toString() }; }"
        },
        {
          lang: "output",
          flags: { cleanStackTrace: true, evaluate: true },
          index: 198,
          code: "expected >>bar<< foo"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        capture: "return",
        globals: {
          expect: clonedExpect
        }
      });

      expect(snippets[0].output, "to satisfy", {
        html:
          '<div style="font-family: monospace; white-space: nowrap"><div>{&nbsp;<span style="color: #555">message</span>:&nbsp;<span style="color: #df5000">\'expected&nbsp;&gt;&gt;bar&lt;&lt;&nbsp;to&nbsp;foo\\n\\n-bar\\n+foo\'</span>&nbsp;}</div></div>',
        text: "{ message: 'expected >>bar<< to foo\\n\\n-bar\\n+foo' }"
      });
    });

    it("should clone the output from the right expect for error capture", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          index: 24,
          code: "expect('bar', 'to foo');"
        },
        {
          lang: "output",
          flags: { cleanStackTrace: true, evaluate: true },
          index: 198,
          code: "expected >>bar<< foo"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        globals: {
          expect: clonedExpect
        }
      });

      expect(snippets[0].output, "to satisfy", {
        html:
          '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">expected</span>&nbsp;<span style="color: red">&gt;&gt;</span>bar<span style="color: red">&lt;&lt;</span>&nbsp;<span style="color: red; font-weight: bold">to&nbsp;foo</span></div><div>&nbsp;</div><div><span style="background-color: red; color: white">bar</span></div><div><span style="background-color: green; color: white">foo</span></div></div>',
        text: "expected >>bar<< to foo\n\n-bar\n+foo"
      });
    });
  });

  describe("with an error during evaluation", () => {
    it("should reject evaluation on a reference error", () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          code: "expect('f00', 'to equal', 'foo')"
        },
        {
          lang: "output"
        }
      ];

      return expect(
        () => evaluateSnippets(snippets, { markdown: createFakeMarkdown() }),
        "to be rejected with",
        expect
          .it("to be an", errors.FileEvaluationError)
          .and("to have message", "")
          .and("to satisfy", {
            data: {
              errors: {
                0: expect
                  .it("to be an", errors.SnippetEvaluationError)
                  .and("to have message", "expect is not defined")
              }
            }
          })
      );
    });
  });

  describe("with preamble", () => {
    it("should evaluate javascript snippets", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true, return: true },
          index: 40,
          // eslint-disable-next-line no-template-curly-in-string
          code: "return `${foo()}bar`;"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        preamble: "function foo() { return 'foo'; }"
      });

      expect(snippets[0].output, "to satisfy", {
        text: "'foobar'"
      });
    });
  });

  describe("with transpilation", () => {
    const testSnippet = {
      lang: "javascript",
      flags: { evaluate: true },
      /* LEFT COMMENTED TO SHOW WHAT WAS TRANSPILED
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
      */
      transpiled: expect.unindent`
        var Greeter = function Greeter(name) {
          this.name = name;
        };

        Greeter.prototype.greet = function greet () {
          return 'Greetings, ' + this.name;
        };

        return new Greeter('foo').greet();
      `
    };

    it("should evaluate the transpiled code", async () => {
      const snippets = [{ ...testSnippet }];
      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        capture: "return"
      });

      expect(snippets[0].output, "to satisfy", { kind: "result" });
    });
  });
});
