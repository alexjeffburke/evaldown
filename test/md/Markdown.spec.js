var expect = require("unexpected");
var Markdown = require("../../lib/md/Markdown");

describe("Markdown", function() {
  var markdown;
  beforeEach(function() {
    markdown = new Markdown(
      [
        "Asserts deep equality.",
        "",
        "```javascript",
        "expect({ a: 'b' }, 'to equal', { a: 1234 });",
        "var now = new Date();",
        "expect(now, 'to equal', now);",
        "expect(now, 'to equal', new Date(now.getTime()));",
        "expect({ now: now }, 'to equal', { now: now });",
        "```",
        "",
        "For a lot of types a failing equality test results in a nice",
        "diff. Below you can see an object diff.",
        "",
        "```javascript",
        "expect({ text: 'foo!' }, 'to equal', { text: 'f00!' });",
        "```",
        "",
        "```output",
        "Missing output",
        "```"
      ].join("\n")
    );
  });

  describe("toHtml", function() {
    it("syntax highlight examples", function() {
      return expect(
        markdown.toHtml(),
        "when fulfilled",
        "to contain",
        '<span style="color: #905">1234</span>'
      );
    });
  });

  describe("withUpdatedExamples", function() {
    it("produces a markdown where the examples has been updated", function() {
      return expect(
        markdown.withUpdatedExamples({}),
        "when fulfilled",
        expect.it(markdown =>
          expect(
            markdown.toString(),
            "to contain",
            [
              "```output",
              "expected { text: 'foo!' } to equal { text: 'f00!' }",
              "",
              "{",
              "  text: 'foo!' // should equal 'f00!'",
              "               //",
              "               // -foo!",
              "               // +f00!",
              "}",
              "```"
            ].join("\n")
          )
        )
      );
    });

    it("should work correctly with async snippets that reject", async () => {
      const markdown = new Markdown(
        [
          "<!-- unexpected-markdown async:true -->",
          "```javascript",
          "return Promise.reject(new Error('boom'));",
          "```",
          "",
          "```output",
          "Missing output",
          "```"
        ].join("\n")
      );

      const updatedMarkdown = await markdown.withUpdatedExamples({});

      expect(
        updatedMarkdown.content,
        "to contain",
        ["```output", "boom", "```"].join("\n")
      );
    });
  });

  it("produces a markdown where the examples has been updated", function() {
    const markdown = new Markdown(
      [
        "Asserts deep equality.",
        "",
        "```javascript",
        'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
        "```",
        "",
        "<!-- unexpected-markdown cleanStackTrace:true -->",
        "```output",
        "Missing output",
        "```"
      ].join("\n")
    );

    return expect(
      markdown.withUpdatedExamples({}),
      "when fulfilled",
      expect.it(markdown =>
        expect(
          markdown.toString(),
          "to contain",
          [
            "<!-- unexpected-markdown cleanStackTrace:true -->",
            "```output",
            "foo",
            "  at bar (/path/to/file.js:x:y)",
            "  at quux (/path/to/file.js:x:y)",
            "```"
          ].join("\n")
        )
      )
    );
  });
});
