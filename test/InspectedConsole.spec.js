const expect = require("unexpected");

const InspectedConsole = require("../lib/InspectedConsole");

const { toString } = InspectedConsole.symbols;

describe("InspectedConsole", () => {
  let inspectedConsole;

  beforeEach(() => {
    inspectedConsole = new InspectedConsole({
      getExpect() {
        return expect.clone();
      }
    });
  });

  describe("with strings", () => {
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
