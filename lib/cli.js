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

function maybeValidateTsconfigPath(pwd, opts) {
  if (!opts.tsconfigPath) {
    return;
  }

  const tsconfigPath = validatePathInOpts(pwd, opts, "tsconfigPath");
  validateIsFile(tsconfigPath, "tsconfigPath");
  return tsconfigPath;
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
  const cnsle = opts._cons || console;
  const sourceFile = validatePath(pwd, opts._[0], "file");
  validateIsFile(sourceFile, "sourceFile");

  opts.tsconfigPath = maybeValidateTsconfigPath(pwd, opts);

  Object.assign(opts, Evaldown.decodeOptions(pwd, opts));

  opts.outputCapture = opts.capture;
  opts.outputFormat = opts.format;
  if (!opts.outputFormat || opts.inplace) {
    opts.outputFormat = "markdown";
  }

  const evaldown = new Evaldown({
    ...opts,
    sourcePath: pwd
  });
  const sourceRelativePath = path.relative(pwd, sourceFile);

  if (opts.validate) {
    await evaldown._validateFiles({
      _cons: cnsle,
      pwd,
      ci: opts.ci,
      reporter: opts.reporter,
      markdownFiles: [sourceRelativePath]
    });
  } else {
    const { targetOutput } = await evaldown.processFile(sourceRelativePath);
    if (!opts.inplace) {
      cnsle.log(targetOutput);
    }
  }
};

exports.files = async (pwd, opts) => {
  const cnsle = opts._cons || console;
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
    if (opts.inplace || opts.validate) {
      targetPath = null;
    } else {
      throw e;
    }
  }

  opts.tsconfigPath = maybeValidateTsconfigPath(pwd, opts);

  Object.assign(opts, Evaldown.decodeOptions(pwd, opts));

  opts.outputCapture = opts.capture;
  opts.outputFormat = opts.format;

  const evaldown = new Evaldown({
    ...opts,
    sourcePath,
    targetPath
  });
  let stats;
  if (opts.validate) {
    stats = await evaldown.validateFiles({
      _cons: cnsle,
      pwd,
      ci: opts.ci,
      reporter: opts.reporter
    });
  } else {
    stats = await evaldown.processFiles();
    cnsle.error(stats.toReport());
  }
  return stats.toJSON();
};
