const expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
const sinon = require("sinon");

const Markdown = require("../../lib/md/Markdown");

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

function locateAndReturnOutputBlock(output, marker = "evaldown") {
  const blockIndex = output.indexOf(`<!-- ${marker} output:true`);
  if (blockIndex === -1) {
    throw new Error("unable to locate output block");
  }
  return output.slice(output.indexOf("```", blockIndex));
}

function locateAndReturnOutputHtml(output) {
  const blockIndex = output.indexOf('<div class="output">');
  if (blockIndex === -1) {
    throw new Error("unable to locate output block");
  }
  return output.slice(blockIndex);
}

describe("Markdown", function() {
  afterEach(() => {
    sinon.restore();
  });

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

    it("should make the file options available to evaluation", async () => {
      const markdown = new Markdown(markdownWithMetadata, {
        marker: "abc"
      });

      const options = markdown._prepareOptions();

      expect(options, "to satisfy", {
        fileMetadata: expect.it("to be", markdown.metadata)
      });
    });
  });

  describe("#getExpect()", () => {
    it("should throw if called before expect is initialised", () => {
      expect(
        () => {
          new Markdown("", {
            marker: "evaldown"
          }).getExpect();
        },
        "to throw",
        "expect was not initialised"
      );
    });
  });

  describe("#validateSnippets()", () => {
    it("should throw if called before evaluation", () => {
      const markdown = new Markdown("", { marker: "evaldown" });

      return expect(
        () => markdown.validateSnippets(),
        "to throw",
        "snippets were not evaluated"
      );
    });
  });

  describe("#withExamples()", () => {
    it("should reject if called before evaluation", () => {
      const markdown = new Markdown("", { marker: "evaldown" });

      return expect(
        () => markdown.withExamples(),
        "to be rejected with",
        "snippets were not evaluated"
      );
    });
  });

  describe("#withInlinedExamples()", function() {
    it("should render a syntax highlighted code block", async function() {
      const maker = new Markdown(
        [
          "```javascript",
          "expect({ a: 'b' }, 'to equal', { a: 1234 });",
          "```"
        ].join("\n"),
        {
          marker: "evaldown"
        }
      );
      await maker.evaluate({
        pwdPath: __dirname,
        fileGlobals: { expect: () => expect }
      });

      const markdown = await maker.withInlinedExamples();

      return expect(
        markdown.toHtml(),
        "to equal snapshot",
        '<div class="code lang-javascript"><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;<span style="color: #905">a</span><span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">\'b\'</span>&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">\'to&nbsp;equal\'</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;<span style="color: #905">a</span><span style="color: #a67f59">:</span>&nbsp;<span style="color: #905">1234</span>&nbsp;<span style="color: #999">});</span></div></div>'
      );
    });

    it("should evaluate and render a syntax highlighted output block", async function() {
      const maker = new Markdown(
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
      );
      await maker.evaluate({
        pwdPath: __dirname,
        fileGlobals: { expect: () => expect }
      });

      const markdown = await maker.withInlinedExamples();

      return expect(
        markdown.toHtml(),
        "to satisfy",
        expect
          .it("not to contain", "Missing output")
          .and("to contain", '<div class="output">')
      );
    });

    it("should ignore paired empty paired blocks", async function() {
      const maker = new Markdown(
        ["```javascript", "```", "```output", "```"].join("\n"),
        {
          marker: "evaldown"
        }
      );
      await maker.evaluate({ pwdPath: __dirname });

      const markdown = await maker.withInlinedExamples();

      expect(
        markdown.toHtml(),
        "to equal snapshot",
        expect.unindent`
          <div class="code lang-javascript"><div>&nbsp;</div></div>
          <div class="output">&nbsp;</div>
        `
      );
    });

    it('should produce update for an unexpected diff when "html"', async function() {
      const maker = new Markdown(codeBlockWithSkipped, {
        marker: "evaldown",
        pwdPath: __dirname,
        fileGlobals: { expect: () => expect }
      });
      await maker.evaluate();

      const markdown = await maker.withInlinedExamples();

      expect(
        locateAndReturnOutputHtml(markdown.toHtml()),
        "to equal snapshot",
        '<div class="output"><div><span style="color: red; font-weight: bold">expected</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">\'foo!\'</span>&nbsp;}&nbsp;<span style="color: red; font-weight: bold">to&nbsp;equal</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">\'f00!\'</span>&nbsp;}</div><div>&nbsp;</div><div>{</div><div>&nbsp;&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #555">text</span>:&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">\'foo!\'</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">should&nbsp;equal</span>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">\'f00!\'</span></div></div></div><div>&nbsp;</div><div><span style="background-color: red; color: white">foo</span><span style="color: red">!</span></div><div><span style="background-color: green; color: white">f00</span><span style="color: green">!</span></div></div></div></div></div><div>}</div></div>'
      );
    });
  });

  describe("#withUpdatedExamples()", function() {
    it("should produce updated markdown for an unexpected diff", async function() {
      const maker = new Markdown(codeBlockWithSkipped, {
        marker: "evaldown",
        pwdPath: __dirname,
        fileGlobals: { expect: () => expect }
      });
      await maker.evaluate();

      const markdown = await maker.withUpdatedExamples();

      expect(
        locateAndReturnOutputBlock(markdown.toText()),
        "to equal snapshot",
        expect.unindent`
          \`\`\`
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

    it("should produces updated markdown for sync throw", async function() {
      const maker = new Markdown(
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
      );
      await maker.evaluate({ pwdPath: __dirname });

      const markdown = await maker.withUpdatedExamples();

      expect(
        locateAndReturnOutputBlock(markdown.toText(), "unexpected-markdown"),
        "to equal snapshot",
        expect.unindent`
          \`\`\`
          foo
            at bar (/path/to/file.js:x:y)
            at quux (/path/to/file.js:x:y)
          \`\`\`
        `
      );
    });

    it("should produces updated markdown for sync return", async function() {
      const maker = new Markdown(
        [
          "```javascript",
          "return { foo: 'bar' }",
          "```",
          "```output",
          "```"
        ].join("\n"),
        {
          marker: "evaldown",
          pwdPath: __dirname,
          capture: "return"
        }
      );
      await maker.evaluate();

      const markdown = await maker.withUpdatedExamples();

      expect(
        locateAndReturnOutputBlock(markdown.toText()),
        "to equal snapshot",
        expect.unindent`
          \`\`\`
          { foo: 'bar' }
          \`\`\`
        `
      );
    });

    describe("with alternate capture modes", () => {
      it("should produces updated markdown for promise rejection", async function() {
        const maker = new Markdown(
          [
            "```javascript",
            "console.log('foobar');\nPromise.resolve();",
            "```",
            "",
            "```output",
            "Missing output",
            "```"
          ].join("\n"),
          {
            marker: "evaldown",
            capture: "console"
          }
        );
        await maker.evaluate({ pwdPath: __dirname });

        const markdown = await maker.withUpdatedExamples();

        expect(
          locateAndReturnOutputBlock(markdown.toText()),
          "to equal snapshot",
          expect.unindent`
            \`\`\`
            foobar
            \`\`\`
          `
        );
      });
    });

    describe("with legacy flags on the code block", () => {
      it("should produces updated markdown with converted flags", async function() {
        const maker = new Markdown(
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
            pwdPath: __dirname,
            capture: "return"
          }
        );
        await maker.evaluate();

        const markdown = await maker.withUpdatedExamples();

        expect(
          markdown.toText(),
          "to equal snapshot",
          expect.unindent`
            <!-- evaldown async:true -->

            \`\`\`javascript
            return Promise.resolve('ahoy');
            \`\`\`

            <!-- evaldown output:true -->

            \`\`\`
            'ahoy'
            \`\`\`
          `
        );
      });
    });
  });

  describe("with legacy output block", () => {
    it("should produces updated markdown with extra comment marker", async function() {
      const maker = new Markdown(
        [
          "```javascript",
          "return Promise.resolve('ahoy');",
          "```",
          "",
          "```output",
          "```"
        ].join("\n"),
        {
          marker: "evaldown",
          pwdPath: __dirname,
          capture: "return"
        }
      );
      await maker.evaluate();

      const markdown = await maker.withUpdatedExamples();

      expect(
        markdown.toText(),
        "to equal snapshot",
        expect.unindent`
          \`\`\`javascript
          return Promise.resolve('ahoy');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          'ahoy'
          \`\`\`
        `
      );
    });
  });

  describe("Markdown.maybeRemoveNewlines()", () => {
    const maybeRemoveNewlines = Markdown.maybeRemoveNewlines;

    it("should remove newlines", () => {
      const [str, count] = maybeRemoveNewlines("foobar\n\n", 6, 2);

      expect(str, "to equal", "foobar");
      expect(count, "to equal", 2);
    });

    it("should stop removing when it sees a non-newline", () => {
      const [str, count] = maybeRemoveNewlines("\n\n\nfoobar", 0, 4);

      expect(str, "to equal", "foobar");
      expect(count, "to equal", 3);
    });

    it("should stop removing when it reaches the maximum", () => {
      const [str, count] = maybeRemoveNewlines("\n\n\n\n\n", 0, 4);

      expect(str, "to equal", "\n");
      expect(count, "to equal", 4);
    });

    it("should not remove if the first character is not a newline", () => {
      const [str, count] = maybeRemoveNewlines("foobar\n\n", 0, 2);

      expect(str, "to equal", "foobar\n\n");
      expect(count, "to equal", 0);
    });
  });
});
