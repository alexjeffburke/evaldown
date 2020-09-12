const buble = require("buble");
const expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
const expectNoSnapshot = require("unexpected");
const fsExtra = require("fs-extra");
const path = require("path");
const sinon = require("sinon");

const errors = require("../lib/errors");
const Evaldown = require("../lib/Evaldown");
const Stats = require("../lib/Stats");

const ORIGINAL_DIRNAME = __dirname;
const TESTDATA_PATH = path.join(__dirname, "..", "testdata");
const TESTDATA_OUTPUT_PATH = path.join(TESTDATA_PATH, "output");

function toLines(spy) {
  const lines = [];
  for (const call of spy.getCalls()) {
    const { args } = call;
    const msg = args.length > 0 ? args[0] : "";
    lines.push(`${msg}\n`);
  }
  return lines;
}

describe("Evaldown", () => {
  expect.addAssertion(
    "<string> [not] to be present on disk",
    async (expect, subject) => {
      await expect(
        () => fsExtra.pathExists(subject),
        "to be fulfilled with",
        !expect.flags.not
      );
    }
  );

  expect.addAssertion(
    "<string> to be present on disk with content satisfying <assertion>",
    async (expect, subject, value) => {
      expect.errorMode = "nested";
      await expect(subject, "to be present on disk");
      const content = await fsExtra.readFile(subject, "utf8");
      expect.errorMode = "nested";
      await expect.shift(content);

      return content;
    }
  );

  before(async () => {
    await fsExtra.ensureDir(TESTDATA_OUTPUT_PATH);
  });

  beforeEach(async () => {
    await fsExtra.emptyDir(TESTDATA_OUTPUT_PATH);
  });

  afterEach(() => {
    sinon.reset();
  });

  it("should be a function", () => {
    expect(Evaldown, "to be a function");
  });

  it("should export Markdown", () => {
    expect(Evaldown.Markdown, "to be a function");
  });

  it("should allow creating an instance", () => {
    expect(new Evaldown(), "to be an", Evaldown);
  });

  describe("processFiles()", function() {
    it("should generate files", async function() {
      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "expect.html");
      await expect(
        () => fsExtra.pathExists(expectedOutputFile),
        "to be fulfilled with",
        true
      );
    });

    it("should record success in the returned stats", async function() {
      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      const stats = await evaldown.processFiles();

      expect(stats, "to be a", Stats).and("to satisfy", {
        succeeded: 1,
        errored: 0
      });
    });
  });

  describe("with nested folders", () => {
    it("should generate the tree", async function() {
      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "nested"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(
        TESTDATA_OUTPUT_PATH,
        "child",
        "inner.html"
      );
      await expect(
        () => fsExtra.pathExists(expectedOutputFile),
        "to be fulfilled with",
        true
      );
    });
  });

  describe("with capture type selection", function() {
    it("should throw on an invalid format", () => {
      expect(
        () => {
          new Evaldown({ outputCapture: "foobar" });
        },
        "to throw",
        'Evaldown: Unsupported capture type "foobar"'
      );
    });

    it('should default to "return"', () => {
      const evaldown = new Evaldown({});

      expect(evaldown.capture, "to equal", "return");
    });

    it('should allow capturing "return"', async function() {
      const evaldown = new Evaldown({
        outputCapture: "return",
        sourcePath: path.join(TESTDATA_PATH, "capture-return"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(
        TESTDATA_OUTPUT_PATH,
        "captured.html"
      );
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <p>Testing output capturing.</p>
          <div class="code lang-javascript"><div><span style="color: #07a">return</span>&nbsp;<span style="color: #690">&quot;foo&quot;</span><span style="color: #999">;</span></div></div>

          <div class="output"><div><span style="color: #df5000">'foo'</span></div></div>

          <div class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;bar&quot;</span>&nbsp;<span style="color: #999">};</span></div><div><span style="color: #999">}</span></div><div>&nbsp;</div><div><span style="color: #708090">//&nbsp;objects&nbsp;are&nbsp;inspected&nbsp;too</span></div><div><span style="color: #07a">return</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></div>

          <div class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">'bar'</span>&nbsp;}</div></div>

        `
      );
    });

    it('should allow capturing "console"', async function() {
      const evaldown = new Evaldown({
        outputCapture: "console",
        sourcePath: path.join(TESTDATA_PATH, "capture-console"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "captured.html"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <p>Testing console capturing.</p>
          <div class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">log</span><span style="color: #999">(</span><span style="color: #690">&quot;hello,&nbsp;world!&quot;</span><span style="color: #999">);</span></div><div>console<span style="color: #999">.</span><span style="color: #DD4A68">error</span><span style="color: #999">(</span><span style="color: #690">&quot;foobar&quot;</span><span style="color: #999">);</span></div></div>

          <div class="output"><div><span style="color: #df5000">hello,&nbsp;world!</span></div><div><span style="color: red; font-weight: bold">foobar</span></div></div>

        `
      );
    });
  });

  describe("with output format selection", function() {
    it("should throw on an invalid format", () => {
      expect(
        () => {
          new Evaldown({ outputFormat: "foobar" });
        },
        "to throw",
        'Evaldown: Unsupported output format "foobar"'
      );
    });

    it('should allow outputting "inlined"', async function() {
      const evaldown = new Evaldown({
        outputFormat: "inlined",
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "expect.md");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          Asserts deep equality.

          <pre class="code lang-javascript"><div><span style="color: #07a">const</span>&nbsp;expect&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #DD4A68">require</span><span style="color: #999">(</span><span style="color: #690">'unexpected'</span><span style="color: #999">);</span></div><div>&nbsp;</div><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;a<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;b&quot;</span>&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;a<span style="color: #a67f59">:</span>&nbsp;<span style="color: #905">1234</span>&nbsp;<span style="color: #999">});</span></div><div><span style="color: #07a">var</span>&nbsp;now&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #07a">new</span>&nbsp;Date<span style="color: #999">();</span></div><div><span style="color: #DD4A68">expect</span><span style="color: #999">(</span>now<span style="color: #999">,</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;now<span style="color: #999">);</span></div><div><span style="color: #DD4A68">expect</span><span style="color: #999">(</span>now<span style="color: #999">,</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #07a">new</span>&nbsp;Date<span style="color: #999">(</span>now<span style="color: #999">.</span><span style="color: #DD4A68">getTime</span><span style="color: #999">()));</span></div><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;now<span style="color: #a67f59">:</span>&nbsp;now&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;now<span style="color: #a67f59">:</span>&nbsp;now&nbsp;<span style="color: #999">});</span></div></pre>

          For a lot of types a failing equality test results in a nice
          diff. Below you can see an object diff.

          <pre class="code lang-javascript"><div><span style="color: #07a">const</span>&nbsp;expect&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #DD4A68">require</span><span style="color: #999">(</span><span style="color: #690">'unexpected'</span><span style="color: #999">);</span></div><div>&nbsp;</div><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;text<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;foo!&quot;</span>&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;text<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;f00!&quot;</span>&nbsp;<span style="color: #999">});</span></div></pre>

          <pre class="output"><div><span style="color: red; font-weight: bold">expected</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">'foo!'</span>&nbsp;}&nbsp;<span style="color: red; font-weight: bold">to&nbsp;equal</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">'f00!'</span>&nbsp;}</div><div>&nbsp;</div><div>{</div><div>&nbsp;&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #555">text</span>:&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">'foo!'</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">should&nbsp;equal</span>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">'f00!'</span></div></div></div><div>&nbsp;</div><div><span style="background-color: red; color: white">foo</span><span style="color: red">!</span></div><div><span style="background-color: green; color: white">f00</span><span style="color: green">!</span></div></div></div></div></div><div>}</div></pre>

        `
      );
    });

    it('should allow outputting "markdown"', async function() {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "expect.md");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          Asserts deep equality.

          \`\`\`javascript
          const expect = require('unexpected');

          expect({ a: "b" }, "to equal", { a: 1234 });
          var now = new Date();
          expect(now, "to equal", now);
          expect(now, "to equal", new Date(now.getTime()));
          expect({ now: now }, "to equal", { now: now });
          \`\`\`

          For a lot of types a failing equality test results in a nice
          diff. Below you can see an object diff.

          \`\`\`javascript
          const expect = require('unexpected');

          expect({ text: "foo!" }, "to equal", { text: "f00!" });
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          expected { text: 'foo!' } to equal { text: 'f00!' }

          {
            text: 'foo!' // should equal 'f00!'
                         //
                         // -foo!
                         // +f00!
          }
          \`\`\`

        `
      );
    });
  });

  describe("with file globals", () => {
    it("should make the global available after require", async () => {
      function makeFunctionForFile() {
        const hasExpect = !!global.expect;

        return function() {
          return `woop ${hasExpect ? "woop" : "nope"}`;
        };
      }

      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "file-globals"),
        targetPath: TESTDATA_OUTPUT_PATH,
        filePreamble: await fsExtra.readFile(
          path.join(TESTDATA_PATH, "require", "expect.js"),
          "utf8"
        ),
        fileGlobals: {
          fileGlobalFunction: () => makeFunctionForFile()
        }
      });

      await evaldown.processFiles();

      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "example.md");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          Function fun.

          \`\`\`javascript
          return fileGlobalFunction();
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          'woop woop'
          \`\`\`

          \`\`\`javascript
          return \`still here ..\${fileGlobalFunction()}\`;
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          'still here ..woop woop'
          \`\`\`

        `
      );
    });
  });

  describe("with local module", () => {
    it("should require the module", async () => {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "local-module"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "example.md");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          \`\`\`js
          const foobar = require('./foobar');

          return foobar;
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          { foo: 'bar' }
          \`\`\`

        `
      );
    });
  });

  describe("with customised extensions", function() {
    it("should glob for the supplied extension", async function() {
      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "extensions"),
        sourceExtension: ".markdown",
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "expect.html");
      await expect(
        () => fsExtra.pathExists(expectedOutputFile),
        "to be fulfilled with",
        true
      );
    });

    it("should output the supplied target extension", async function() {
      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH,
        targetExtension: ".ko"
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "expect.ko");
      await expect(
        () => fsExtra.pathExists(expectedOutputFile),
        "to be fulfilled with",
        true
      );
    });
  });

  describe("with customised output wrapper", function() {
    it("should include the template function result in the output", async function() {
      const evaldown = new Evaldown({
        wrapOutput: output => `<!-- SILLY OLD MARKER -->\n${output}`,
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      const targetFilePath = path.join(TESTDATA_OUTPUT_PATH, "expect.html");
      const targetSource = await fsExtra.readFile(targetFilePath, "utf8");
      expect.withError(
        () => {
          expect(targetSource, "to start with", "<!-- SILLY OLD MARKER -->");
        },
        () => {
          expect.fail({
            message: "The updated output was not in the target file."
          });
        }
      );
    });

    it("should call the template function passing output and context", async function() {
      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "example"),
        targetPath: TESTDATA_OUTPUT_PATH
      });
      sinon.spy(evaldown, "wrapper");

      await evaldown.processFiles();

      expect(evaldown.wrapper, "to have calls satisfying", [
        [
          expect.it("to be a string"),
          {
            sourceFile: "expect.md",
            targetFile: "expect.html"
          }
        ]
      ]);
    });
  });

  describe("when operating in inplace mode", function() {
    it("should make changes to the source markdown", async function() {
      const sourceFile = "expect.md";
      const sourceFilePath = path.join(TESTDATA_PATH, "example", sourceFile);
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      await new Evaldown({
        inplace: true,
        sourcePath: path.dirname(sourceFilePath),
        targetPath: TESTDATA_OUTPUT_PATH
      }).processFile(sourceFile);

      try {
        const updatedSource = await fsExtra.readFile(sourceFilePath, "utf8");
        expect.withError(
          () => {
            expect(updatedSource, "not to equal", originalSource);
          },
          () => {
            expect.fail({ message: "The source file was not updated." });
          }
        );
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });

    it("should not write an output file", async function() {
      const sourceFile = "expect.md";
      const sourceFilePath = path.join(TESTDATA_PATH, "example", sourceFile);
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      await new Evaldown({
        inplace: true,
        sourcePath: path.dirname(sourceFilePath),
        targetPath: TESTDATA_OUTPUT_PATH
      }).processFile(sourceFile);

      try {
        const targetFilePath = path.join(TESTDATA_OUTPUT_PATH, "example.html");
        expect(targetFilePath, "not to be present on disk");
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });
  });

  describe("when operating in update mode", function() {
    it("should output the correct updated markdown", async () => {
      const sourceFile = "expect.md";
      const sourceFilePath = path.join(TESTDATA_PATH, "example", sourceFile);
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      await new Evaldown({
        update: true,
        sourcePath: path.dirname(sourceFilePath),
        targetPath: TESTDATA_OUTPUT_PATH
      }).processFile(sourceFile);

      try {
        await expect(
          sourceFilePath,
          "to be present on disk with content satisfying",
          "to equal snapshot",
          expect.unindent`
            Asserts deep equality.

            \`\`\`javascript
            const expect = require('unexpected');

            expect({ a: "b" }, "to equal", { a: 1234 });
            var now = new Date();
            expect(now, "to equal", now);
            expect(now, "to equal", new Date(now.getTime()));
            expect({ now: now }, "to equal", { now: now });
            \`\`\`

            For a lot of types a failing equality test results in a nice
            diff. Below you can see an object diff.

            \`\`\`javascript
            const expect = require('unexpected');

            expect({ text: "foo!" }, "to equal", { text: "f00!" });
            \`\`\`

            <!-- evaldown output:true -->

            \`\`\`
            expected { text: 'foo!' } to equal { text: 'f00!' }

            {
              text: 'foo!' // should equal 'f00!'
                           //
                           // -foo!
                           // +f00!
            }
            \`\`\`

          `
        );
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });
  });

  describe("when operating in validate mode", function() {
    it("should log to stdout with snippet failures", async () => {
      const _cons = {
        log: sinon.stub().named("console.log")
      };
      const sourcePath = path.join(TESTDATA_PATH, "validate");

      await new Evaldown({
        validate: true,
        sourcePath,
        targetPath: TESTDATA_OUTPUT_PATH
      }).validateFiles({
        _cons,
        pwd: sourcePath
      });

      expect(toLines(_cons.log), "to equal snapshot", [
        "  \n",
        "  failing.md\n",
        "  - [1] javascript evaluation and output comparison FAILED\n",
        "SnippetValidationError: \n\x1b[31m\x1b[1mexpected\x1b[22m\x1b[39m \x1b[36m'\\'foo\\''\x1b[39m \x1b[31m\x1b[1mto equal\x1b[22m\x1b[39m \x1b[36m'\"bar\"'\x1b[39m\n\n\x1b[41m\x1b[30m'foo'\x1b[39m\x1b[49m\n\x1b[42m\x1b[30m\"bar\"\x1b[39m\x1b[49m\n\n\n",
        "  - [2] javascript evaluation FAILED\n",
        "SnippetValidationError: snippet evaluation resulted in an error\n\n",
        "  passing.md\n",
        "  - [1] javascript evaluation and output comparison PASSED\n",
        "  skipping.md\n",
        "  - [0] javascript evaluation SKIPPED\n"
      ]);
    });

    it("should return stats with snippet failures", async () => {
      const sourceFile = "failing.md";
      const sourcePath = path.join(TESTDATA_PATH, "validate");

      const result = await new Evaldown({
        validate: true,
        sourcePath,
        targetPath: TESTDATA_OUTPUT_PATH
      })._validateFiles({
        pwd: sourcePath,
        reporter: "none",
        markdownFiles: [sourceFile]
      });

      await expect(
        result,
        "to exhaustively satisfy",
        new Stats({
          errored: 2,
          errorEntries: [
            {
              file: "failing.md",
              error: expect.it("to be an", errors.FileProcessingError)
            }
          ]
        })
      );
    });
  });

  describe("when performing evaluation", () => {
    it("should set __dirname as an absolute path to the source file directory", async function() {
      const sourceFile = "dirname/example.md";

      const evaldown = new Evaldown({
        sourcePath: TESTDATA_PATH,
        targetPath: TESTDATA_OUTPUT_PATH,
        outputFormat: "markdown"
      });

      await evaldown.processFile(sourceFile);

      // check the file was created
      const expectedInputFile = path.join(TESTDATA_PATH, sourceFile);
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, sourceFile);
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to contain",
        `'${path.dirname(expectedInputFile)}'`
      );
    });

    it("should reset __dirname after evaluation", async function() {
      const sourceFile = "dirname/example.md";

      const evaldown = new Evaldown({
        sourcePath: TESTDATA_PATH,
        targetPath: TESTDATA_OUTPUT_PATH,
        outputFormat: "markdown"
      });

      await evaldown.processFile(sourceFile);

      // check __dirname has its original value
      expect(__dirname, "to equal", ORIGINAL_DIRNAME);
    });
  });

  describe("when serialising values", () => {
    it('should inspect all values for capture mode "return"', async function() {
      const evaldown = new Evaldown({
        outputFormat: "inlined",
        outputCapture: "return",
        sourcePath: path.join(TESTDATA_PATH, "capture-return"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "types.md");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <pre class="code lang-javascript"><div><span style="color: #07a">return</span>&nbsp;<span style="color: #690">&quot;foobar&quot;</span><span style="color: #999">;</span></div></pre>

          <pre class="output"><div><span style="color: #df5000">'foobar'</span></div></pre>

          <pre class="code lang-javascript"><div><span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">'bar'</span>&nbsp;<span style="color: #999">};</span></div></pre>

          <pre class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">'bar'</span>&nbsp;}</div></pre>

          <pre class="code lang-javascript"><div><span style="color: #07a">return</span>&nbsp;<span style="color: #07a">null</span><span style="color: #999">;</span></div></pre>

          <pre class="output"><div><span style="color: #0086b3">null</span></div></pre>

          <pre class="code lang-javascript"><div><span style="color: #07a">return</span>&nbsp;<span style="color: #07a">undefined</span><span style="color: #999">;</span></div></pre>

          <pre class="output">&nbsp;</pre>

        `
      );
    });

    it('should inspect all values for capture mode "console"', async function() {
      const evaldown = new Evaldown({
        outputFormat: "inlined",
        outputCapture: "console",
        sourcePath: path.join(TESTDATA_PATH, "capture-console"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "types.md");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <pre class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">log</span><span style="color: #999">(</span><span style="color: #690">&quot;foobar&quot;</span><span style="color: #999">);</span></div></pre>

          <pre class="output"><div><span style="color: #df5000">foobar</span></div></pre>

          <pre class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">info</span><span style="color: #999">({</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">'bar'</span>&nbsp;<span style="color: #999">});</span></div></pre>

          <pre class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">'bar'</span>&nbsp;}</div></pre>

          <pre class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">warn</span><span style="color: #999">(</span><span style="color: #07a">null</span><span style="color: #999">);</span></div></pre>

          <pre class="output"><div><span style="color: #0086b3">null</span></div></pre>

          <pre class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">error</span><span style="color: #999">(</span><span style="color: #07a">undefined</span><span style="color: #999">);</span></div></pre>

          <pre class="output"><div><span style="color: #0086b3">undefined</span></div></pre>

        `
      );
    });
  });

  describe("when a file contains erroring snippets", () => {
    it("should not write out the file", async () => {
      const evaldown = new Evaldown({
        outputCapture: "console",
        sourcePath: path.join(TESTDATA_PATH, "some-errors"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      const expectedOutputFile = path.join(
        TESTDATA_OUTPUT_PATH,
        "example.html"
      );
      await expect(expectedOutputFile, "not to be present on disk");
    });

    it("should record the error in the returned stats", async () => {
      const evaldown = new Evaldown({
        outputCapture: "console",
        sourcePath: path.join(TESTDATA_PATH, "some-errors"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      const stats = await evaldown.processFiles();

      expect(stats, "to be a", Stats).and("to satisfy", {
        succeeded: 0,
        errored: 1
      });
    });
  });

  describe("when using a transpiler", () => {
    it("should fail to transpile", async function() {
      const sourcePath = path.join(TESTDATA_PATH, "transpile-error");
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath,
        targetPath: TESTDATA_OUTPUT_PATH,
        transpileFn: content => buble.transform(content).code
      });

      const result = await evaldown.processFiles();

      expect(result, "to satisfy", {
        errored: 1,
        errorEntries: [
          {
            error: {
              name: "CompileError",
              message: /^Transforming tagged template strings is not fully supported./
            }
          }
        ]
      });
    });
  });

  describe("when using typescript", () => {
    it("should transpile and execute", async function() {
      const sourcePath = path.join(TESTDATA_PATH, "typescript");
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath,
        targetPath: TESTDATA_OUTPUT_PATH,
        tsconfigPath: path.join(sourcePath, "tsconfig.json")
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "example.md");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          \`\`\`ts
          function greet(thing: string) {
            return \`Greetings, \${thing}\`
          }

          return greet("foo");
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          'Greetings, foo'
          \`\`\`

        `
      );
    });
  });

  describe("when using per-snippet flags", () => {
    it("should allow mixed captures outputting as 'html'", async () => {
      const evaldown = new Evaldown({
        outputFormat: "html",
        sourcePath: path.join(TESTDATA_PATH, "mixed-captures"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(
        TESTDATA_OUTPUT_PATH,
        "example.html"
      );
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <p>Mixed capturing.</p>
          <p>First there is a return value:</p>
          <div class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;bar&quot;</span>&nbsp;<span style="color: #999">};</span></div><div><span style="color: #999">}</span></div><div>&nbsp;</div><div><span style="color: #708090">//&nbsp;objects&nbsp;are&nbsp;inspected&nbsp;too</span></div><div><span style="color: #07a">return</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></div>

          <div class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">'bar'</span>&nbsp;}</div></div>

          <p>Then we try logging to the console:</p>
          <div class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">log</span><span style="color: #999">(</span><span style="color: #690">'foo&nbsp;bar&nbsp;baz'</span><span style="color: #999">);</span></div><div>console<span style="color: #999">.</span><span style="color: #DD4A68">warn</span><span style="color: #999">(</span><span style="color: #690">'..as&nbsp;is&nbsp;customary&nbsp;when&nbsp;testing'</span><span style="color: #999">);</span></div></div>

          <div class="output"><div><span style="color: #df5000">foo&nbsp;bar&nbsp;baz</span></div><div><span style="color: red; font-weight: bold">..as&nbsp;is&nbsp;customary&nbsp;when&nbsp;testing</span></div></div>

        `
      );
    });

    it('should allow mixed captures outputting as "inlined"', async () => {
      const evaldown = new Evaldown({
        outputFormat: "inlined",
        sourcePath: path.join(TESTDATA_PATH, "mixed-captures"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          Mixed capturing.

          First there is a return value:

          <pre class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;bar&quot;</span>&nbsp;<span style="color: #999">};</span></div><div><span style="color: #999">}</span></div><div>&nbsp;</div><div><span style="color: #708090">//&nbsp;objects&nbsp;are&nbsp;inspected&nbsp;too</span></div><div><span style="color: #07a">return</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></pre>

          <pre class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">'bar'</span>&nbsp;}</div></pre>

          Then we try logging to the console:

          <pre class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">log</span><span style="color: #999">(</span><span style="color: #690">'foo&nbsp;bar&nbsp;baz'</span><span style="color: #999">);</span></div><div>console<span style="color: #999">.</span><span style="color: #DD4A68">warn</span><span style="color: #999">(</span><span style="color: #690">'..as&nbsp;is&nbsp;customary&nbsp;when&nbsp;testing'</span><span style="color: #999">);</span></div></pre>

          <pre class="output"><div><span style="color: #df5000">foo&nbsp;bar&nbsp;baz</span></div><div><span style="color: red; font-weight: bold">..as&nbsp;is&nbsp;customary&nbsp;when&nbsp;testing</span></div></pre>

        `
      );
    });

    it('should allow mixed captures outputting as "markdown"', async () => {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "mixed-captures"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          Mixed capturing.

          First there is a return value:

          <!-- evaldown return:true -->
          \`\`\`javascript
          function doSomething() {
            return { foo: "bar" };
          }

          // objects are inspected too
          return doSomething();
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          { foo: 'bar' }
          \`\`\`

          Then we try logging to the console:

          <!-- evaldown console:true -->
          \`\`\`javascript
          console.log('foo bar baz');
          console.warn('..as is customary when testing');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          foo bar baz
          ..as is customary when testing
          \`\`\`

        `
      );
    });

    it('should allow hiding snippets outputting as "markdown"', async () => {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "flag-hide"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          \`\`\`javascript
          return global.doSomething();
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          { foo: 'bar' }
          \`\`\`

        `
      );
    });

    it('should allow hiding snippets outputting as "inlined"', async () => {
      const evaldown = new Evaldown({
        outputFormat: "inlined",
        sourcePath: path.join(TESTDATA_PATH, "flag-hide"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        // check only the latter two snippets were included
        expect.unindent`
          <pre class="code lang-javascript"><div><span style="color: #07a">return</span>&nbsp;global<span style="color: #999">.</span><span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></pre>

          <pre class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">'bar'</span>&nbsp;}</div></pre>

        `
      );
    });

    it("should allow hiding snippets but still capture their output", async () => {
      const sourceFile = "dirname/example.md";

      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: TESTDATA_PATH,
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFile(sourceFile);

      const expectedInputFile = path.join(TESTDATA_PATH, sourceFile);
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, sourceFile);
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to contain",
        `'${path.dirname(expectedInputFile)}'`
      );
    });

    it("should avoid hiding snippets when operating inplace", async () => {
      const sourceFile = "example.md";
      const sourceFilePath = path.join(TESTDATA_PATH, "flag-hide", sourceFile);
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      const evaldown = new Evaldown({
        inplace: true,
        outputFormat: "markdown",
        sourcePath: path.dirname(sourceFilePath),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      try {
        await expect(
          sourceFilePath,
          "to be present on disk with content satisfying",
          "to equal snapshot",
          expect.unindent`
            <!-- evaldown hide:true -->
            \`\`\`javascript
            function doSomething() {
              return { foo: "bar" };
            }

            global.doSomething = doSomething;
            \`\`\`

            \`\`\`javascript
            return global.doSomething();
            \`\`\`

            <!-- evaldown output:true -->

            \`\`\`
            { foo: 'bar' }
            \`\`\`

          `
        );
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });

    it("should allow ignoring snippets", async () => {
      const evaldown = new Evaldown({
        outputFormat: "inlined",
        sourcePath: path.join(TESTDATA_PATH, "flag-ignore"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <!-- evaldown ignore:true -->
          \`\`\`javascript
          function doSomething() {
            return { foo: "bar" };
          }

          return doSomething();
          \`\`\`

          \`\`\`output
          Ignore me
          \`\`\`

          <pre class="code lang-javascript"><div><span style="color: #07a">return</span>&nbsp;<span style="color: #690">'baz'</span><span style="color: #999">;</span></div></pre>

          <pre class="output"><div><span style="color: #df5000">'baz'</span></div></pre>

          <!-- evaldown ignore:true -->
          <pre>
          \`\`\`javascript
          return 'baz';
          \`\`\`

          \`\`\`output
          While still ignoring me
          \`\`\`
          </pre>

        `
      );
    });

    it("should avoid ignoring snippets when operating inplace", async () => {
      const sourceFile = "example.md";
      const sourceFilePath = path.join(
        TESTDATA_PATH,
        "flag-ignore",
        sourceFile
      );
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      const evaldown = new Evaldown({
        inplace: true,
        sourcePath: path.dirname(sourceFilePath),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      try {
        await expect(
          sourceFilePath,
          "to be present on disk with content satisfying",
          "to equal snapshot",
          expect.unindent`
            <!-- evaldown ignore:true -->
            \`\`\`javascript
            function doSomething() {
              return { foo: "bar" };
            }

            return doSomething();
            \`\`\`

            \`\`\`output
            { foo: 'bar' }
            \`\`\`

            \`\`\`javascript
            return 'baz';
            \`\`\`

            <!-- evaldown output:true -->

            \`\`\`
            'baz'
            \`\`\`

            <!-- evaldown ignore:true -->
            <pre>
            \`\`\`javascript
            return 'baz';
            \`\`\`

            \`\`\`output
            'baz'
            \`\`\`
            </pre>

          `
        );
      } finally {
        await fsExtra.writeFile(sourceFilePath, originalSource, "utf8");
      }
    });

    it("should allow skipping snippets but still render them coloured", async () => {
      const evaldown = new Evaldown({
        outputFormat: "inlined",
        sourcePath: path.join(TESTDATA_PATH, "flag-evaluate"),
        targetPath: TESTDATA_OUTPUT_PATH,
        fileGlobals: {
          expect: () => {
            // setup an expect the the colour of numbers customised
            const clone = expectNoSnapshot.clone();
            clone.use(require("magicpen-prism"));
            clone.use(pen => {
              pen.installTheme("html", {
                prismSymbol: ["#66D9EF", "bold"]
              });
            });
            return clone;
          }
        }
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <pre class="code lang-javascript"><div><span style="color: #07a">const</span>&nbsp;num&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #66D9EF; font-weight: bold">123</span><span style="color: #999">;</span></div></pre>

        `
      );
    });

    it("should allow snippets receiving a fresh context", async () => {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "flag-freshContext"),
        targetPath: TESTDATA_OUTPUT_PATH,
        filePreamble: await fsExtra.readFile(
          path.join(TESTDATA_PATH, "require", "expect.js"),
          "utf8"
        )
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          \`\`\`javascript
          expect.addAssertion('<any> to foo', (expect, subject) => {
            expect(Object.keys(subject), 'to contain', 'foo');
          })
          \`\`\`

          <!-- evaldown freshContext:true -->

          \`\`\`javascript
          expect({ foo: null }, 'to foo');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          Unknown assertion 'to foo', did you mean: 'to be ok'
          \`\`\`

          \`\`\`javascript
          expect({ foo: null }, 'to foo');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`

          \`\`\`

        `
      );
    });

    it("should allow snippets flagged as output with a custom lang", async () => {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        outputCapture: "console",
        sourcePath: path.join(TESTDATA_PATH, "flag-output"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          Testing output capturing.

          \`\`\`javascript
          console.log('{ text-decoration: none }')
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`css
          { text-decoration: none }
          \`\`\`

        `
      );
    });

    it("should allow mixed context with expect from require", async () => {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "mixed-context"),
        targetPath: TESTDATA_OUTPUT_PATH,
        filePreamble: await fsExtra.readFile(
          path.join(TESTDATA_PATH, "require", "expect.js"),
          "utf8"
        )
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <!-- evaldown persist:true -->

          \`\`\`javascript
          class Person {
            constructor(foo) {
              this.foo = !!foo;
            }
          }
          \`\`\`

          \`\`\`javascript
          expect.addType({
            name: 'Person',
            base: 'object',
            identify: v => v instanceof Person
          });

          expect.addAssertion('<Person> to foo', (expect, subject) => {
            expect(subject.foo, 'to be true');
          })

          expect(new Person(false), 'to foo');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          expected Person({ foo: false }) to foo
          \`\`\`

          <!-- evaldown freshContext:true -->

          \`\`\`javascript
          expect.addType({
            name: 'Person',
            base: 'object',
            identify: v => v instanceof Person,
            prefix: output => output.text('PERSON:'),
            suffix: output => output.text('')
          });

          expect.addAssertion('<Person> to foo', (expect, subject) => {
            expect(subject.foo, 'to be true');
          })

          expect(new Person(false), 'to foo');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          expected PERSON: foo: false to foo
          \`\`\`

        `
      );
    });

    it("should allow mixed context with expect from fileGlobals", async () => {
      const evaldown = new Evaldown({
        outputFormat: "markdown",
        sourcePath: path.join(TESTDATA_PATH, "mixed-context"),
        targetPath: TESTDATA_OUTPUT_PATH,
        fileGlobals: {
          expect: () => expectNoSnapshot.clone()
        }
      });

      await evaldown.processFiles();

      await expect(
        path.join(TESTDATA_OUTPUT_PATH, "example.md"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <!-- evaldown persist:true -->

          \`\`\`javascript
          class Person {
            constructor(foo) {
              this.foo = !!foo;
            }
          }
          \`\`\`

          \`\`\`javascript
          expect.addType({
            name: 'Person',
            base: 'object',
            identify: v => v instanceof Person
          });

          expect.addAssertion('<Person> to foo', (expect, subject) => {
            expect(subject.foo, 'to be true');
          })

          expect(new Person(false), 'to foo');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          expected Person({ foo: false }) to foo
          \`\`\`

          <!-- evaldown freshContext:true -->

          \`\`\`javascript
          expect.addType({
            name: 'Person',
            base: 'object',
            identify: v => v instanceof Person,
            prefix: output => output.text('PERSON:'),
            suffix: output => output.text('')
          });

          expect.addAssertion('<Person> to foo', (expect, subject) => {
            expect(subject.foo, 'to be true');
          })

          expect(new Person(false), 'to foo');
          \`\`\`

          <!-- evaldown output:true -->

          \`\`\`
          expected PERSON: foo: false to foo
          \`\`\`

        `
      );
    });
  });
});
