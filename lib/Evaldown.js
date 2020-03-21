const fs = require("fs").promises;
const glob = require("fast-glob");
const path = require("path");

const errors = require("./errors");
const UnexpectedMarkdown = require("unexpected-markdown");

const DEFAULT_SOURCE_EXTENSION = ".md";
const DEFAULT_TARGET_EXTENSION = ".html";

function isValidExtension(ext) {
  return typeof ext === "string" && /^\.([a-z]\.)*[a-z]/;
}

class Evaldown {
  constructor(options) {
    options = options || {};

    const { sourceExtension, targetExtension } = options;

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
    const targetFilePath = path.join(
      this.targetPath,
      `${sourceBaseName}${this.targetExtension}`
    );
    try {
      await fs.writeFile(targetFilePath, output.targetHtml, "utf8");
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
        continue;
      }
    }
  }
}

module.exports = Evaldown;
