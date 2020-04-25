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

exports.SnippetProcessingError = createError({
  name: "SnippetProcessingError"
});

// Error logic

exports.errorToInfo = function errorToInfo(e) {
  if (e.name === "FileEvaluationError") {
    const lines = [];
    for (const [index, error] of Object.entries(e.data.errors)) {
      const { data } = error;
      lines.push(`  - [${index}] ${String(data.original)}`);
    }
    return lines;
  }
  return null;
};

function errorToHeadline(e) {
  if (e.name === "FileEvaluationError") {
    return `${e.name}\nsnippets with errors:`;
  } else {
    return `${e.name}:`;
  }
}

exports.errorToOutput = function errorToOutput(e) {
  const lines = exports.errorToInfo(e);
  if (lines !== null) {
    lines.unshift(errorToHeadline(e));
    return lines.join("\n");
  }
  return process.env.DEBUG ? e.stack : String(e);
};
