const fs = require("fs").promises;
const glob = require("fast-glob");
const path = require("path");

const errors = require("./errors");
const UnexpectedMarkdown = require("unexpected-markdown");

class Evaldown {
  constructor(options) {
    options = options || {};

    this.update = !!options.update;
    this.sourcePath = options.sourcePath;
    this.targetPath = options.targetPath;
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

  async processFile(sourceFile, sourceBaseName) {
    const sourceFilePath = path.join(this.sourcePath, sourceFile);

    let fileContent;
    try {
      fileContent = await fs.readFile(sourceFilePath, "utf8");
    } catch (e) {
      throw new errors.SourceFileError(e);
    }

    const output = await this.makeOutputForContent(fileContent);
    const targetFilePath = path.join(this.targetPath, `${sourceBaseName}.html`);
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
    const markdownFiles = await glob("**/*.md", { cwd: this.sourcePath });

    for (const file of markdownFiles) {
      try {
        await this.processFile(file, path.basename(file, ".md"));
      } catch (e) {
        continue;
      }
    }
  }
}

module.exports = Evaldown;
