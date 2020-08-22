const expect = require("unexpected");

const extractSnippets = require("../../lib/md/extractSnippets");

describe("extractSnippets", function() {
  it("should extract a bare snippet", function() {
    expect(
      extractSnippets('```javascript\nalert("Hello!");\n```', {
        marker: "evaldown"
      }),
      "to satisfy",
      [{ lang: "javascript", code: 'alert("Hello!");' }]
    );
  });

  it("should extract a snippet between some markdown sections", function() {
    expect(
      extractSnippets(
        '# foo\n\n```javascript\nalert("Hello!");\n```\n\n# bar\n',
        { marker: "evaldown" }
      ),
      "to satisfy",
      [{ lang: "javascript", code: 'alert("Hello!");' }]
    );
  });

  it("should extract a snippet and normalize js to javascript", function() {
    expect(
      extractSnippets('# foo\n\n```js\nalert("Hello!");\n```\n\n# bar\n', {
        marker: "evaldown"
      }),
      "to satisfy",
      [{ lang: "javascript", code: 'alert("Hello!");' }]
    );
  });

  it("should extract multiple snippets", function() {
    expect(
      extractSnippets(
        '```js\nalert("Hello!");\n```\n\n```js\nalert("world!");\n```\n',
        { marker: "evaldown" }
      ),
      "to satisfy",
      [{ code: 'alert("Hello!");' }, { code: 'alert("world!");' }]
    );
  });

  it("should extract an empty snippet", function() {
    expect(
      extractSnippets("```javascript\n```", { marker: "evaldown" }),
      "to satisfy",
      [{ lang: "javascript", code: "" }]
    );
  });

  it("should attach the start and end index of the entire block", function() {
    expect(
      extractSnippets('foobar\n```js\nalert("Hello!");\n```\n', {
        marker: "evaldown"
      }),
      "to satisfy",
      [{ index: 7, indexEnd: 33 }]
    );
  });

  it("should attach the start and end index of code within the block", function() {
    expect(
      extractSnippets('foobar\n```js\nalert("Hello!");\n```\n', {
        marker: "evaldown"
      }),
      "to satisfy",
      [{ codeIndex: 13, codeIndexEnd: 29 }]
    );
  });

  it("should return the saved code chunk when using the start and end index", function() {
    const mdSrc = 'foobar\n```js\nalert("Hello!");\n```\n';
    const { code, codeIndex, codeIndexEnd } = extractSnippets(mdSrc, {
      marker: "evaldown"
    })[0];

    expect(mdSrc.slice(codeIndex, codeIndexEnd), "to equal", code);
  });

  it("should default to evaluate:true", function() {
    expect(
      extractSnippets('```js\nalert("Hello!");\n```\n', { marker: "evaldown" }),
      "to satisfy",
      [{ flags: { evaluate: true } }]
    );
  });

  describe("with legacy hash string", function() {
    it("should allow changing evaluate to false via js#evaluate:false", function() {
      expect(
        extractSnippets('```js#evaluate:false\nalert("Hello!");\n```\n', {
          marker: "evaldown"
        }),
        "to satisfy",
        [{ flags: { evaluate: false } }]
      );
    });

    it("should extract a flag after the language specifier and #", function() {
      expect(
        extractSnippets('```js#foo:true\nalert("Hello!");\n```\n', {
          marker: "evaldown"
        }),
        "to satisfy",
        [{ flags: { foo: true } }]
      );
    });

    it("should extract multiple comma-separated flags after the language specifier and #", function() {
      expect(
        extractSnippets('```js#foo:true,bar:false\nalert("Hello!");\n```\n', {
          marker: "evaldown"
        }),
        "to satisfy",
        [{ flags: { foo: true, bar: false } }]
      );
    });

    it("should account the hash string when calculating the index", function() {
      expect(
        extractSnippets('foobar\n```js#foo:false\nalert("Hello!");\n```\n', {
          marker: "evaldown"
        }),
        "to satisfy",
        [{ index: 7, indexEnd: 43, codeIndex: 23, codeIndexEnd: 39 }]
      );
    });
  });

  describe("with html comments", function() {
    it("should ignore an empty preceding comment with a marker", function() {
      expect(
        extractSnippets('<!-- evaldown -->\n```js\nalert("Hello!");\n```\n', {
          marker: "evaldown"
        }),
        "to satisfy",
        [{ flags: expect.it("to equal", { evaluate: true }) }]
      );
    });

    it("should capture flags before comment blocks", function() {
      expect(
        extractSnippets(
          '<!--evaldown async:true-->\n\n\n```js\nalert("Hello!");\n```\n',
          { marker: "evaldown" }
        ),
        "to satisfy",
        [{ flags: { async: true } }]
      );
    });

    it("should capture flags ignoring extra spaces and newlines", function() {
      expect(
        extractSnippets(
          '<!-- evaldown async:true-->\n\n\n```js\nalert("Hello!");\n```\n',
          { marker: "evaldown" }
        ),
        "to satisfy",
        [{ flags: { async: true } }]
      );
    });

    it("should extract flags from a preceding HTML comment", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown foo:true -->\n```js\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { foo: true } }]
      );
    });

    it("should allow changing evaluate to false via a preceding HTML comment", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown evaluate:false -->\n```js\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { evaluate: false } }]
      );
    });

    it("should extract multiple comma-separated flags from a preceding HTML comment", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown foo:true,bar:false -->\n```js\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { foo: true, bar: false } }]
      );
    });

    it("should extract flags from multiple preceding HTML comments", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown foo:true -->\n<!-- unexpected-markdown bar:true -->\n<!-- unexpected-markdown quux:true -->\n```js\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { foo: true, bar: true, quux: true } }]
      );
    });

    it("should not extract flags from preceding HTML comments that do not start with the marker", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown foo:true -->\n<!-- bar:true -->\n<!-- quux:true -->\n```js\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { foo: true, bar: undefined, quux: undefined } }]
      );
    });

    it("should tolerate whitespace between the flags and commas in the preceding HTML comment", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown foo : true , bar : false -->\n```js\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { foo: true, bar: false } }]
      );
    });
  });

  describe("with mixed flags", function() {
    it("should extract flags from both a preceding HTML command and after the language specifier and #", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown foo:true -->\n```js#bar:false\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { foo: true, bar: false } }]
      );
    });

    it("should let the flags after the language specifier win when the same flag is provided in both places", function() {
      expect(
        extractSnippets(
          '<!-- unexpected-markdown foo:true -->\n```js#foo:false\nalert("Hello!");\n```\n',
          { marker: "unexpected-markdown" }
        ),
        "to satisfy",
        [{ flags: { foo: false } }]
      );
    });

    it("should account for a preceeding comment when calculating the index", function() {
      expect(
        extractSnippets(
          'foobar\n<!-- foo: bar -->\n```js#foo:false\nalert("Hello!");\n```\n',
          { marker: "evaldown" }
        ),
        "to satisfy",
        [{ index: 7, indexEnd: 61, codeIndex: 41, codeIndexEnd: 57 }]
      );
    });
  });

  describe("with an output block", function() {
    it("should capture flags from a preceding comment", function() {
      expect(
        extractSnippets(
          '```js\nalert("Hello!");\n```\n\n<!-- evaldown foo:true -->\n```output\nthe output\n```\n',
          { marker: "evaldown" }
        ),
        "to satisfy",
        [{ lang: "javascript" }, { lang: "output", flags: { foo: true } }]
      );
    });
  });

  describe("with an empty code block", function() {
    it("should extract a snippet", function() {
      expect(
        extractSnippets("```javascript\n```", {
          marker: "evaldown"
        }),
        "to satisfy",
        [{ lang: "javascript", code: "", codeIndex: 14, codeIndexEnd: 14 }]
      );
    });
  });

  describe("with an invalid marker", () => {
    it("should throw", () => {
      expect(() => extractSnippets(""), "to throw");
    });
  });

  describe("checkMarker()", () => {
    const checkMarker = extractSnippets.checkMarker;

    it("should throw on null", () => {
      expect(() => checkMarker(null), "to throw");
    });

    it("should throw on empty string", () => {
      expect(() => checkMarker(""), "to throw");
    });

    it("should throw on invalid character", () => {
      expect(() => checkMarker("foo.bar"), "to throw");
    });

    it("should throw on invalid leading character", () => {
      expect(() => checkMarker("-foobar"), "to throw");
    });

    it("should throw an informative message", () => {
      expect(
        () => checkMarker(),
        "to throw",
        [
          "missing or invalid marker",
          "criteria:",
          "  * a non empty string",
          "  * beginning and ending with a letter",
          "  * separated by hyphen",
          ""
        ].join("\n")
      );
    });
  });
});
