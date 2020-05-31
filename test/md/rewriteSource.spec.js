const expect = require("unexpected").clone();

const rewriteSource = require("../../lib/md/rewriteSource");

const toWrapped = code => `(function () {${code}})()`;

describe("rewriteSource", function() {
  expect.addAssertion(
    "<string> to equal output code <string>",
    (expect, subject, value) => {
      expect(rewriteSource(toWrapped(subject)), "to equal", toWrapped(value));
    }
  );

  describe("class", () => {
    it("should be rewritten at the top level", function() {
      expect("class Foo {}", "to equal output code", "Foo=class Foo {}");
    });
  });

  describe("function", () => {
    it("should be rewritten at the top level", function() {
      expect(
        "function foo() {}",
        "to equal output code",
        "foo=function foo() {}"
      );
    });
  });

  describe("const", () => {
    it("should be rewritten at the top level", function() {
      expect(
        "const foo = 'foo';",
        "to equal output code",
        "void (foo = 'foo');"
      );
    });
  });

  describe("let", () => {
    it("should be rewritten with a value", function() {
      expect("let foo = 'foo';", "to equal output code", "void (foo = 'foo');");
    });

    it("should be rewritten without a value", function() {
      expect("let foo;", "to equal output code", "void (foo=undefined);");
    });
  });

  describe("with a global", () => {
    it("should not be rewritten", function() {
      expect("foo = 'foo';", "to equal output code", "foo = 'foo';");
    });
  });
});
