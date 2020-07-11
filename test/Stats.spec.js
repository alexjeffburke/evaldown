const expect = require("unexpected")
  .clone()
  .use(require("unexpected-snapshot"));

const errors = require("../lib/errors");
const Stats = require("../lib/Stats");

describe("Stats", () => {
  describe("toJSON()", () => {
    it("should return an object including a total", () => {
      const stats = new Stats();
      stats.succeeded = 3;
      stats.errored = 2;

      expect(stats.toJSON(), "to equal", {
        total: 5,
        succeeded: 3,
        errored: 2
      });
    });
  });

  describe("toReport()", () => {
    it("should output singular", () => {
      const stats = new Stats();
      stats.addSuccess();

      expect(
        stats.toReport(),
        "to equal snapshot",
        "processed 1 file without errors"
      );
    });

    it("should output plural", () => {
      const stats = new Stats();
      stats.addSuccess();
      stats.addSuccess();

      expect(
        stats.toReport(),
        "to equal snapshot",
        "processed 2 files without errors"
      );
    });

    it("should output basic error singular", () => {
      const stats = new Stats();
      stats.addError("something.md", new Error("boom"));

      expect(
        stats.toReport(),
        "to equal snapshot",
        expect.unindent`
        processed 1 file with errors...

        "something.md" Error: boom
      `
      );
    });

    it("should output basic error plural", () => {
      const stats = new Stats();
      stats.addError("something.md", new Error("boom"));
      stats.addError("other.md", new Error("kaboom"));

      expect(
        stats.toReport(),
        "to equal snapshot",
        expect.unindent`
        processed 2 files with errors...

        "something.md" Error: boom
        "other.md" Error: kaboom
      `
      );
    });

    it("should output evaluation error singular (evaluation)", () => {
      const stats = new Stats();
      stats.addError(
        "something.md",
        new errors.FileEvaluationError({
          data: {
            errors: {
              0: { data: { original: new Error("fail") } }
            }
          }
        })
      );

      expect(
        stats.toReport(),
        "to equal snapshot",
        expect.unindent`
        processed 1 file with errors...

        "something.md" FileEvaluationError:
          - [0] Error: fail
      `
      );
    });

    it("should output evaluation error singular (processing)", () => {
      const stats = new Stats();
      stats.addError(
        "something.md",
        new errors.FileProcessingError({
          data: {
            errors: {
              0: { data: { original: new Error("fail") } }
            }
          }
        })
      );

      expect(
        stats.toReport(),
        "to equal snapshot",
        expect.unindent`
        processed 1 file with errors...

        "something.md" FileProcessingError:
          - [0] Error: fail
      `
      );
    });

    it("should output evaluation error plural", () => {
      const stats = new Stats();
      stats.addError(
        "something.md",
        new errors.FileEvaluationError({
          data: {
            errors: {
              0: { data: { original: new Error("fail") } }
            }
          }
        })
      );
      stats.addError(
        "other.md",
        new errors.FileEvaluationError({
          data: {
            errors: {
              2: { data: { original: new Error("wail") } }
            }
          }
        })
      );

      expect(
        stats.toReport(),
        "to equal snapshot",
        expect.unindent`
          processed 2 files with errors...

          "something.md" FileEvaluationError:
            - [0] Error: fail
          "other.md" FileEvaluationError:
            - [2] Error: wail
        `
      );
    });
  });
});
