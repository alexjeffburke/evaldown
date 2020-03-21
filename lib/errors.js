const createError = require("createerror");

exports.SourceFileError = createError({
  name: "SourceFileError"
});

exports.TargetFileError = createError({
  name: "TargetFileError"
});
