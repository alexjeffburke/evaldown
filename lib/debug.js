// Allows using DEBUG=true instead of debug-module syntax
if (process.env.DEBUG === "true") {
  process.env.DEBUG = "evaldown*";
}

module.exports = require("debug")("evaldown");
