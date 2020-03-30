const fs = require("fs");
const fsExtra = require("fs-extra");
const path = require("path");

const Evaldown = require("./Evaldown");

function validateIsDir(pathValue, pathKey) {
  let maybeDir;
  try {
    maybeDir = fs.statSync(pathValue);
  } catch (e) {
    throw new Error(`Inaccessible "${pathKey}"`);
  }
  if (!maybeDir.isDirectory()) {
    throw new Error(`Invalid "${pathKey}"`);
  }
}

function validatePath(pwd, pathValue, pathKey) {
  if (!pathValue) {
    throw new Error(`Missing "${pathKey}"`);
  } else if (!path.isAbsolute(pathValue)) {
    pathValue = path.join(pwd, pathValue);
  }
  return pathValue;
}

function validatePathInOpts(pwd, opts, pathKey) {
  return validatePath(pwd, opts[pathKey], pathKey);
}

exports.file = async (pwd, opts) => {
  const cons = opts._cons || console;
  const sourceFile = validatePath(pwd, opts._[0], "file");

  opts.outputFormat = opts.outputFormat || "markdown";

  const evaldown = new Evaldown({
    ...opts,
    sourcePath: pwd
  });
  const sourceRelativePath = path.relative(pwd, sourceFile);
  if (opts.update) {
    await evaldown.updateFile(sourceRelativePath);
  } else {
    const { targetOutput } = await evaldown.prepareFile(sourceRelativePath);
    cons.log(targetOutput);
  }
};

exports.files = async (pwd, opts) => {
  const sourcePath = validatePathInOpts(pwd, opts, "sourcePath");
  validateIsDir(sourcePath, "sourcePath");

  const targetPath = validatePathInOpts(pwd, opts, "targetPath");
  // check that the parent directory exists
  validateIsDir(path.join(targetPath, ".."), "targetPath");
  // create the output directory if necessary
  await fsExtra.ensureDir(targetPath);

  const evaldown = new Evaldown({
    ...opts,
    sourcePath,
    targetPath
  });
  return evaldown.processFiles();
};
