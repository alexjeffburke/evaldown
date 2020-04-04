var expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
var sinon = require("sinon");

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

function locateAndReturnOutputHtml(output) {
  const blockIndex = output.indexOf('<div class="output">');
  if (blockIndex === -1) {
    throw new Error("unable to locate output block");
  }
  return output.slice(blockIndex);
}

describe("Markdown", function() {
  describe("with metadata", () => {
    const markdownWithMetadata = `---
template: default.ejs
theme: dark
title: Unexpected
repository: https://github.com/unexpectedjs/unexpected
---

# Here is my title
`;

    it("should parse the file options", () => {
      const markdown = new Markdown(markdownWithMetadata, { marker: "abc" });

      expect(markdown.metadata, "to equal", {
        template: "default.ejs",
        theme: "dark",
        title: "Unexpected",
        repository: "https://github.com/unexpectedjs/unexpected"
      });
    });

    it("should make the file options available to file globals", async () => {
      const createSomeGlobal = sinon
        .stub()
        .returns(() => ({ foo: true, bar: 1 }));
      const markdown = new Markdown(markdownWithMetadata, {
        marker: "abc"
      });

      markdown._prepareGlobals({
        customGlobals: {
          someGlobal: createSomeGlobal
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

  describe("withInlinedExamples", function() {
    it("should render a syntax highlighted code block", async function() {
      const markdown = await new Markdown(
        [
          "```javascript",
          "expect({ a: 'b' }, 'to equal', { a: 1234 });",
          "```"
        ].join("\n"),
        {
          marker: "evaldown"
        }
      ).withInlinedExamples({
        globals: {
          expect
        }
      });

      return expect(
        markdown.toHtml(),
        "to equal snapshot",
        '<div class="code lang-javascript"><div>expect({&nbsp;a:&nbsp;&#39;b&#39;&nbsp;},&nbsp;&#39;to&nbsp;equal&#39;,&nbsp;{&nbsp;a:&nbsp;1234&nbsp;});</div></div>'
      );
    });

    it("should evaluate and render a syntax highlighted output block", async function() {
      const markdown = await new Markdown(
        [
          "```javascript",
          "expect({ a: 'b' }, 'to equal', { a: 1234 });",
          "```",
          "",
          "```output",
          "Missing output",
          "```"
        ].join("\n"),
        {
          marker: "evaldown"
        }
      ).withInlinedExamples({
        globals: {
          expect
        }
      });

      return expect(
        markdown.toHtml(),
        "to satisfy",
        expect
          .it("not to contain", "Missing output")
          .and("to contain", '<div class="output">')
      );
    });

    it("should ignore paired empty paired blocks", async function() {
      const markdown = await new Markdown(
        ["```javascript", "```", "```output", "```"].join("\n"),
        {
          marker: "evaldown"
        }
      ).withInlinedExamples();

      expect(
        markdown.toHtml(),
        "to equal snapshot",
        expect.unindent`
          <div class="code lang-javascript"><div>&nbsp;</div></div>
          <div class="output">&nbsp;</div>
        `
      );
    });

    it("should throw if an output block occurrs with no code block", function() {
      const markdown = new Markdown(
        ["```output", "Missing output", "```"].join("\n"),
        {
          marker: "evaldown"
        }
      );

      return expect(
        () => markdown.withInlinedExamples(),
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

    it('should produce update for an unexpected diff when "html"', async function() {
      const markdown = await new Markdown(codeBlockWithSkipped, {
        marker: "evaldown",
        globals: { expect }
      }).withInlinedExamples();

      expect(
        locateAndReturnOutputHtml(markdown.toHtml()),
        "to equal snapshot",
        '<div class="output"><div><span style="color: red; font-weight: bold">expected</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">&#39;foo!&#39;</span>&nbsp;}&nbsp;<span style="color: red; font-weight: bold">to&nbsp;equal</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">&#39;f00!&#39;</span>&nbsp;}</div><div>&nbsp;</div><div>{</div><div>&nbsp;&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #555">text</span>:&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">&#39;foo!&#39;</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">should&nbsp;equal</span>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">&#39;f00!&#39;</span></div></div></div><div>&nbsp;</div><div><span style="background-color: red; color: white">foo</span><span style="color: red">!</span></div><div><span style="background-color: green; color: white">f00</span><span style="color: green">!</span></div></div></div></div></div><div>}</div></div>'
      );
    });
  });

  describe("withUpdatedExamples", function() {
    it("should produce updated markdown for an unexpected diff", async function() {
      const markdown = await new Markdown(codeBlockWithSkipped, {
        marker: "evaldown",
        globals: { expect }
      }).withUpdatedExamples({});

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
          "<!-- evaldown async:true -->",
          "```javascript",
          "return Promise.reject(new Error('boom'));",
          "```",
          "",
          "```output",
          "Missing output",
          "```"
        ].join("\n"),
        {
          marker: "evaldown"
        }
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
        ].join("\n"),
        {
          marker: "unexpected-markdown"
        }
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

    it("should produces updated markdown for sync return", async function() {
      const markdown = await new Markdown(
        [
          "```javascript",
          "return { foo: 'bar' }",
          "```",
          "```output",
          "```"
        ].join("\n"),
        {
          marker: "evaldown",
          capture: "return"
        }
      ).withUpdatedExamples({});

      expect(
        locateAndReturnOutputBlock(markdown.toString()),
        "to equal snapshot",
        expect.unindent`
          \`\`\`output
          { foo: 'bar' }
          \`\`\`
        `
      );
    });

    describe("with legacy flags on the code block", () => {
      it("should produces updated markdown for async rejection", async function() {
        const markdown = await new Markdown(
          [
            "```javascript#async:true",
            "return Promise.resolve('ahoy');",
            "```",
            "",
            "```output",
            "```"
          ].join("\n"),
          {
            marker: "evaldown",
            capture: "return"
          }
        ).withUpdatedExamples({});

        expect(
          markdown.toString(),
          "to equal snapshot",
          expect.unindent`
            <-- evaldown async:true -->
            \`\`\`javascript
            return Promise.resolve('ahoy');
            \`\`\`

            \`\`\`output
            ahoy
            \`\`\`
          `
        );
      });
    });
  });
});
