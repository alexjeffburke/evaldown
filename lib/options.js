const path = require("path");

const errors = require("./errors");

const loadConfig = config => {
  try {
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
