const fs = require("fs").promises;
const fsExtra = require("fs-extra");
const glob = require("fast-glob");
const path = require("path");

const debug = require("./debug").extend("Evaldown");
const errors = require("./errors");
const Markdown = require("./md/Markdown");

const DEFAULT_SOURCE_EXTENSION = ".md";

const formats = {
  html: {
    defaultExtension: ".html",
    magicpenFormat: "html",
    generateOutput: async (maker, evalOpts) =>
      (await maker.withInlinedExamples(evalOpts)).toHtml()
  },
  inlined: {
    defaultExtension: ".md",
    magicpenFormat: "html",
    generateOutput: async (maker, evalOpts) =>
      (await maker.withInlinedExamples(evalOpts)).toString()
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
  nowrap: true,
  return: true
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
      commentMarker,
      fileGlobals,
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
      typeof outputCapture === "string" ? outputCapture : "return";
    if (!Evaldown.captures[captureName]) {
      throw new Error(`Evaldown: Unsupported capture type "${outputCapture}"`);
    }

    const marker =
      typeof commentMarker === "string" ? commentMarker : "evaldown";
    const wrapper = typeof wrapOutput === "function" ? wrapOutput : noopWrapper;

    this.capture = captureName;
    this.format = Evaldown.formats[formatName];
    this.formatName = formatName;
    this.marker = marker;
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

    // evaluation configuration
    this.fileGlobals =
      typeof fileGlobals === "object" && fileGlobals ? fileGlobals : {};
  }

  async makeOutputForContent(fileContent, format) {
    const maker = new Markdown(fileContent, {
      marker: this.marker
    });

    // set basic options for evaluation
    const evalOpts = { capture: this.capture };
    // set globals to be attached if supplied
    if (this.fileGlobals) {
      evalOpts.fileGlobals = this.fileGlobals;
    }

    const targetOutput = await format.generateOutput(maker, evalOpts);

    let sourceOutput;
    if (!this.update) {
      sourceOutput = null;
    } else if (this.formatName === "markdown") {
      sourceOutput = targetOutput;
    } else {
      const markdownFormat = Evaldown.formats.markdown;
      sourceOutput = await markdownFormat.generateOutput(maker, evalOpts);
    }

    return { targetOutput, sourceOutput };
  }

  async prepareFile(sourceFile) {
    debug('preparing source file "%s"', sourceFile);

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

    return {
      sourceBaseName,
      sourceDirName,
      sourceFilePath,
      ...output
    };
  }

  async processFile(sourceFile) {
    const {
      sourceBaseName,
      sourceDirName,
      sourceFilePath,
      sourceOutput,
      targetOutput
    } = await this.prepareFile(sourceFile);

    debug('processing source file "%s"', sourceFile);

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
        this.wrapper(targetOutput, context),
        "utf8"
      );
    } catch (e) {
      throw new errors.TargetFileError(e);
    }

    if (this.update) {
      await fs.writeFile(sourceFilePath, sourceOutput, "utf8");
    }
  }

  async processFiles() {
    debug('reading files for processing "%s"', this.sourcePath);

    const markdownFiles = await glob(`**/*${this.sourceExtension}`, {
      cwd: this.sourcePath
    });

    const stats = {
      succeeded: 0,
      errored: 0
    };

    for (const file of markdownFiles) {
      try {
        await this.processFile(file);
        stats.succeeded += 1;
      } catch (e) {
        stats.errored += 1;
        debug('unable to process "%s" with: %s', file, errors.errorToInfo(e));
      }
    }

    debug('finished processing "%s"', this.sourcePath);

    return stats;
  }

  async updateFile(sourceFile) {
    const { sourceFilePath, sourceOutput } = await this.prepareFile(sourceFile);

    debug('updating source file "%s"', sourceFile);

    try {
      await fs.writeFile(sourceFilePath, sourceOutput, "utf8");
    } catch (e) {
      throw new errors.InplaceFileError(e);
    }
  }
}

Evaldown.captures = captures;
Evaldown.formats = formats;
Evaldown.Markdown = Markdown;

module.exports = Evaldown;
