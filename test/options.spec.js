const expect = require("unexpected");
const path = require("path");

const errors = require("../lib/errors");
const options = require("../lib/options");

const TESTDATA_PATH = path.join(__dirname, "..", "testdata");
const TESTDATA_CONFIG_PATH = path.join(TESTDATA_PATH, "config");

describe("options", () => {
  it("should throw on bad extension", async () => {
    const configFile = "nonexistent.txt";

    await expect(
      () =>
        options.loadOptions(path.join(TESTDATA_CONFIG_PATH, configFile), [
          "--config",
          configFile
        ]),
      "to throw",
      expect
        .it("to be an", errors.ConfigFileError)
        .and("to have message", 'config file must have extension "js"')
    );
  });

  it("should throw on bad prefix", async () => {
    const configFile = "nonexistent.js";

    await expect(
      () =>
        options.loadOptions(path.join(TESTDATA_CONFIG_PATH, configFile), [
          "--config",
          configFile
        ]),
      "to throw",
      expect
        .it("to be an", errors.ConfigFileError)
        .and("to have message", 'config file must start with "evaldown."')
    );
  });

  it("should throw on missing file", async () => {
    const configFile = "evaldown.nonexistent.js";
    const configFilePath = path.join(TESTDATA_CONFIG_PATH, configFile);

    await expect(
      () => options.loadOptions(TESTDATA_CONFIG_PATH, ["--config", configFile]),
      "to throw",
      expect
        .it("to be an", errors.ConfigFileError)
        .and(error =>
          expect(
            error.message,
            "to start with",
            `Cannot find module '${configFilePath}'`
          )
        )
    );
  });

  it("should load and return options", async () => {
    const opts = options.loadOptions(TESTDATA_CONFIG_PATH, [
      "--config",
      "evaldown.valid-basic.js"
    ]);

    await expect(opts, "to equal", {
      opts: { sourcePath: "./files", targetPath: "../output" },
      pwd: TESTDATA_CONFIG_PATH
    });
  });
});
