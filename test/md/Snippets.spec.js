const expect = require("unexpected");

const Snippets = require("../../lib/md/Snippets");

describe("Snippets", () => {
  describe("#getTests()", () => {
    it("should test block for each javascript/output pair", async () => {
      const snippets = Snippets.fromMarkdown(
        [
          "Asserts deep equality.",
          "",
          "```javascript",
          'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
          "```",
          "",
          "<!-- unexpected-markdown cleanStackTrace:true -->",
          "```output",
          "foo",
          "  at bar (/path/to/file.js:x:y)",
          "  at quux (/path/to/file.js:x:y)",
          "```"
        ].join("\n")
      );

      expect(await snippets.getTests(), "to equal", [
        {
          code:
            'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
          flags: { evaluate: true },
          output:
            "foo\n  at bar (/path/to/file.js:x:y)\n  at quux (/path/to/file.js:x:y)"
        }
      ]);
    });
  });
});
