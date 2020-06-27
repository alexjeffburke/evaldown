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

exports.snippetErrorsToLines = function snippetErrorsToLines(snippetErrors) {
  const lines = [];
  for (const [index, error] of Object.entries(snippetErrors)) {
    const { data } = error;
    lines.push(`  - [${index}] ${String(data.original)}`);
  }
  return lines;
};

exports.snippetErrorsToMsg = function snippetErrorsToMsg(snippetErrors) {
  const lines = exports.snippetErrorsToLines(snippetErrors);
  lines.unshift("\n  snippets with errors:");
  return lines.join("\n");
};

exports.errorToInfo = function errorToInfo(e) {
  if (e.name === "FileEvaluationError") {
    return exports.snippetErrorsToLines(e.data.errors);
  }
  return null;
};

exports.errorToOutput = function errorToOutput(e) {
  return process.env.DEBUG ? e.stack : String(e);
};
