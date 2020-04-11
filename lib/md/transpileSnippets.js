module.exports = function transpileSnippets(snippets, transpileFn) {
  const snippetsForEval = snippets.filter(function(snippet) {
    return snippet.lang === "javascript" && snippet.flags.evaluate;
  });

  if (snippetsForEval.length === 0) {
    return;
  }

  const preambleSeparator =
    "\n//---------------------preamble----------------------\n";
  const blockSeparator =
    "\n//---------------------separator---------------------\n";
  const separatorRegexp = new RegExp(`${preambleSeparator}|${blockSeparator}`);

  // wrap the snippet code blocks prior to transpilation based on their flags
  const snippetCodeForTranspilation = snippetsForEval.map(snippet =>
    snippet.flags.async ? `(function () {${snippet.code}})();` : snippet.code
  );

  // execute transpilation of all the snippets
  const transpiledCode = transpileFn(
    `${preambleSeparator}${snippetCodeForTranspilation.join(blockSeparator)}`
  );

  const allBlocks = transpiledCode.split(separatorRegexp);

  // grab hold of any preamble added by the compiler
  const injectedCode = transpiledCode[0].trimRight();

  // unpack the transpiled code block for each snippet
  const transpiledBlocks = allBlocks.slice(1);

  for (const [i, transpiledSnippet] of transpiledBlocks.entries()) {
    snippetsForEval[i].transpiled = transpiledSnippet;
  }

  return injectedCode || null;
};
