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
