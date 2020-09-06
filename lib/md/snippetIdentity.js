exports.canEvaluate = function canEvaluate(snippet) {
  return snippet.lang === "javascript" || snippet.lang === "typescript";
};

exports.holdsOutput = function holdsOutput(snippet) {
  // defaulted if absent for check/validate
  return (snippet.flags || {}).output;
};
