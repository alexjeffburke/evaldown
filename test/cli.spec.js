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

function createFakeConsole() {
  return {
    log: sinon.stub().named("console.log"),
    error: sinon.stub().named("console.error")
  };
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

    it("should allow switching the format to output to stdout", async () => {
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

    it('should write to the source file when "inplace"', async () => {
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

    it('should override any format to "markdown" when "inplace"', async () => {
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

    it('should write to the source file and output to stdout when "update"', async () => {
      const pwd = path.join(TESTDATA_PATH, "extensions");
      const sourceFilePath = path.join(pwd, "expect.markdown");
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      try {
        await cli.file(pwd, {
          _cons: cons,
          update: true,
          _: ["expect.markdown"]
        });

        await expect(cons.log, "was called");
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });

    it("should pass through a rejection to ensure it is logged later", async () => {
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
