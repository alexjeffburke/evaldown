var expect = require("unexpected")
  .clone()
  .use(require("unexpected-snapshot"));
var Markdown = require("../../lib/md/Markdown");

const codeBlockWithSkipped = [
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
].join("\n");

function locateAndReturnOutputBlock(output) {
  const blockIndex = output.indexOf("```output");
  if (blockIndex === -1) {
    throw new Error("unable to locate output block");
  }
  return output.slice(blockIndex);
}

describe("Markdown", function() {
  describe("toHtml", function() {
    it("should render a syntax highlighted code block", function() {
      const markdown = new Markdown(
        [
          "```javascript",
          "expect({ a: 'b' }, 'to equal', { a: 1234 });",
          "```"
        ].join("\n")
      );

      return expect(
        markdown.toHtml(),
        "when fulfilled",
        "to equal snapshot",
        '<div class="code lang-javascript"><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;a<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&#39;b&#39;</span>&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">&#39;to&nbsp;equal&#39;</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;a<span style="color: #a67f59">:</span>&nbsp;<span style="color: #905">1234</span>&nbsp;<span style="color: #999">});</span></div></div>'
      );
    });

    it("should evaluate and render a syntax highlighted output block", function() {
      const markdown = new Markdown(
        [
          "```javascript",
          "expect({ a: 'b' }, 'to equal', { a: 1234 });",
          "```",
          "",
          "```output",
          "Missing output",
          "```"
        ].join("\n")
      );

      return expect(
        markdown.toHtml(),
        "when fulfilled",
        expect
          .it("not to contain", "Missing output")
          .and("to contain", '<div class="output">')
      );
    });

    it("should ignore paired empty paired blocks", async function() {
      const markdown = new Markdown(
        ["```javascript", "```", "```output", "```"].join("\n")
      );

      expect(
        await markdown.toHtml(),
        "to equal snapshot",
        expect.unindent`
          <div class="code lang-javascript"><div>&nbsp;</div></div>
          <div class="output">&nbsp;</div>
        `
      );
    });

    it("should throw if an output block occurrs with no code block", function() {
      const markdown = new Markdown(
        ["```output", "Missing output", "```"].join("\n")
      );

      return expect(
        () => markdown.toHtml(),
        "to be rejected with",
        expect.it(error =>
          expect(
            error.message,
            "to start with",
            "No matching javascript block for output:\nMissing output"
          )
        )
      );
    });
  });

  describe("withUpdatedExamples", function() {
    it("should produce updated markdown for an unexpected diff", async function() {
      const markdown = await new Markdown(
        codeBlockWithSkipped
      ).withUpdatedExamples({});

      expect(
        locateAndReturnOutputBlock(markdown.toString()),
        "to equal snapshot",
        expect.unindent`
          \`\`\`output
          expected { text: 'foo!' } to equal { text: 'f00!' }

          {
            text: 'foo!' // should equal 'f00!'
                         //
                         // -foo!
                         // +f00!
          }
          \`\`\`
        `
      );
    });

    it("should produces updated markdown for async rejection", async function() {
      const markdown = await new Markdown(
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
      ).withUpdatedExamples({});

      expect(
        locateAndReturnOutputBlock(markdown.toString()),
        "to equal snapshot",
        expect.unindent`
          \`\`\`output
          boom
          \`\`\`
        `
      );
    });

    it("should produces updated markdown for sync throw", async function() {
      const markdown = await new Markdown(
        [
          "```javascript",
          'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
          "```",
          "",
          "<!-- unexpected-markdown cleanStackTrace:true -->",
          "```output",
          "Missing output",
          "```"
        ].join("\n")
      ).withUpdatedExamples({});

      expect(
        locateAndReturnOutputBlock(markdown.toString()),
        "to equal snapshot",
        expect.unindent`
          \`\`\`output
          foo
            at bar (/path/to/file.js:x:y)
            at quux (/path/to/file.js:x:y)
          \`\`\`
        `
      );
    });
  });
});
