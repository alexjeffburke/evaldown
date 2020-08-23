const fs = require("fs");
const path = require("path");

const errors = require("./errors");
const resolve = require("./resolve");

// Decoding

const maybeValidateAndPreloadRequire = (cwd, opts) => {
  if (!opts.require) {
    return null;
  }

  const modulePath = resolve.file(cwd, opts.require);
  return {
    content: fs.readFileSync(modulePath, "utf8"),
    path: path.dirname(modulePath)
  };
};

exports.decodeOptions = function decodeOptions(cwd, opts) {
  const decodedOpts = {};

  let preloaded;
  if ((preloaded = maybeValidateAndPreloadRequire(cwd, opts))) {
    const { content, path } = preloaded;
    decodedOpts.filePreamble = content;
    decodedOpts.requirePath = path;
  }

  return decodedOpts;
};

// Loading

const loadConfig = config => {
  try {
    if (path.extname(config) !== ".js") {
      throw new Error('config file must have extension "js"');
    }
    if (!/^evaldown\./.test(path.basename(config))) {
      throw new Error('config file must start with "evaldown."');
    }
    const opts = require(config);
    const pwd = path.dirname(require.resolve(config));
    return { pwd, opts };
  } catch (e) {
    throw new errors.ConfigFileError(e);
  }
};

const locateConfigOption = argv => {
  const configIndex = argv.findIndex(item => item === "--config");
  if (configIndex > -1 && configIndex < argv.length - 1) {
    return argv[configIndex + 1];
  } else {
    return null;
  }
};

exports.loadOptions = function loadOptions(cwd, argv) {
  const config = locateConfigOption(argv);
  return config ? loadConfig(path.resolve(cwd, config)) : {};
};
