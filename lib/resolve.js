const Module = require("module");
const path = require("path");

exports.file = (dir, moduleId) => {
  const fromFile = path.join(dir, "noop.js");
  return Module._resolveFilename(moduleId, {
    id: fromFile,
    filename: fromFile,
    paths: Module._nodeModulePaths(dir)
  });
};
