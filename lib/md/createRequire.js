const Module = require("module");
const path = require("path");

module.exports = function createRequire(filepath) {
  const filename = path.join(filepath, "noop.js");
  // eslint-disable-next-line node/no-deprecated-api
  return (Module.createRequire || Module.createRequireFromPath)(filename);
};
