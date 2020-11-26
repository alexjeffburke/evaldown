const expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
const expectNoSnapshot = require("unexpected");
const sinon = require("sinon");

const errors = require("../../lib/errors");
const evaluateSnippets = require("../../lib/md/evaluateSnippets");

function createFakeMarkdown() {
  let _expect = null;

  return {
    getExpect() {
      return _expect || expect;
    },
    setExpect(value) {
      _expect = value;
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
      markdown: createFakeMarkdown(),
      pwdPath: __dirname
    });

    expect(snippets[0].output, "to satisfy", {
      html:
        '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">foo</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;bar&nbsp;(/somewhere.js:1:2)</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;quux&nbsp;(/blah.js:3:4)</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;baz&nbsp;(/yadda.js:5:6)</span></div></div>',
      text:
        "foo\n  at bar (/somewhere.js:1:2)\n  at quux (/blah.js:3:4)\n  at baz (/yadda.js:5:6)"
    });
  });

  describe("with result capture", () => {
    it("should evaluate snippets with a promise rejection", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          index: 40,
          code: "return Promise.reject(new Error('boom'));"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname,
        capture: "return"
      });

      expect(snippets[0].output, "to satisfy", {
        html:
          '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">boom</span></div></div>',
        text: "boom"
      });
    });
  });

  describe("with async flag", () => {
    it("should evaluate snippets that contain await", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { async: true, evaluate: true },
          index: 40,
          // eslint-disable-next-line no-template-curly-in-string
          code: "return `${await Promise.resolve('foo')}bar`"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      expect(snippets[0].output, "to satisfy", {
        html:
          '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: #df5000">\'foobar\'</span></div></div>',
        text: "'foobar'"
      });
    });
  });

  describe("with file globals", () => {
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
        pwdPath: __dirname,
        capture: "return",
        fileGlobals: {
          expect: () => clonedExpect
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
        pwdPath: __dirname,
        fileGlobals: {
          expect: () => clonedExpect
        }
      });

      expect(snippets[0].output, "to satisfy", {
        html:
          '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">expected</span>&nbsp;<span style="color: red">&gt;&gt;</span>bar<span style="color: red">&lt;&lt;</span>&nbsp;<span style="color: red; font-weight: bold">to&nbsp;foo</span></div><div>&nbsp;</div><div><span style="background-color: red; color: white">bar</span></div><div><span style="background-color: green; color: white">foo</span></div></div>',
        text: "expected >>bar<< to foo\n\n-bar\n+foo"
      });
    });

    it("should make the file options available to file globals", async () => {
      const createSomeGlobal = sinon
        .stub()
        .returns(() => ({ foo: true, bar: 1 }));
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          index: 24,
          code: "someGlobal()"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname,
        capture: "return",
        fileGlobals: {
          someGlobal: createSomeGlobal
        },
        fileMetadata: {
          template: "default.ejs",
          theme: "dark",
          title: "Unexpected",
          repository: "https://github.com/unexpectedjs/unexpected"
        }
      });

      expect(createSomeGlobal, "to have a call satisfying", [
        {
          metadata: {
            template: "default.ejs",
            theme: "dark",
            title: "Unexpected",
            repository: "https://github.com/unexpectedjs/unexpected"
          }
        }
      ]);
    });
  });

  describe("with errors during evaluation", () => {
    it("should record and wrap an invalid code error", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          code: "class Foo {}\n<Foobar />"
        }
      ];

      const result = await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      expect(result, "to satisfy", {
        0: expect.it("to be an", errors.SnippetFailureError).and("to satisfy", {
          data: {
            original: new errors.InvalidCodeError("unable to parse code")
          }
        })
      });
    });

    it("should record and wrap a reference error", async () => {
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

      const result = await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      expect(result, "to satisfy", {
        0: expect.it("to be an", errors.SnippetFailureError).and("to satisfy", {
          data: { original: new ReferenceError("expect is not defined") }
        })
      });
    });

    it("should serialise a thrown undefined", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          code: "throw undefined;"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      expect(snippets[0].output, "to satisfy", {
        kind: "error",
        text: "rejection or thrown exception without value"
      });
    });

    it("should serialise a thrown object", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          code: "throw { error: true };"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      expect(snippets[0].output, "to satisfy", {
        kind: "error",
        text: "rejection or thrown exception with value: { error: true }"
      });
    });

    it("should serialise a thrown string (empty)", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          code: "throw '';"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      expect(snippets[0].output, "to satisfy", {
        kind: "error",
        text: "rejection or thrown exception with string value: <empty>"
      });
    });

    it("should serialise a thrown string (non-empty)", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          code: "throw 'something';"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      expect(snippets[0].output, "to satisfy", {
        kind: "error",
        text: "rejection or thrown exception with string value: something"
      });
    });

    it("should serialise error output at a consistent width", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          code: `expect({ foobar: 'foobar', goobar: 'goobar', hoobar: 'hoobar', alice: true, bob: false }, 'to equal', {})`
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname,
        fileGlobals: {
          expect: () => expect
        }
      });

      expect(snippets[0].output, "to satisfy", {
        text: expect.it(str =>
          expect(
            str,
            "to equal snapshot",
            expect.unindent`
              expected
              {
                foobar: 'foobar',
                goobar: 'goobar',
                hoobar: 'hoobar',
                alice: true,
                bob: false
              }
              to equal {}

              {
                foobar: 'foobar', // should be removed
                goobar: 'goobar', // should be removed
                hoobar: 'hoobar', // should be removed
                alice: true, // should be removed
                bob: false // should be removed
              }
            `
          )
        )
      });
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
        pwdPath: __dirname,
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
        (function () {
          var Greeter = function Greeter(name) {
            this.name = name;
          };

          Greeter.prototype.greet = function greet () {
            return 'Greetings, ' + this.name;
          };

          return new Greeter('foo').greet();
        })();
      `
    };

    it("should evaluate the transpiled code", async () => {
      const snippets = [{ ...testSnippet }];
      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname,
        capture: "return"
      });

      expect(snippets[0].output, "to satisfy", { kind: "result" });
    });

    it("should rewrite the transpiled code", async () => {
      const snippets = [
        {
          lang: "javascript",
          flags: { evaluate: true },
          transpiled: "(function () {var foo = true;})();"
        },
        {
          lang: "javascript",
          flags: { evaluate: true },
          code:
            "(function () {if (typeof foo !== 'boolean') throw new Error('boo');})();"
        }
      ];

      await evaluateSnippets(snippets, {
        markdown: createFakeMarkdown(),
        pwdPath: __dirname,
        capture: "return"
      });

      // check the var defined by the transpiled snippet remained available
      expect(snippets[1].output, "to satisfy", { kind: "result" });
    });
  });

  describe("prepareCode()", () => {
    it("should handle a trailing comment", () => {
      const code = evaluateSnippets.prepareCode(
        {
          code: "const foo = 'foo'; // this is rather fooed"
        },
        {}
      );

      expect(
        code,
        "to equal snapshot",
        expect.unindent`
        (function () {
        const foo = 'foo'; // this is rather fooed
        })();
      `
      );
    });

    it("should handle a trailing comment (async)", () => {
      const code = evaluateSnippets.prepareCode(
        {
          code: "const foo = 'foo'; // this is rather fooed"
        },
        { async: true }
      );

      expect(
        code,
        "to equal snapshot",
        expect.unindent`
        (async function () {
        const foo = 'foo'; // this is rather fooed
        })();
      `
      );
    });
  });
});
