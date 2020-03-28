const fs = require("fs").promises;
const fsExtra = require("fs-extra");
const glob = require("fast-glob");
const path = require("path");

const debug = require("./debug").extend("Evaldown");
const errors = require("./errors");
const InspectedConsole = require("./InspectedConsole");
const Markdown = require("./md/Markdown");

const consoleSymbols = InspectedConsole.symbols;
const DEFAULT_SOURCE_EXTENSION = ".md";

const formats = {
  html: {
    defaultExtension: ".html",
    magicpenFormat: "html",
    generateOutput: async (maker, evalOpts) =>
      (await maker.withInlinedExamples(evalOpts)).toHtml()
  },
  markdown: {
    defaultExtension: ".md",
    magicpenFormat: "text",
    generateOutput: async (maker, evalOpts) =>
      (await maker.withUpdatedExamples(evalOpts)).toString()
  }
};

const captures = {
  console: true,
  expect: true,
  output: true
};

function isValidExtension(ext) {
  return typeof ext === "string" && /^\.([a-z]\.)*[a-z]/;
}

function noopWrapper(output) {
  return output;
}

class Evaldown {
  constructor(options) {
    options = options || {};

    const {
      outputCapture,
      outputFormat,
      wrapOutput,
      sourceExtension,
      targetExtension
    } = options;

    const formatName = typeof outputFormat === "string" ? outputFormat : "html";
    if (!Evaldown.formats[formatName]) {
      throw new Error(`Evaldown: Unsupported output format "${outputFormat}"`);
    }

    const captureName =
      typeof outputCapture === "string" ? outputCapture : "output";
    if (!Evaldown.captures[captureName]) {
      throw new Error(`Evaldown: Unsupported capture type "${outputCapture}"`);
    }

    const wrapper = typeof wrapOutput === "function" ? wrapOutput : noopWrapper;

    this.capture = captureName;
    this.format = formats[formatName];
    this.wrapper = wrapper;
    this.update = !!options.update;

    // path handling
    this.sourcePath = options.sourcePath;
    this.targetPath = options.targetPath;

    // extension handling
    this.sourceExtension = isValidExtension(sourceExtension)
      ? sourceExtension
      : DEFAULT_SOURCE_EXTENSION;
    this.targetExtension = isValidExtension(targetExtension)
      ? targetExtension
      : this.format.defaultExtension;
  }

  async makeOutputForContent(fileContent, format) {
    const maker = new Markdown(fileContent);

    let evalCons;
    let evalOpts;
    switch (this.capture) {
      case "console":
        evalCons = new InspectedConsole(maker, format);
        evalOpts = {
          globals: {
            console: evalCons
          }
        };
        break;
      case "expect":
        evalOpts = {
          globals: {
            expect: maker.baseExpect.clone()
          }
        };
        break;
      case "output":
        evalOpts = { captureOutput: true };
        break;
    }

    let targetOutput = await format.generateOutput(maker, evalOpts);
    if (this.capture === "console") {
      targetOutput = evalCons[consoleSymbols.toString](format.magicpenFormat);
    }

    let sourceMarkdown;
    if (!this.update) {
      sourceMarkdown = null;
    } else if (this.outputFormat === "markdown") {
      sourceMarkdown = targetOutput;
    } else {
      const markdownFormat = Evaldown.formats.markdown;
      sourceMarkdown = await markdownFormat.generateOutput(maker, evalOpts);
    }

    return { targetOutput, sourceMarkdown };
  }

  async processFile(sourceFile) {
    const sourceBaseName = path.basename(sourceFile, this.sourceExtension);
    const sourceDirName = path.dirname(sourceFile);
    const sourceFilePath = path.join(this.sourcePath, sourceFile);

    let fileContent;
    try {
      fileContent = await fs.readFile(sourceFilePath, "utf8");
    } catch (e) {
      throw new errors.SourceFileError(e);
    }

    const output = await this.makeOutputForContent(fileContent, this.format);
    const targetFile = path.join(
      sourceDirName,
      `${sourceBaseName}${this.targetExtension}`
    );
    const targetFilePath = path.join(this.targetPath, targetFile);
    try {
      await fsExtra.ensureDir(path.dirname(targetFilePath));

      const context = {
        sourceFile,
        targetFile
      };
      await fs.writeFile(
        targetFilePath,
        this.wrapper(output.targetOutput, context),
        "utf8"
      );
    } catch (e) {
      throw new errors.TargetFileError(e);
    }

    if (this.update) {
      await fs.writeFile(sourceFilePath, output.sourceMarkdown, "utf8");
    }
  }

  async processFiles() {
    const markdownFiles = await glob(`**/*${this.sourceExtension}`, {
      cwd: this.sourcePath
    });

    for (const file of markdownFiles) {
      try {
        await this.processFile(file);
      } catch (e) {
        debug('Unable to process "%s" with %s: %s', file, e.name, e.message);
      }
    }
  }
}

Evaldown.captures = captures;
Evaldown.formats = formats;
Evaldown.Markdown = Markdown;

module.exports = Evaldown;
