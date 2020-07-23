const EventEmitter = require("events");
const fs = require("fs");
const fsAsync = require("fs").promises;
const fsExtra = require("fs-extra");
const glob = require("fast-glob");
const path = require("path");

const debug = require("./debug").extend("Evaldown");
const errors = require("./errors");
const Markdown = require("./md/Markdown");
const Stats = require("./Stats");

const DEFAULT_SOURCE_EXTENSION = ".md";
const MOCHA_HTML_DOCUMENT = `<html>
  <head>
    <link href="index.css" rel="stylesheet">
  <head>
  <body>
    <div id="mocha"></div>
  </body>
</html>
`;

const formats = {
  html: {
    defaultExtension: ".html",
    magicpenFormat: "html",
    generateOutput: async maker => (await maker.withInlinedExamples()).toHtml()
  },
  inlined: {
    defaultExtension: ".md",
    magicpenFormat: "html",
    generateOutput: async maker => (await maker.withInlinedExamples()).toText()
  },
  markdown: {
    defaultExtension: ".md",
    magicpenFormat: "text",
    generateOutput: async maker => (await maker.withUpdatedExamples()).toText()
  }
};

const captures = {
  console: true,
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
      filePreamble,
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
    const preamble =
      typeof filePreamble === "string" ? filePreamble : undefined;
    const wrapper = typeof wrapOutput === "function" ? wrapOutput : noopWrapper;

    this.capture = captureName;
    this.format = Evaldown.formats[formatName];
    this.formatName = formatName;
    this.marker = marker;
    this.preamble = preamble;
    this.wrapper = wrapper;

    // target handling
    this.inplace = !!options.inplace;
    this.update = !!options.update;

    // path handling
    this.requirePath = options.requirePath;
    this.sourcePath = options.sourcePath;
    this.targetPath = options.targetPath;
    this.tsconfigPath = options.tsconfigPath;

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

  async makeOutputForContent(maker) {
    const targetOutput = await this.format.generateOutput(maker);

    let sourceOutput;
    if (!(this.inplace || this.update)) {
      sourceOutput = null;
    } else if (this.formatName === "markdown") {
      sourceOutput = targetOutput;
    } else {
      const markdownFormat = Evaldown.formats.markdown;
      sourceOutput = await markdownFormat.generateOutput(maker);
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
      fileContent = await fsAsync.readFile(sourceFilePath, "utf8");
    } catch (e) {
      throw new errors.SourceFileError(e);
    }

    const markdown = new Markdown(fileContent, {
      marker: this.marker,
      format: this.formatName,
      inplace: this.inplace,
      preamble: this.preamble,
      requirePath: this.requirePath,
      tsconfigPath: this.tsconfigPath
    });

    const pwdPath = path.join(this.sourcePath, sourceDirName);
    // set basic options for evaluation
    const evalOpts = { pwdPath, capture: this.capture };
    // set globals to be attached if supplied
    if (this.fileGlobals) {
      evalOpts.fileGlobals = this.fileGlobals;
    }
    // trigger evaluation for this bag of options
    await markdown.evaluate(evalOpts);

    return {
      markdown,
      sourceFile,
      sourceBaseName,
      sourceDirName,
      sourceFilePath
    };
  }

  async prepareProcessed(prepared) {
    const processed = {
      ...prepared,
      ...(await this.makeOutputForContent(prepared.markdown))
    };

    if (!this.inplace && this.targetPath) {
      await this.writeFile(processed);
    }

    if (this.inplace || this.update) {
      await this.updateFile(processed);
    }

    return processed;
  }

  async processFile(sourceFile) {
    debug('processing source file "%s"', sourceFile);

    const prepared = await this.prepareFile(sourceFile);
    return this.prepareProcessed(prepared);
  }

  async processFiles() {
    debug('reading files for processing "%s"', this.sourcePath);

    const markdownFiles = await glob(`**/*${this.sourceExtension}`, {
      cwd: this.sourcePath
    });

    const stats = new Stats();

    for (const file of markdownFiles) {
      try {
        await this.processFile(file);
        stats.addSuccess(file);
      } catch (e) {
        stats.addError(file, e);
        debug('unable to process "%s" with: %s', file, errors.errorToOutput(e));
      }
    }

    debug('finished processing "%s"', this.sourcePath);

    return stats;
  }

  async _validateFile(sourceFile, emitter) {
    debug('validating source file "%s"', sourceFile);

    const test = {
      title: sourceFile,
      body: "",
      duration: 0,
      fullTitle: () => sourceFile,
      titlePath: () => [sourceFile],
      isPending: () => false,
      currentRetry: () => 0,
      slow: () => 0
    };

    emitter.emit("test", test);

    const executionResult = {
      status: "",
      error: null
    };

    try {
      const { markdown } = await this.prepareFile(sourceFile);
      markdown.validateSnippets();
      executionResult.status = "pass";
    } catch (e) {
      debug(
        'unable to process "%s" with: %s',
        sourceFile,
        errors.errorToOutput(e)
      );
      executionResult.status = "fail";
      executionResult.error = e;
    }

    if (executionResult.status === "pending") {
      // identify it as such
      test.isPending = () => true;
    }

    switch (executionResult.status) {
      case "pass":
        debug("execution passed for %s", sourceFile);
        emitter.emit("pass", test);
        break;
      case "fail":
        debug(
          'unable to process "%s" with: %s',
          sourceFile,
          errors.errorToOutput(executionResult.error)
        );
        emitter.emit("fail", test, executionResult.error);
        break;
      case "pending":
        debug("execution skipped for %s", sourceFile);
        emitter.emit("pending", test);
        break;
    }

    emitter.emit("test end", test);
  }

  async _validateFiles(options) {
    options = options || {};
    options.reporter = options.reporter || "console";

    const { pwd, markdownFiles } = options;

    options.reportDir = options.reportDir
      ? path.resolve(options.reportDir)
      : path.resolve(pwd, "evaldown");

    // begin setting up a "mocha-esque" runner
    const emitter = new EventEmitter();

    const stats = {
      tests: markdownFiles.length,
      duration: 0, // support epilogue generation
      passes: 0,
      failures: 0,
      skipped: 0
    };
    // hold a reference to stats as it is taken by reporters
    emitter.stats = stats;

    // keep a running count of executed tests to support progress
    emitter.total = 0;

    // record the errors that occur in internal Stats format
    const errorEntries = [];

    emitter.on("pass", () => (stats.passes += 1));
    emitter.on("fail", (test, error) => {
      stats.failures += 1;
      errorEntries.push({ file: test.title, error });
    });
    emitter.on("pending", () => (stats.skipped += 1));

    let reporter;
    if (options.reporter !== "console" && options.reporter !== "none") {
      try {
        if (options.reporter === "html") {
          const jsdom = require("jsdom");
          const dom = new jsdom.JSDOM(MOCHA_HTML_DOCUMENT);
          // disable canvas
          dom.window.HTMLCanvasElement.prototype.getContext = null;
          global.window = dom.window;
          global.document = dom.window.document;
          global.fragment = html => new dom.window.DocumentFragment(html);

          emitter.on("end", () => {
            if (!fs.existsSync(options.reportDir)) {
              fsExtra.mkdirpSync(options.reportDir);
            }
            fsExtra.copySync(
              require.resolve("mocha/mocha.css"),
              path.join(options.reportDir, "index.css")
            );
            fs.writeFileSync(
              path.join(options.reportDir, "index.html"),
              dom.window.document.documentElement.outerHTML
            );
          });
        }
        const Reporter = require(`mocha/lib/reporters/${options.reporter}`);
        reporter = new Reporter(emitter);
      } catch (e) {
        // ignore
      }
    }

    if ((!reporter && options.reporter === "console") || options.ci) {
      const cons = options._cons || console;
      const print = options.ci ? cons.warn : cons.log;

      emitter.once("start", () => print());
      emitter.on("pass", test => print(`  ${test.title} PASSED`));
      emitter.on("fail", test => print(`  ${test.title} FAILED`));
      emitter.on("fail", (_, error) => print(`${error}\n`));
      emitter.on("pending", test => print(`  ${test.title} SKIPPED`));
    }

    emitter.emit("start");

    for (const file of markdownFiles) {
      emitter.total += 1;
      await this._validateFile(file, emitter);
    }

    emitter.emit("end");

    debug("finished validating %d files", markdownFiles.length);

    return new Stats({
      succeeded: stats.passes,
      errored: stats.failures,
      errorEntries
    });
  }

  async validateFiles(options) {
    debug('reading files for validation "%s"', this.sourcePath);

    const markdownFiles = await glob(`**/*${this.sourceExtension}`, {
      cwd: this.sourcePath
    });

    return this._validateFiles({ ...options, markdownFiles });
  }

  async updateFile(prepared) {
    const { sourceFile, sourceFilePath, sourceOutput } = prepared;

    debug('updating source file "%s"', sourceFile);

    try {
      await fsAsync.writeFile(sourceFilePath, sourceOutput, "utf8");
    } catch (e) {
      throw new errors.InplaceFileError(e);
    }
  }

  async writeFile(prepared) {
    const {
      sourceFile,
      sourceBaseName,
      sourceDirName,
      targetOutput
    } = prepared;

    debug('writing target for source file "%s"', sourceFile);

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
      await fsAsync.writeFile(
        targetFilePath,
        this.wrapper(targetOutput, context),
        "utf8"
      );
    } catch (e) {
      throw new errors.TargetFileError(e);
    }
  }
}

Evaldown.captures = captures;
Evaldown.formats = formats;
Evaldown.Markdown = Markdown;

module.exports = Evaldown;
