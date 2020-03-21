const fs = require("fs").promises;
const glob = require("fast-glob");
const path = require("path");
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

  async processFiles() {
    const markdownFiles = await glob("**/*.md", { cwd: this.sourcePath });

    for (const file of markdownFiles) {
      const sourceBaseName = path.basename(file, ".md");
      const sourceFilePath = path.join(this.sourcePath, file);

      let fileContent;
      try {
        fileContent = await fs.readFile(sourceFilePath, "utf8");
      } catch (e) {
        continue;
      }

      const output = await this.makeOutputForContent(fileContent);
      const targetFilePath = path.join(
        this.targetPath,
        `${sourceBaseName}.html`
      );
      await fs.writeFile(targetFilePath, output.targetHtml, "utf8");

      if (this.update) {
        await fs.writeFile(sourceFilePath, output.sourceMarkdown, "utf8");
      }
    }
  }
}

module.exports = Evaldown;
