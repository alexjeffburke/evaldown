const expect = require("unexpected");

const errors = require("../../lib/errors");
const evaluateSnippets = require("../../lib/md/evaluateSnippets");

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
      globals: {
        expect
      }
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
        globals: {
          expect
        }
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
        globals: {
          expect
        }
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
    const clonedExpect = expect.clone().use(expect => {
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
        captureOutput: true,
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
        () => evaluateSnippets(snippets),
        "to be rejected with",
        expect
          .it("to be an", errors.EvaluationError)
          .and("to have message", "expect is not defined")
      );
    });
  });
});
