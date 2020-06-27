const expect = require("unexpected")
  .clone()
  .use(require("unexpected-snapshot"));

const errors = require("../lib/errors");

describe("errors", () => {
  describe("errorToOutput()", () => {
    it("should return a stringified error by default", () => {
      expect(
        errors.errorToOutput(new Error("foobar")),
        "to equal",
        "Error: foobar"
      );
    });

    it("should return a stack when in debug mode", () => {
      const origEnvDebug = process.env.DEBUG;
      process.env.DEBUG = "true";

      try {
        expect(
          errors.errorToOutput(new Error("foobar")),
          "to start with",
          "Error: foobar\n    at"
        );
      } finally {
        process.env.DEBUG = origEnvDebug;
      }
    });
  });

  describe("snippetErrorsToMsg()", () => {
    it("should serialise a FileEvaluationError", () => {
      const snippetErrors = {
        1: new errors.SnippetEvaluationError({
          data: { original: new Error("foo") }
        }),
        5: new errors.SnippetEvaluationError({
          data: { original: new Error("bar") }
        })
      };

      const e = new errors.FileEvaluationError(
        errors.snippetErrorsToMsg(snippetErrors)
      );

      expect(
        String(e),
        "to equal",
        [
          "FileEvaluationError: ",
          "  snippets with errors:",
          "  - [1] Error: foo",
          "  - [5] Error: bar"
        ].join("\n")
      );
    });
  });
});
