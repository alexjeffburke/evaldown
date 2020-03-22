const expect = require("unexpected");
const path = require("path");

const errors = require("../lib/errors");
const options = require("../lib/options");

const TESTDATA_PATH = path.join(__dirname, "..", "testdata");
const TESTDATA_CONFIG_PATH = path.join(TESTDATA_PATH, "config");

describe("options", () => {
  it("should load and return options", async () => {
    const opts = options.loadOptions(TESTDATA_CONFIG_PATH, [
      "--config",
      "valid-basic.js"
    ]);

    await expect(opts, "to equal", {
      opts: { sourcePath: "./files", targetPath: "../output" },
      pwd: "/Users/alex/Documents/projects/evaldown/testdata/config"
    });
  });

  it("should throw on missing file", async () => {
    const configFile = path.join(TESTDATA_CONFIG_PATH, "nonexistent.js");

    await expect(
      () =>
        options.loadOptions(TESTDATA_CONFIG_PATH, [
          "--config",
          "nonexistent.js"
        ]),
      "to throw",
      expect
        .it("to be an", errors.ConfigFileError)
        .and("to have message", `Cannot find module '${configFile}'`)
    );
  });
});
