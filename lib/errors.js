const createError = require("createerror");

//  Configuration errors

exports.ConfigFileError = createError({
  name: "ConfigFileError"
});

exports.SourceFileError = createError({
  name: "SourceFileError"
});

exports.TargetFileError = createError({
  name: "TargetFileError"
});

// Runtime errors

exports.EvaluationError = createError({
  name: "EvaluationError"
});
