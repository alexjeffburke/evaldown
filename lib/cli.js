const fs = require("fs");
const fsExtra = require("fs-extra");
const path = require("path");

const Evaldown = require("./Evaldown");

function validateIsFile(pathValue, pathKey) {
  let maybeDir;
  try {
    maybeDir = fs.statSync(pathValue);
  } catch (e) {
    throw new Error(`Inaccessible "${pathKey}"`);
  }
  if (!maybeDir.isFile()) {
    throw new Error(`Invalid "${pathKey}"`);
  }
}

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

const byPathCmdValidators = {
  file: validateIsFile,
  files: validateIsDir
};

exports.byPath = async (pwd, opts) => {
  const sourcePath = validatePath(pwd, opts._[0], "path");
  let cmd = null;

  for (const [name, validate] of Object.entries(byPathCmdValidators)) {
    try {
      validate(sourcePath);
      cmd = name;
      break;
    } catch {}
  }

  if (cmd === null) {
    throw new Error(`Invalid "path"`);
  } else if (cmd === "files") {
    opts.sourcePath = path.relative(pwd, sourcePath);
  } else {
    opts.sourcePath = ".";
  }

  return exports[cmd](pwd, opts);
};

exports.file = async (pwd, opts) => {
  const cons = opts._cons || console;
  const sourceFile = validatePath(pwd, opts._[0], "file");
  validateIsFile(sourceFile, "sourceFile");

  opts.outputFormat = opts.format;
  if (!opts.outputFormat || opts.inplace) {
    opts.outputFormat = "markdown";
  }

  const evaldown = new Evaldown({
    ...opts,
    sourcePath: pwd
  });
  const sourceRelativePath = path.relative(pwd, sourceFile);
  if (opts.inplace || opts.update) {
    await evaldown.processFile(sourceRelativePath);
  }
  if (!opts.inplace) {
    const { targetOutput } = await evaldown.prepareFile(sourceRelativePath);
    cons.log(targetOutput);
  }
};

exports.files = async (pwd, opts) => {
  const sourcePath = validatePathInOpts(pwd, opts, "sourcePath");
  validateIsDir(sourcePath, "sourcePath");

  let targetPath;
  try {
    targetPath = validatePathInOpts(pwd, opts, "targetPath");
    // check that the parent directory exists
    validateIsDir(path.join(targetPath, ".."), "targetPath");
    // create the output directory if necessary
    await fsExtra.ensureDir(targetPath);
  } catch (e) {
    if (opts.inplace) {
      targetPath = null;
    } else {
      throw e;
    }
  }

  opts.outputFormat = opts.format;

  const evaldown = new Evaldown({
    ...opts,
    sourcePath,
    targetPath
  });
  return evaldown.processFiles();
};
