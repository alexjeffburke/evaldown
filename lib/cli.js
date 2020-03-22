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

function validatePathInOpts(pwd, opts, pathKey) {
  let pathValue = opts[pathKey];
  if (!pathValue) {
    throw new Error(`Missing "${pathKey}"`);
  } else if (!path.isAbsolute(pathValue)) {
    pathValue = path.join(pwd, pathValue);
  }
  return pathValue;
}

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
