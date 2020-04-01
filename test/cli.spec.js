const expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
const fsExtra = require("fs-extra");
const path = require("path");
const sinon = require("sinon");

const cli = require("../lib/cli");
const errors = require("../lib/errors");

const TESTDATA_PATH = path.join(__dirname, "..", "testdata");
const TESTDATA_OUTPUT_PATH = path.join(TESTDATA_PATH, "output");

function usingOpts(pwd, optsFile) {
  return require(path.join(pwd, optsFile));
}

describe("cli", () => {
  before(async () => {
    await fsExtra.ensureDir(TESTDATA_OUTPUT_PATH);
  });

  beforeEach(async () => {
    await fsExtra.emptyDir(TESTDATA_OUTPUT_PATH);
  });

  it("should use the config file", async () => {
    const pwd = path.join(TESTDATA_PATH, "config");
    const opts = usingOpts(pwd, "evaldown.valid-basic.js");

    await cli.files(pwd, opts);

    // check the file was created
    const expectedOutputFile = path.join(
      TESTDATA_OUTPUT_PATH,
      "something.html"
    );
    await expect(
      () => fsExtra.pathExists(expectedOutputFile),
      "to be fulfilled with",
      true
    );
  });

  describe("with bad sourcePath", () => {
    it("should throw on missing", async () => {
      const pwd = path.join(TESTDATA_PATH, "config");

      await expect(
        () => cli.files(pwd, {}),
        "to be rejected with",
        'Missing "sourcePath"'
      );
    });

    it("should throw on inaccessible", async () => {
      const pwd = path.join(TESTDATA_PATH, "config");
      const opts = usingOpts(pwd, "evaldown.inaccessible-sourcePath.js");

      await expect(
        () => cli.files(pwd, opts),
        "to be rejected with",
        'Inaccessible "sourcePath"'
      );
    });

    it("should throw on invalid", async () => {
      const pwd = path.join(TESTDATA_PATH, "config");
      const opts = usingOpts(pwd, "evaldown.invalid-sourcePath.js");

      await expect(
        () => cli.files(pwd, opts),
        "to be rejected with",
        'Invalid "sourcePath"'
      );
    });
  });

  describe("file()", () => {
    it("should output markdown to stdout by default", async () => {
      const pwd = path.join(TESTDATA_PATH, "extensions");
      const cons = {
        log: sinon.stub().named("log")
      };

      await cli.file(pwd, {
        _cons: cons,
        _: ["expect.markdown"]
      });

      await expect(cons.log, "to have a call satisfying", [
        expect.it(
          "to equal snapshot",
          expect.unindent`
            Some string manipulations.

            \`\`\`javascript
            return "foobar".slice(0, 3);
            \`\`\`

            \`\`\`output
            foo
            \`\`\`

            \`\`\`javascript
            return "foobar".slice(3, 6);
            \`\`\`

            \`\`\`output
            bar
            \`\`\`

          `
        )
      ]);
    });

    it('should write an update the file when "inplace"', async () => {
      const pwd = path.join(TESTDATA_PATH, "extensions");
      const sourceFilePath = path.join(pwd, "expect.markdown");
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      try {
        await cli.file(pwd, {
          update: true,
          _: ["expect.markdown"]
        });

        await expect(
          await fsExtra.readFile(sourceFilePath, "utf8"),
          "to equal snapshot",
          expect.unindent`
            Some string manipulations.

            \`\`\`javascript
            return "foobar".slice(0, 3);
            \`\`\`

            \`\`\`output
            foo
            \`\`\`

            \`\`\`javascript
            return "foobar".slice(3, 6);
            \`\`\`

            \`\`\`output
            bar
            \`\`\`

          `
        );
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });

    it("should pass through a rejection to ensure it is logged later", async () => {
      const pwd = path.join(TESTDATA_PATH, "some-errors");
      const cons = {
        error: sinon.stub().named("error")
      };

      await expect(
        () =>
          cli.file(pwd, {
            _cons: cons,
            _: ["example.md"]
          }),
        "to be rejected with",
        expect.it("to be an", errors.FileEvaluationError)
      );
    });
  });
});
