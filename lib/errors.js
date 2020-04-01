const createError = require("createerror");

//  Configuration errors

exports.ConfigFileError = createError({
  name: "ConfigFileError"
});

exports.InplaceFileError = createError({
  name: "InplaceFileError"
});

exports.SourceFileError = createError({
  name: "SourceFileError"
});

exports.TargetFileError = createError({
  name: "TargetFileError"
});

// Runtime errors

exports.FileEvaluationError = createError({
  name: "FileEvaluationError"
});

exports.SnippetEvaluationError = createError({
  name: "SnippetEvaluationError"
});

// Error logic

exports.errorToInfo = function errorToInfo(e) {
  if (e.name === "FileEvaluationError") {
    const lines = [String(e), `snippets with errors:`];
    for (const [index, error] of Object.entries(e.data.errors)) {
      const { data } = error;
      lines.push(`  - [${index}] ${String(data.original)}`);
    }
    return lines.join("\n");
  }
  return process.env.DEBUG ? e.stack : String(e);
};
