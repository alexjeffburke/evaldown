const fs = require("fs").promises;
const fsExtra = require("fs-extra");
const glob = require("fast-glob");
const path = require("path");

const debug = require("./debug").extend("Evaldown");
const errors = require("./errors");
const UnexpectedMarkdown = require("unexpected-markdown");

const DEFAULT_SOURCE_EXTENSION = ".md";

const formats = {
  html: {
    defaultExtension: ".html",
    generateOutput: (maker, evalOpts) => maker.toHtml(evalOpts)
  },
  markdown: {
    defaultExtension: ".md",
    generateOutput: async (maker, evalOpts) =>
      (await maker.withUpdatedExamples(evalOpts)).toString()
  }
};

function isValidExtension(ext) {
  return typeof ext === "string" && /^\.([a-z]\.)*[a-z]/;
}

function noopTemplate(output) {
  return output;
}

class Evaldown {
  constructor(options) {
    options = options || {};

    const {
      template,
      outputFormat,
      sourceExtension,
      targetExtension
    } = options;

    const formatName = typeof outputFormat === "string" ? outputFormat : "html";
    if (!Evaldown.formats[formatName]) {
      throw new Error(`Evaldown: Unsupported output format "${outputFormat}"`);
    }

    this.format = formats[formatName];
    this.template = typeof template === "function" ? template : noopTemplate;
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
    const maker = new UnexpectedMarkdown(fileContent);
    const evalOpts = { captureOutput: true };

    const targetOutput = await format.generateOutput(maker, evalOpts);

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
        this.template(output.targetOutput, context),
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

Evaldown.formats = formats;

module.exports = Evaldown;
