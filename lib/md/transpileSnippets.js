const findUp = require("find-up");
const path = require("path");

const canEvaluate = require("./canEvaluate");
const { prepareFlags } = require("./evaluateSnippets");
const resolve = require("../resolve");

function createTranspileTypescript(tsconfigPath) {
  const tsConfigJson = require(tsconfigPath);
  const tsConfigDir = path.dirname(tsconfigPath);
  const pkgJson = findUp.sync("package.json", { cwd: tsConfigDir });
  const tsModule = resolve.file(path.dirname(pkgJson), "typescript");
  const ts = require(tsModule);

  const transpileOptions = {
    compilerOptions: tsConfigJson.compileOptions
  };

  return code => {
    const result = ts.transpileModule(code, transpileOptions);
    return result.outputText;
  };
}

module.exports = function transpileSnippets(snippets, options) {
  options = options || {};
  const { transpileFn } = options;

  const snippetsForEval = snippets.filter(
    snippet => canEvaluate(snippet) && snippet.flags.evaluate
  );

  if (snippetsForEval.length === 0) {
    return;
  }

  const preambleSeparator =
    "\n//---------------------preamble----------------------\n";
  const blockSeparator =
    "\n//---------------------separator---------------------\n";
  const preambleSeparatorRegexp = `(?:^|\\n)${preambleSeparator.slice(1)}`;
  const separatorRegexp = new RegExp(
    `${preambleSeparatorRegexp}|${blockSeparator}`
  );

  // wrap the snippet code blocks prior to transpilation based on their flags
  const snippetCodeForTranspilation = snippetsForEval.map(snippet => {
    const flags = prepareFlags(snippet, options);
    if (flags.async) {
      return `(async function () {${snippet.code}})();`;
    } else if (flags.return) {
      return `(function () {${snippet.code}})();`;
    } else {
      return snippet.code;
    }
  });

  // execute transpilation of all the snippets
  const transpiledCode = transpileFn(
    `${preambleSeparator}${snippetCodeForTranspilation.join(blockSeparator)}`
  );

  const allBlocks = transpiledCode.split(separatorRegexp);

  // grab hold of any preamble added by the compiler
  const injectedCode = allBlocks[0];

  // unpack the transpiled code block for each snippet
  const transpiledBlocks = allBlocks.slice(1);

  for (const [i, transpiledSnippet] of transpiledBlocks.entries()) {
    snippetsForEval[i].transpiled = transpiledSnippet;
  }

  return injectedCode || null;
};

module.exports.createTranspileTypescript = createTranspileTypescript;
