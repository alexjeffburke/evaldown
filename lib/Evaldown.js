const fs = require("fs").promises;
const glob = require("fast-glob");
const path = require("path");

const debug = require("./debug").extend("Evaldown");
const errors = require("./errors");
const UnexpectedMarkdown = require("unexpected-markdown");

const DEFAULT_SOURCE_EXTENSION = ".md";
const DEFAULT_TARGET_EXTENSION = ".html";

function isValidExtension(ext) {
  return typeof ext === "string" && /^\.([a-z]\.)*[a-z]/;
}

function noopTemplate(output) {
  return output;
}

class Evaldown {
  constructor(options) {
    options = options || {};

    const { template, sourceExtension, targetExtension } = options;

    this.template = typeof template === "function" ? template : noopTemplate;
    this.update = !!options.update;
    this.sourcePath = options.sourcePath;
    this.sourceExtension = isValidExtension(sourceExtension)
      ? sourceExtension
      : DEFAULT_SOURCE_EXTENSION;
    this.targetPath = options.targetPath;
    this.targetExtension = isValidExtension(targetExtension)
      ? targetExtension
      : DEFAULT_TARGET_EXTENSION;
  }

  async makeOutputForContent(fileContent) {
    const maker = new UnexpectedMarkdown(fileContent);
    const targetHtml = await maker.toHtml();

    let sourceMarkdown;
    if (this.update) {
      sourceMarkdown = (await maker.withUpdatedExamples()).toString();
    } else {
      sourceMarkdown = null;
    }

    return { targetHtml, sourceMarkdown };
  }

  async processFile(sourceFile) {
    const sourceBaseName = path.basename(sourceFile, this.sourceExtension);
    const sourceFilePath = path.join(this.sourcePath, sourceFile);

    let fileContent;
    try {
      fileContent = await fs.readFile(sourceFilePath, "utf8");
    } catch (e) {
      throw new errors.SourceFileError(e);
    }

    const output = await this.makeOutputForContent(fileContent);
    const targetFile = `${sourceBaseName}${this.targetExtension}`;
    const targetFilePath = path.join(this.targetPath, targetFile);
    try {
      const context = {
        sourceFile,
        targetFile
      };
      await fs.writeFile(
        targetFilePath,
        this.template(output.targetHtml, context),
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

module.exports = Evaldown;
