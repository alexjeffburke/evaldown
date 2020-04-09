const symbols = {
  expect: Symbol("expect"),
  isEmpty: Symbol("isEmpty"),
  line: Symbol("line"),
  markdown: Symbol("markdown"),
  output: Symbol("output"),
  reset: Symbol("reset"),
  toString: Symbol("toSting")
};

function makeBoundConsoleMethod(out, con) {
  return function(first, ...rest) {
    if (typeof first === "string") {
      this[symbols.line](out, first);
    } else {
      for (const obj of [first, ...rest]) {
        this[symbols.line](out, obj);
      }
    }
  }.bind(con);
}

function noopMethod() {}

class InspectedConsole {
  constructor(markdown) {
    this[symbols.markdown] = markdown;
    this[symbols.output] = [];

    this.log = makeBoundConsoleMethod("stdout", this);
    this.info = makeBoundConsoleMethod("stdout", this);
    this.warn = makeBoundConsoleMethod("stderr", this);
    this.error = makeBoundConsoleMethod("stderr", this);

    // Stub trace, time, timeEnd etc.
    for (const key of Object.keys(console)) {
      if (typeof console[key] === "function" && !this[key]) {
        this[key] = noopMethod;
      }
    }
  }

  get [symbols.expect]() {
    return this[symbols.markdown].getExpect();
  }

  [symbols.isEmpty]() {
    return this[symbols.output].length === 0;
  }

  [symbols.line](out, value) {
    if (typeof value !== "string") {
      value = this[symbols.expect].inspect(value, 6);
    } else {
      value = this[symbols.expect].output
        .clone()
        .text(value, out === "stderr" ? "error" : undefined);
    }
    this[symbols.output].push(value);
  }

  [symbols.reset]() {
    this[symbols.output] = [];
  }

  [symbols.toString](format) {
    const lines = this[symbols.output];

    // early exit if there was no output
    if (lines.length === 0) return "";

    const output = this[symbols.expect].output.clone();
    // handle the first line
    output.append(lines[0]);
    // now add other lines with spaces between
    const remainingLines = lines.slice(1);
    for (const line of remainingLines) {
      output.nl().append(line);
    }
    return output.toString(format);
  }
}

InspectedConsole.symbols = symbols;

module.exports = InspectedConsole;
