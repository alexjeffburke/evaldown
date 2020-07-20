const errors = require("./errors");

class Stats {
  constructor(options) {
    this.succeeded = 0;
    this.errored = 0;
    this.errorEntries = [];

    if (typeof options === "object" && options !== null) {
      Object.assign(this, options);
    }
  }

  addError(file, error) {
    this.errored += 1;
    this.errorEntries.push({ file, error });
  }

  addSuccess(file) {
    this.succeeded += 1;
  }

  toJSON() {
    const { succeeded, errored } = this;
    return {
      total: succeeded + errored,
      succeeded,
      errored
    };
  }

  toReport() {
    const stats = this.toJSON();
    const lines = [];

    lines.push(
      `processed ${stats.total} file${stats.total > 1 ? "s" : ""} ${
        stats.errored > 0 ? "with errors..." : "without errors"
      }`
    );

    if (stats.errored > 0) {
      lines.push("");
      for (const { file, error } of this.errorEntries) {
        const errorInfo = errors.errorToInfo(error);
        if (errorInfo === null) {
          lines.push(`"${file}" ${String(error)}`);
          continue;
        } else {
          lines.push(`"${file}" ${error.name}:`);
          lines.push(...errorInfo);
        }
      }
    }

    return lines.join("\n");
  }
}

module.exports = Stats;
