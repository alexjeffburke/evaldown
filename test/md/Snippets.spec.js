const buble = require("buble");
const expect = require("unexpected");

const errors = require("../../lib/errors");
const Snippets = require("../../lib/md/Snippets");

function createFakeMarkdown() {
  return {
    getExpect() {
      return expect;
    },
    setExpect() {}
  };
}

const testSnippets = [
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
    index: 148,
    code:
      "foo\n  at bar (/path/to/file.js:x:y)\n  at quux (/path/to/file.js:x:y)"
  }
];

describe("Snippets", () => {
  it("should allow retrieving a snippet by index", () => {
    const snippets = new Snippets(testSnippets);

    expect(snippets.get(1), "to equal", testSnippets[1]);
  });

  describe("#check()", () => {
    it("should record and wrap an output block was not preceded by a source block", async () => {
      const snippets = new Snippets([
        {
          code: "I've been orphaned!",
          lang: "output"
        }
      ]);

      const result = snippets.check();

      expect(result, "to satisfy", {
        0: expect
          .it("to be an", errors.SnippetProcessingError)
          .and("to have message", "no matching code block for output snippet")
          .and("to satisfy", {
            data: {
              original: new Error("no matching code block for output snippet")
            }
          })
      });
    });

    it("should record and wrap an output block was preceded by a hidden block", async () => {
      const snippets = new Snippets([
        {
          code: "You can't see me",
          lang: "javascript",
          flags: {
            evaluate: true,
            hide: true
          }
        },
        {
          code: "I'm not supposed to be here!",
          lang: "output"
        }
      ]);

      const result = snippets.check();

      expect(result, "to satisfy", {
        1: expect
          .it("to be an", errors.SnippetProcessingError)
          .and(
            "to have message",
            "cannot match hidden code block to output snippet"
          )
          .and("to satisfy", {
            data: {
              original: new Error(
                "cannot match hidden code block to output snippet"
              )
            }
          })
      });
    });

    it("should record and wrap a use of the freshExpect flag", async () => {
      const snippets = new Snippets([
        {
          code: "const foo = 'foo';",
          lang: "javascript",
          flags: {
            evaluate: true,
            freshExpect: true
          }
        }
      ]);

      const result = snippets.check();

      expect(result, "to satisfy", {
        0: expect
          .it("to be an", errors.SnippetProcessingError)
          .and(
            "to have message",
            "freshExpect flag has been removed in favour of freshContext"
          )
          .and("to satisfy", {
            data: { original: expect.it("to be an", Error) }
          })
      });
    });
  });

  describe("#evaluate()", () => {
    it("should reject if called twice", async () => {
      const snippets = new Snippets([]);
      await snippets.evaluate({
        markdown: createFakeMarkdown(),
        pwdPath: __dirname
      });

      await expect(
        () => snippets.evaluate(),
        "to be rejected with",
        "the same snippets were evaluated twice"
      );
    });

    it("should reject and wrap any errors returned by check", async () => {
      const snippets = new Snippets([]);
      const expectedSnippetErrors = {
        0: new errors.SnippetProcessingError({
          message: "some error",
          data: {
            original: new Error("some error")
          }
        })
      };
      snippets.check = () => expectedSnippetErrors;

      await expect(
        () =>
          snippets.evaluate({
            markdown: createFakeMarkdown(),
            pwdPath: __dirname
          }),
        "to be rejected with",
        expect.it("to be an", errors.FileEvaluationError).and("to satisfy", {
          message: errors.snippetErrorsToMsg(expectedSnippetErrors),
          data: {
            errors: expectedSnippetErrors
          }
        })
      );
    });

    describe("when transpiled", () => {
      it("should transpile and evaluate the code (per-snippet capture)", async () => {
        const transpileFn = content => buble.transform(content).code;
        const snippets = new Snippets([
          {
            lang: "javascript",
            flags: { evaluate: true, return: true },
            code: `
              class SomeClass {
                constructor() {
                  this.foo = true
                }
              }

              return new SomeClass().foo ? 'yay' : 'nay'
            `
          }
        ]);

        await snippets.evaluate({
          markdown: createFakeMarkdown(),
          pwdPath: __dirname,
          capture: "console",
          transpileFn
        });

        expect(snippets.items[0], "to satisfy", {
          transpiled: expect.it("to start with", "(function () {"),
          output: {
            kind: "result",
            text: "'yay'"
          }
        });
      });

      it("should transpile and evaluate the code (global capture)", async () => {
        const transpileFn = content => buble.transform(content).code;
        const snippets = new Snippets([
          {
            lang: "javascript",
            flags: { evaluate: true },
            code: `
              class SomeClass {
                constructor() {
                  this.foo = true
                }
              }

              return new SomeClass().foo ? 'yay' : 'nay'
            `
          }
        ]);

        await snippets.evaluate({
          markdown: createFakeMarkdown(),
          pwdPath: __dirname,
          capture: "return",
          transpileFn
        });

        expect(snippets.items[0], "to satisfy", {
          transpiled: expect.it("to start with", "(function () {"),
          output: {
            kind: "result",
            text: "'yay'"
          }
        });
      });

      it("should preserve a pre-existing preamble", async () => {
        const transpileFn = content => buble.transform(content).code;
        const snippets = new Snippets([
          {
            lang: "javascript",
            flags: { evaluate: true },
            code: `
                class SomeClass {
                  constructor() {
                    this.foo = fileGlobalFunction()
                  }
                }

                return new SomeClass().foo
              `
          }
        ]);

        await snippets.evaluate({
          markdown: createFakeMarkdown(),
          pwdPath: __dirname,
          capture: "return",
          preamble: "function fileGlobalFunction() { return 'foo'; }",
          transpileFn
        });

        expect(snippets.items[0], "to satisfy", {
          output: {
            kind: "result",
            text: "'foo'"
          }
        });
      });

      describe("with typescript", () => {
        it("should reject if a conflicting transpileFn was supplied", async function() {
          const snippets = new Snippets([
            {
              lang: "typescript",
              flags: { evaluate: true }
            }
          ]);

          await expect(
            () => snippets.evaluate({ transpileFn: () => {} }),
            "to be rejected with",
            "transpileFn cannot be specified with TypeScript snippets"
          );
        });

        it("should reject if no tsconfig file is specified", async function() {
          const snippets = new Snippets([
            {
              lang: "typescript",
              flags: { evaluate: true }
            }
          ]);

          await expect(
            () => snippets.evaluate({}),
            "to be rejected with",
            "tsconfig must be specified with TypeScript snippets"
          );
        });
      });
    });
  });

  describe("#validate()", () => {
    it("should throw if called before evaluation", () => {
      const snippets = new Snippets([]);

      expect(
        () => {
          snippets.validate();
        },
        "to throw",
        "cannot validate snippets without evaluation"
      );
    });

    it("should validate empty snippets", async () => {
      const snippets = new Snippets([
        {
          lang: "javascript",
          flags: {
            evaluate: true
          },
          output: {
            kind: "",
            html: "",
            text: ""
          }
        },
        {
          lang: "output",
          code: ""
        }
      ]);
      snippets.evaluated = true;

      const result = snippets.validate();

      expect(result, "to be null");
    });

    it("should allow a single snippet without output", async () => {
      const snippets = new Snippets([
        {
          lang: "javascript",
          flags: {
            evaluate: true
          },
          output: {
            kind: "",
            html: "",
            text: ""
          }
        }
      ]);
      snippets.evaluated = true;

      const result = snippets.validate();

      expect(result, "to be null");
    });

    it("should allow multiple snippets without output", async () => {
      const snippets = new Snippets([
        {
          lang: "javascript",
          flags: {
            evaluate: true
          },
          output: {
            kind: "result",
            html: "",
            text: ""
          }
        },
        {
          lang: "javascript",
          code: "not to be confused",
          flags: {
            evaluate: true
          },
          output: {
            kind: "",
            html: "",
            text: ""
          }
        }
      ]);
      snippets.evaluated = true;

      const result = snippets.validate();

      expect(result, "to be null");
    });

    it("should record an evaluation error", async () => {
      const snippets = new Snippets([
        {
          lang: "javascript",
          flags: {
            evaluate: true
          },
          output: {
            kind: "error",
            html: "",
            text: ""
          }
        },
        {
          lang: "javascript",
          code: ""
        }
      ]);
      snippets.evaluated = true;

      const result = snippets.validate();

      expect(result, "to satisfy", {
        0: expect
          .it("to be an", errors.SnippetProcessingError)
          .and("to have message", "snippet evaluation resulted in an error")
          .and("to satisfy", {
            data: {
              original: new Error("snippet evaluation resulted in an error")
            }
          })
      });
    });

    it("should record a snippet never before serialised", async () => {
      const snippets = new Snippets([
        {
          lang: "javascript",
          flags: {
            evaluate: true
          },
          output: {
            kind: "",
            html: "",
            text: "something"
          }
        },
        {
          lang: "output",
          code: ""
        }
      ]);
      snippets.evaluated = true;

      const result = snippets.validate();

      expect(result, "to satisfy", {
        0: expect
          .it("to be an", errors.SnippetProcessingError)
          .and("to have message", "snippet did not generate expected output")
          .and("to satisfy", {
            data: {
              original: new Error("snippet did not generate expected output")
            }
          })
      });
    });

    it("should record a snippet that does not match", async () => {
      const snippets = new Snippets([
        {
          lang: "javascript",
          flags: {
            evaluate: true
          },
          output: {
            kind: "",
            html: "",
            text: "something"
          }
        },
        {
          lang: "output",
          code: "other"
        }
      ]);
      snippets.evaluated = true;

      const result = snippets.validate();

      expect(result, "to satisfy", {
        0: expect
          .it("to be an", errors.SnippetProcessingError)
          .and("to have message", "snippet did not generate expected output")
          .and("to satisfy", {
            data: {
              original: new Error("snippet did not generate expected output")
            }
          })
      });
    });

    it("should record a snippet that produced no output", async () => {
      const snippets = new Snippets([
        {
          lang: "javascript",
          flags: {
            evaluate: true
          },
          output: {
            kind: "",
            html: "",
            text: ""
          }
        },
        {
          lang: "output",
          code: "other"
        }
      ]);
      snippets.evaluated = true;

      const result = snippets.validate();

      expect(result, "to satisfy", {
        0: expect
          .it("to be an", errors.SnippetProcessingError)
          .and("to have message", "snippet did not generate expected output")
          .and("to satisfy", {
            data: {
              original: new Error("snippet did not generate expected output")
            }
          })
      });
    });
  });

  describe("#getTests()", () => {
    it("should combine each code/output pair", () => {
      const snippets = new Snippets(testSnippets);

      expect(snippets.getTests(), "to equal", [
        {
          code:
            'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
          lang: "javascript",
          flags: { evaluate: true },
          output:
            "foo\n  at bar (/path/to/file.js:x:y)\n  at quux (/path/to/file.js:x:y)"
        }
      ]);
    });

    it("should skip code blocks that were not evaluated", () => {
      const localSnippets = testSnippets.map(snippet => ({
        ...snippet,
        flags: { ...snippet.flags, evaluate: false }
      }));
      const snippets = new Snippets(localSnippets);

      expect(snippets.getTests(), "to equal", []);
    });

    it("should leave null output if not yet evaluated", () => {
      const localSnippets = [testSnippets[0]];
      const snippets = new Snippets(localSnippets);

      expect(snippets.getTests(), "to equal", [
        {
          code:
            'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
          lang: "javascript",
          flags: { evaluate: true },
          output: null
        }
      ]);
    });

    it("should throw the first error returned by check", () => {
      const snippets = new Snippets([]);
      snippets.check = () => ({
        0: new errors.SnippetProcessingError({
          message: "some error",
          data: { original: new Error("some error") }
        })
      });

      expect(
        () => {
          snippets.getTests();
        },
        "to throw",
        "some error"
      );
    });

    describe("with typescript", function() {
      it("should combine each code/output pair", () => {
        const localSnippets = testSnippets.map(snippet => ({ ...snippet }));
        localSnippets[0].lang = "typescript";
        const snippets = new Snippets(localSnippets);

        expect(snippets.getTests(), "to exhaustively satisfy", [
          {
            code:
              'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
            lang: "typescript",
            flags: { evaluate: true },
            output:
              "foo\n  at bar (/path/to/file.js:x:y)\n  at quux (/path/to/file.js:x:y)"
          }
        ]);
      });
    });
  });

  describe("Snippets.fromMarkdown()", () => {
    it("should extract the snippets", () => {
      const snippets = Snippets.fromMarkdown(
        [
          "Asserts deep equality.",
          "",
          "```javascript",
          'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
          "```",
          "",
          "<!-- evaldown cleanStackTrace:true -->",
          "```output",
          "foo",
          "  at bar (/path/to/file.js:x:y)",
          "  at quux (/path/to/file.js:x:y)",
          "```"
        ].join("\n"),
        { marker: "evaldown" }
      );

      expect(snippets.items, "to satisfy", testSnippets);
    });
  });
});
