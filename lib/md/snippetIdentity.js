exports.canEvaluate = function canEvaluate(snippet) {
  return snippet.lang === "javascript" || snippet.lang === "typescript";
};

exports.holdsOutput = function holdsOutput(snippet) {
  return snippet.lang === "output";
};
