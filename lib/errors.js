const createError = require("createerror");

exports.ConfigFileError = createError({
  name: "ConfigFileError"
});

exports.SourceFileError = createError({
  name: "SourceFileError"
});

exports.TargetFileError = createError({
  name: "TargetFileError"
});
