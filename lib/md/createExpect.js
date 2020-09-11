module.exports = function(options) {
  options = { ...options };

  const unexpected = options.unexpected || require("unexpected");
  const expect = unexpected.clone();
  expect.output.preferredWidth = 80;

  if (typeof options.format === "string") {
    expect.outputFormat(options.format);
  }

  if (typeof options.preferredWidth === "number") {
    expect.output.preferredWidth = options.preferredWidth;
  }

  if (typeof options.indentationWidth === "number") {
    expect.output.indentationWidth = options.indentationWidth;
  }
  expect.installPlugin(require("magicpen-prism"));

  if (options.theme) {
    expect.installPlugin(options.theme);
  }

  return expect;
};
