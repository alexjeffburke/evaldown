const expect = require("unexpected");
const Evaldown = require("../lib/Evaldown");

describe("Evaldown", () => {
  it("should be a function", () => {
    expect(Evaldown, "to be a function");
  });

  it("should allow creating an instance", () => {
    expect(new Evaldown(), "to be an", Evaldown);
  });
});
