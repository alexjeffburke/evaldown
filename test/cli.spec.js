const expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
const fs = require("fs");
const fsExtra = require("fs-extra");
const path = require("path");
const sinon = require("sinon");

const cli = require("../lib/cli");
const errors = require("../lib/errors");

const TESTDATA_PATH = path.join(__dirname, "..", "testdata");
const TESTDATA_OUTPUT_PATH = path.join(TESTDATA_PATH, "output");

function createFakeConsole() {
  return {
    log: sinon.stub().named("console.log"),
    warn: sinon.stub().named("console.warn"),
    error: sinon.stub().named("console.error")
  };
}

function isPathDirectory(path) {
  const stat = fs.statSync(path);
  try {
    expect(stat.isDirectory(), "to be true");
  } catch (e) {
    expect.fail({ message: `The path "${path}" was not a directory.` });
  }
}

function usingOpts(pwd, optsFile) {
  return require(path.join(pwd, optsFile));
}

describe("cli", () => {
  const cons = createFakeConsole();

  before(async () => {
    await fsExtra.ensureDir(TESTDATA_OUTPUT_PATH);
  });

  beforeEach(async () => {
    await fsExtra.emptyDir(TESTDATA_OUTPUT_PATH);
  });

  afterEach(() => {
    sinon.reset();
  });

  it("should output markdown to the target path", async () => {
    const pwd = path.join(TESTDATA_PATH, "config");
    const opts = usingOpts(pwd, "evaldown.valid-basic.js");

    await cli.files(pwd, { _cons: cons, ...opts });

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

  it('should output to the source place when "inplace"', async () => {
    const testFile = path.join(TESTDATA_PATH, "capture-return", "captured.md");
    const scratchFile = path.join(TESTDATA_OUTPUT_PATH, "something.md");
    await fsExtra.copyFile(testFile, scratchFile);

    const pwd = TESTDATA_OUTPUT_PATH;
    const opts = {
      inplace: true,
      sourcePath: "."
    };

    await cli.files(pwd, { _cons: cons, ...opts });
  });

  it("should error on an invalid target path", async () => {
    const pwd = path.join(TESTDATA_PATH, "config");
    const opts = {
      sourcePath: "./files",
      targetPath: "./missing_parent/output"
    };

    await expect(
      () => cli.files(pwd, opts),
      "to be rejected with",
      'Inaccessible "targetPath"'
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

  describe("files()", () => {
    it("should write stats to stderr with success", async () => {
      const pwd = path.join(TESTDATA_PATH, "config");
      const opts = usingOpts(pwd, "evaldown.valid-basic.js");

      await cli.files(pwd, { _cons: cons, ...opts });

      expect(
        cons.error.getCall(0).args[0],
        "to equal snapshot",
        "processed 1 file without errors"
      );
    });

    it("should write stats to stderr with error", async () => {
      const pwd = TESTDATA_PATH;
      const opts = usingOpts(pwd, "config/evaldown.valid-errors.js");

      await cli.files(pwd, { _cons: cons, ...opts });

      expect(
        cons.error.getCall(0).args[0],
        "to equal snapshot",
        expect.unindent`
        processed 1 file with errors...

        "example.md" FileEvaluationError:
          - [0] ReferenceError: expect is not defined
      `
      );
    });

    it("should allow switching the capture to console", async () => {
      const pwd = path.join(TESTDATA_PATH, "capture-console");
      const opts = {
        sourcePath: path.join(TESTDATA_PATH, "capture-console"),
        targetPath: TESTDATA_OUTPUT_PATH
      };

      await cli.files(pwd, {
        _cons: cons,
        format: "markdown",
        capture: "console",
        ...opts
      });

      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "captured.md");
      await expect(
        await fsExtra.readFile(expectedOutputFile, "utf8"),
        "to equal snapshot",
        expect.unindent`
          Testing console capturing.

          \`\`\`javascript
          console.log("hello, world!");
          console.error("foobar");
          \`\`\`

          \`\`\`output
          'hello, world!'
          'foobar'
          \`\`\`

        `
      );
    });

    describe("when operating in validate mode", () => {
      it("should record a processing error", async () => {
        const pwd = path.join(TESTDATA_PATH, "validate");

        await expect(
          cli.files(pwd, {
            sourcePath: ".",
            validate: true,
            reporter: "none"
          }),
          "to be fulfilled with",
          { total: 2, succeeded: 1, errored: 1 }
        );
      });

      it("should write output as HTML", async () => {
        const pwd = path.join(TESTDATA_PATH, "validate");
        const reportPath = path.join(pwd, "evaldown");

        try {
          await cli.files(pwd, {
            sourcePath: ".",
            validate: true,
            reporter: "html"
          });

          isPathDirectory(reportPath);
        } finally {
          await fsExtra.remove(reportPath);
        }
      });

      it("should always output to the console with the ci flag", async () => {
        const pwd = path.join(TESTDATA_PATH, "validate");

        await cli.files(pwd, {
          sourcePath: ".",
          validate: true,
          reporter: "none",
          ci: true,
          _cons: cons
        });

        expect(cons.warn, "was called");
      });
    });

    describe("with require", () => {
      it("should output markdown", async () => {
        const pwd = path.join(TESTDATA_PATH, "file-globals");

        await cli.files(pwd, {
          _cons: cons,
          format: "markdown",
          sourcePath: ".",
          targetPath: "../output",
          require: "../require/globals"
        });

        const expectedOutputFile = path.join(
          TESTDATA_OUTPUT_PATH,
          "example.md"
        );
        expect(
          await fsExtra.readFile(expectedOutputFile, "utf8"),
          "to equal snapshot",
          expect.unindent`
            Function fun.

            \`\`\`javascript
            return fileGlobalFunction();
            \`\`\`

            \`\`\`output
            '-=defined by require=-'
            \`\`\`

            \`\`\`javascript
            return \`still here ..\${fileGlobalFunction()}\`;
            \`\`\`

            \`\`\`output
            'still here ..-=defined by require=-'
            \`\`\`

          `
        );
      });
    });

    describe("with tsconfig", () => {
      it("should throw on a bad tsconfig path", async () => {
        const pwd = path.join(TESTDATA_PATH, "config");
        const opts = usingOpts(pwd, "evaldown.invalid-tsconfig.js");

        await expect(
          () => cli.files(pwd, { _cons: cons, ...opts }),
          "to be rejected with",
          'Inaccessible "tsconfigPath"'
        );
      });

      it("should load a valid tsconfig path", async () => {
        const pwd = path.join(TESTDATA_PATH, "config");
        const opts = usingOpts(pwd, "evaldown.valid-tsconfig.js");

        await cli.files(pwd, {
          _cons: cons,
          format: "markdown",
          ...opts
        });

        const expectedOutputFile = path.join(
          TESTDATA_OUTPUT_PATH,
          "example.md"
        );
        await expect(
          await fsExtra.readFile(expectedOutputFile, "utf8"),
          "to equal snapshot",
          expect.unindent`
            \`\`\`ts
            function greet(thing: string) {
              return \`Greetings, \${thing}\`
            }

            return greet("foo");
            \`\`\`

            \`\`\`output
            'Greetings, foo'
            \`\`\`

          `
        );
      });
    });
  });

  describe("file()", () => {
    it("should output markdown to stdout by default", async () => {
      const pwd = path.join(TESTDATA_PATH, "extensions");

      await cli.file(pwd, {
        _cons: cons,
        _: ["expect.markdown"]
      });

      await expect(cons.log, "to have a call satisfying", [
        expect.it(
          "to start with",
          expect.unindent`
            Some string manipulations.

            \`\`\`javascript
            return "foobar".slice(0, 3);
            \`\`\`
          `
        )
      ]);
    });

    it("should allow switching the format to html", async () => {
      const pwd = path.join(TESTDATA_PATH, "extensions");
      const sourceFilePath = path.join(pwd, "expect.markdown");
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      try {
        await cli.file(pwd, {
          _cons: cons,
          format: "html",
          _: ["expect.markdown"]
        });

        expect(cons.log, "to have a call satisfying", [
          expect.it("to contain", "<div")
        ]);
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });

    it("should allow switching the capture to console", async () => {
      const pwd = path.join(TESTDATA_PATH, "capture-console");
      const sourceFilePath = path.join(pwd, "captured.md");
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      try {
        await cli.file(pwd, {
          _cons: cons,
          capture: "console",
          _: ["captured.md"]
        });

        expect(cons.log, "to have a call satisfying", [
          expect.it(output =>
            expect(
              output,
              "to equal snapshot",
              expect.unindent`
                Testing console capturing.

                \`\`\`javascript
                console.log("hello, world!");
                console.error("foobar");
                \`\`\`

                \`\`\`output
                'hello, world!'
                'foobar'
                \`\`\`

              `
            )
          )
        ]);
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });

    it("should throw on inaccessible", async () => {
      const pwd = path.join(TESTDATA_PATH, "example");
      const opts = {
        _: ["nonexistent.md"]
      };

      await expect(
        () => cli.file(pwd, opts),
        "to be rejected with",
        'Inaccessible "sourceFile"'
      );
    });

    it("should throw on an evaluation error", async () => {
      const pwd = path.join(TESTDATA_PATH, "some-errors");

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

    describe("when operating in inplace mode", () => {
      it("should write to the source file", async () => {
        const pwd = path.join(TESTDATA_PATH, "extensions");
        const sourceFilePath = path.join(pwd, "expect.markdown");
        const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

        try {
          await cli.file(pwd, {
            inplace: true,
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
              'foo'
              \`\`\`

              \`\`\`javascript
              return "foobar".slice(3, 6);
              \`\`\`

              \`\`\`output
              'bar'
              \`\`\`

            `
          );
        } finally {
          await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
        }
      });

      it('should override any format to "markdown"', async () => {
        const pwd = path.join(TESTDATA_PATH, "extensions");
        const sourceFilePath = path.join(pwd, "expect.markdown");
        const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

        try {
          await cli.file(pwd, {
            format: "html",
            inplace: true,
            _: ["expect.markdown"]
          });

          await expect(
            await fsExtra.readFile(sourceFilePath, "utf8"),
            "not to contain",
            "<div"
          );
        } finally {
          await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
        }
      });
    });

    describe("when operating in update mode", () => {
      it("should write to the source file", async () => {
        const pwd = path.join(TESTDATA_PATH, "extensions");
        const sourceFilePath = path.join(pwd, "expect.markdown");
        const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

        try {
          await cli.file(pwd, {
            _cons: cons,
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
              'foo'
              \`\`\`

              \`\`\`javascript
              return "foobar".slice(3, 6);
              \`\`\`

              \`\`\`output
              'bar'
              \`\`\`

            `
          );
        } finally {
          await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
        }
      });

      it("should output to stdout", async () => {
        const pwd = path.join(TESTDATA_PATH, "extensions");
        const sourceFilePath = path.join(pwd, "expect.markdown");
        const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

        try {
          await cli.file(pwd, {
            _cons: cons,
            update: true,
            _: ["expect.markdown"]
          });

          await expect(cons.log, "to have a call satisfying", [
            expect.it(output =>
              expect(
                output,
                "to equal snapshot",
                expect.unindent`
              Some string manipulations.

              \`\`\`javascript
              return "foobar".slice(0, 3);
              \`\`\`

              \`\`\`output
              'foo'
              \`\`\`

              \`\`\`javascript
              return "foobar".slice(3, 6);
              \`\`\`

              \`\`\`output
              'bar'
              \`\`\`

            `
              )
            )
          ]);
        } finally {
          await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
        }
      });
    });

    describe("when operating in validate mode", () => {
      it("should record a processing error", async () => {
        const pwd = path.join(TESTDATA_PATH, "validate");

        await expect(
          cli.file(pwd, {
            validate: true,
            reporter: "none",
            _: ["failing.md"]
          }),
          "to be fulfilled"
        );
      });

      it("should write output as HTML", async () => {
        const pwd = path.join(TESTDATA_PATH, "validate");
        const reportPath = path.join(pwd, "evaldown");

        try {
          await cli.file(pwd, {
            validate: true,
            reporter: "html",
            _: ["failing.md"]
          });

          isPathDirectory(reportPath);
        } finally {
          await fsExtra.remove(reportPath);
        }
      });

      it("should always output to the console with the ci flag", async () => {
        const pwd = path.join(TESTDATA_PATH, "validate");

        await cli.file(pwd, {
          validate: true,
          reporter: "none",
          ci: true,
          _cons: cons,
          _: ["failing.md"]
        });

        expect(cons.warn, "was called");
      });
    });

    describe("with require", () => {
      it("should output markdown", async () => {
        const pwd = path.join(TESTDATA_PATH, "file-globals");

        await cli.file(pwd, {
          _cons: cons,
          _: ["example.md"],
          require: path.join(TESTDATA_PATH, "require", "globals")
        });

        expect(cons.log, "was called times", 1);
        expect(
          cons.log.getCall(0).args[0],
          "to equal snapshot",
          expect.unindent`
          Function fun.

          \`\`\`javascript
          return fileGlobalFunction();
          \`\`\`

          \`\`\`output
          '-=defined by require=-'
          \`\`\`

          \`\`\`javascript
          return \`still here ..\${fileGlobalFunction()}\`;
          \`\`\`

          \`\`\`output
          'still here ..-=defined by require=-'
          \`\`\`

        `
        );
      });
    });

    describe("with tsconfig", () => {
      it("should throw on a bad tsconfig path", async () => {
        const pwd = path.join(TESTDATA_PATH, "typescript");

        await expect(
          () =>
            cli.file(pwd, {
              _: ["example.md"],
              tsconfigPath: "./nonexistent/tsconfig.json"
            }),
          "to be rejected with",
          'Inaccessible "tsconfigPath"'
        );
      });

      it("should load a valid tsconfig path", async () => {
        const pwd = path.join(TESTDATA_PATH, "typescript");

        await cli.file(pwd, {
          _cons: cons,
          _: ["example.md"],
          tsconfigPath: "./tsconfig.json"
        });

        expect(cons.log, "was called times", 1);
        expect(
          cons.log.getCall(0).args[0],
          "to equal snapshot",
          expect.unindent`
          \`\`\`ts
          function greet(thing: string) {
            return \`Greetings, \${thing}\`
          }

          return greet("foo");
          \`\`\`

          \`\`\`output
          'Greetings, foo'
          \`\`\`

        `
        );
      });
    });
  });

  describe("byPath()", () => {
    it("should choose the files function for a directory", async () => {
      const pwd = TESTDATA_PATH;

      sinon.stub(cli, "files");

      await cli.byPath(pwd, {
        _: ["capture-return"]
      });

      expect(cli.files, "to have a call satisfying", [
        pwd,
        { sourcePath: "capture-return" }
      ]);
    });

    it("should choose the file function for a file", async () => {
      const pwd = path.join(TESTDATA_PATH, "capture-return");

      sinon.stub(cli, "file");

      await cli.byPath(pwd, {
        _: ["captured.md"]
      });

      expect(cli.file, "to have a call satisfying", [pwd, { sourcePath: "." }]);
    });

    it("should throw on an invalid path", async () => {
      const pwd = path.join(TESTDATA_PATH, "example");
      const opts = {
        _: ["nonexistent.md"]
      };

      await expect(
        () => cli.byPath(pwd, opts),
        "to be rejected with",
        'Invalid "path"'
      );
    });
  });
});
