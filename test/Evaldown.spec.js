const expect = require("unexpected");
const fsExtra = require("fs-extra");
const path = require("path");

const Evaldown = require("../lib/Evaldown");

const TESTDATA_PATH = path.join(__dirname, "..", "testdata");
const TESTDATA_OUTPUT_PATH = path.join(TESTDATA_PATH, "output");

describe("Evaldown", () => {
  before(async () => {
    await fsExtra.ensureDir(TESTDATA_OUTPUT_PATH);
  });

  it("should be a function", () => {
    expect(Evaldown, "to be a function");
  });

  it("should allow creating an instance", () => {
    expect(new Evaldown(), "to be an", Evaldown);
  });

  describe("processFiles()", function() {
    beforeEach(async () => {
      await fsExtra.emptyDir(TESTDATA_OUTPUT_PATH);
    });

    it("should generate files", async function() {
      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "expect.html");
      await expect(
        () => fsExtra.pathExists(expectedOutputFile),
        "to be fulfilled with",
        true
      );
    });
  });
});
