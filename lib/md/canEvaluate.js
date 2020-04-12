module.exports = function canEvaluate(snippet) {
  return snippet.lang === "javascript" || snippet.lang === "typescript";
};
