const expect = require("unexpected");
const fsExtra = require("fs-extra");
const path = require("path");

const cli = require("../lib/cli");

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
});
