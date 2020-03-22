const symbols = {
  expect: Symbol("expect"),
  format: Symbol("format"),
  line: Symbol("line"),
  output: Symbol("output"),
  toString: Symbol("toSting")
};

function makeBoundConsoleMethod(out, con) {
  return function(first, ...rest) {
    if (!first) first = "";
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
  constructor(expect, format) {
    this[symbols.expect] = null;
    this[symbols.format] = format;
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

  [symbols.line](out, value) {
    if (typeof value !== "string") {
      value = this[symbols.expect].inspect(value, 6, this[symbols.format]);
    } else {
      value = this[symbols.expect].output
        .clone()
        .text(value, out === "stderr" ? "error" : undefined);
    }
    this[symbols.output].push(value);
  }

  [symbols.toString](format) {
    const lines = this[symbols.output];

    // early exit if there was no output
    if (lines.length === 0) return "";

    const output = this[symbols.expect].output.clone();
    // handle the first line
    output.append(lines.shift());
    // now add other lines with spaces between
    for (const line of lines) {
      output.nl().append(line);
    }
    return output.toString(format);
  }
}

InspectedConsole.symbols = symbols;

module.exports = InspectedConsole;
