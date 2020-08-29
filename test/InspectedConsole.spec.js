const expect = require("unexpected");

const InspectedConsole = require("../lib/InspectedConsole");

const { setOption, toString } = InspectedConsole.symbols;

describe("InspectedConsole", () => {
  let inspectedConsole;

  beforeEach(() => {
    inspectedConsole = new InspectedConsole({
      getExpect() {
        return expect.clone();
      }
    });
  });

  it("should throw on an unsupported option", () => {
    expect(
      () => {
        const ic = new InspectedConsole();
        ic[setOption]("foobar", "baz");
      },
      "to throw",
      "invalid option"
    );
  });

  describe("without quoting", () => {
    it("should escape \\n", () => {
      inspectedConsole[setOption]("isQuoted", false);

      inspectedConsole.log("\n");

      expect(inspectedConsole[toString]("text"), "to equal", "\\n");
    });

    it("should format and perform substitutions", () => {
      inspectedConsole[setOption]("isQuoted", false);

      inspectedConsole.log("%s, welcome to the %s", "Foo", "Bar");

      expect(
        inspectedConsole[toString]("text"),
        "to equal",
        "Foo, welcome to the Bar"
      );
    });

    it("should write an empty line when called without args", () => {
      inspectedConsole[setOption]("isQuoted", false);

      inspectedConsole.log();

      expect(inspectedConsole[toString]("text"), "to equal", "");
    });

    it("should write a string value when given undefined", () => {
      inspectedConsole[setOption]("isQuoted", false);

      inspectedConsole.log(undefined);

      expect(inspectedConsole[toString]("text"), "to equal", "undefined");
    });

    it("should write a string value when given null", () => {
      inspectedConsole[setOption]("isQuoted", false);

      inspectedConsole.log(null);

      expect(inspectedConsole[toString]("text"), "to equal", "null");
    });
  });

  describe("with quoting", () => {
    it("should escape \\n", () => {
      inspectedConsole.log("\n");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\n'");
    });

    it("should escape \\r", () => {
      inspectedConsole.log("\r");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\r'");
    });

    it("should escape '", () => {
      inspectedConsole.log("'");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\''");
    });

    it("should escape \\", () => {
      inspectedConsole.log("\\");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\\\'");
    });

    it("should escape \\t", () => {
      inspectedConsole.log("\t");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\t'");
    });

    it("should escape \\b", () => {
      inspectedConsole.log("\b");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\b'");
    });

    it("should escape \\f", () => {
      inspectedConsole.log("\f");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\f'");
    });

    it("should escape \\0", () => {
      inspectedConsole.log("\0");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\x00'");
    });

    it("should escape \\x1b", () => {
      inspectedConsole.log("\x1b");

      expect(inspectedConsole[toString]("text"), "to equal", "'\\x1b'");
    });
  });
});
