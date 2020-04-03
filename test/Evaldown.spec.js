const expect = require("unexpected")
  .clone()
  .use(require("unexpected-sinon"))
  .use(require("unexpected-snapshot"));
const fsExtra = require("fs-extra");
const path = require("path");
const sinon = require("sinon");

const Evaldown = require("../lib/Evaldown");

const TESTDATA_PATH = path.join(__dirname, "..", "testdata");
const TESTDATA_OUTPUT_PATH = path.join(TESTDATA_PATH, "output");

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

      expect(stats, "to equal", {
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
          <div class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;bar&quot;</span>&nbsp;<span style="color: #999">};</span></div><div><span style="color: #999">}</span></div><div>&nbsp;</div><div><span style="color: #708090">//&nbsp;objects&nbsp;are&nbsp;inspected&nbsp;too</span></div><div><span style="color: #07a">return</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></div>

          <div class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">&#39;bar&#39;</span>&nbsp;}</div></div>

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
        path.join(TESTDATA_OUTPUT_PATH, "strings.html"),
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <p>Testing console capturing.</p>
          <div class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">log</span><span style="color: #999">(</span><span style="color: #690">&quot;hello,&nbsp;world!&quot;</span><span style="color: #999">);</span></div><div>console<span style="color: #999">.</span><span style="color: #DD4A68">error</span><span style="color: #999">(</span><span style="color: #690">&quot;foobar&quot;</span><span style="color: #999">);</span></div></div>

          <div class="output"><div>hello,&nbsp;world!</div><div><span style="color: red; font-weight: bold">foobar</span></div></div>

        `
      );
    });

    it('should allow capturing "nowrap"', async function() {
      const evaldown = new Evaldown({
        outputCapture: "nowrap",
        sourcePath: path.join(TESTDATA_PATH, "capture-nowrap"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(TESTDATA_OUTPUT_PATH, "scope.html");
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <p>Testing output capturing.</p>
          <div class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">fooer</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #690">&quot;f00&quot;</span><span style="color: #999">;</span></div><div><span style="color: #999">}</span></div></div>

          <div class="code lang-javascript"><div><span style="color: #07a">const</span>&nbsp;assert&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #DD4A68">require</span><span style="color: #999">(</span><span style="color: #690">&quot;assert&quot;</span><span style="color: #999">);</span></div><div>process<span style="color: #999">.</span>env<span style="color: #999">.</span><span style="color: #905">NODE_DISABLE_COLORS</span>&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #690">&#39;1&#39;</span><span style="color: #999">;</span></div><div>&nbsp;</div><div>assert<span style="color: #999">.</span><span style="color: #DD4A68">strictEqual</span><span style="color: #999">(</span><span style="color: #DD4A68">fooer</span><span style="color: #999">(),</span>&nbsp;<span style="color: #690">&quot;foo&quot;</span><span style="color: #999">);</span></div></div>

          <div class="output"><div><span style="color: red; font-weight: bold">Input&nbsp;A&nbsp;expected&nbsp;to&nbsp;strictly&nbsp;equal&nbsp;input&nbsp;B:</span></div><div><span style="color: red; font-weight: bold">+&nbsp;expected&nbsp;-&nbsp;actual</span></div><div>&nbsp;</div><div><span style="color: red; font-weight: bold">-&nbsp;&#39;f00&#39;</span></div><div><span style="color: red; font-weight: bold">+&nbsp;&#39;foo&#39;</span></div></div>

        `
      );
    });

    describe("when the selection is done per-snippet", () => {
      it("should capture each type specified", async () => {
        const evaldown = new Evaldown({
          outputCapture: "nowrap",
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
            <!-- evaldown return:true -->
            <div class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;bar&quot;</span>&nbsp;<span style="color: #999">};</span></div><div><span style="color: #999">}</span></div><div>&nbsp;</div><div><span style="color: #708090">//&nbsp;objects&nbsp;are&nbsp;inspected&nbsp;too</span></div><div><span style="color: #07a">return</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></div>

            <div class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">&#39;bar&#39;</span>&nbsp;}</div></div>

            <p>Then we try logging to the console:</p>
            <!-- evaldown console:true -->
            <div class="code lang-javascript"><div>console<span style="color: #999">.</span><span style="color: #DD4A68">log</span><span style="color: #999">(</span><span style="color: #690">&#39;foo&nbsp;bar&nbsp;baz&#39;</span><span style="color: #999">);</span></div><div>console<span style="color: #999">.</span><span style="color: #DD4A68">warn</span><span style="color: #999">(</span><span style="color: #690">&#39;..as&nbsp;is&nbsp;customary&nbsp;when&nbsp;testing&#39;</span><span style="color: #999">);</span></div></div>

            <div class="output"><div>foo&nbsp;bar&nbsp;baz</div><div><span style="color: red; font-weight: bold">..as&nbsp;is&nbsp;customary&nbsp;when&nbsp;testing</span></div></div>

          `
        );
      });
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

          <div class="code lang-javascript"><div><span style="color: #07a">const</span>&nbsp;expect&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #DD4A68">require</span><span style="color: #999">(</span><span style="color: #690">'unexpected'</span><span style="color: #999">);</span></div><div>&nbsp;</div><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;a<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;b&quot;</span>&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;a<span style="color: #a67f59">:</span>&nbsp;<span style="color: #905">1234</span>&nbsp;<span style="color: #999">});</span></div><div><span style="color: #07a">var</span>&nbsp;now&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #07a">new</span>&nbsp;Date<span style="color: #999">();</span></div><div><span style="color: #DD4A68">expect</span><span style="color: #999">(</span>now<span style="color: #999">,</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;now<span style="color: #999">);</span></div><div><span style="color: #DD4A68">expect</span><span style="color: #999">(</span>now<span style="color: #999">,</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #07a">new</span>&nbsp;Date<span style="color: #999">(</span>now<span style="color: #999">.</span><span style="color: #DD4A68">getTime</span><span style="color: #999">()));</span></div><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;now<span style="color: #a67f59">:</span>&nbsp;now&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;now<span style="color: #a67f59">:</span>&nbsp;now&nbsp;<span style="color: #999">});</span></div></div>

          For a lot of types a failing equality test results in a nice
          diff. Below you can see an object diff.

          <div class="code lang-javascript"><div><span style="color: #07a">const</span>&nbsp;expect&nbsp;<span style="color: #a67f59">=</span>&nbsp;<span style="color: #DD4A68">require</span><span style="color: #999">(</span><span style="color: #690">'unexpected'</span><span style="color: #999">);</span></div><div>&nbsp;</div><div><span style="color: #DD4A68">expect</span><span style="color: #999">({</span>&nbsp;text<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;foo!&quot;</span>&nbsp;<span style="color: #999">},</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #999">{</span>&nbsp;text<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;f00!&quot;</span>&nbsp;<span style="color: #999">});</span></div></div>

          <div class="output"><div><span style="color: red; font-weight: bold">expected</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">'foo!'</span>&nbsp;}&nbsp;<span style="color: red; font-weight: bold">to&nbsp;equal</span>&nbsp;{&nbsp;<span style="color: #555">text</span>:&nbsp;<span style="color: #df5000">'f00!'</span>&nbsp;}</div><div>&nbsp;</div><div>{</div><div>&nbsp;&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #555">text</span>:&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">'foo!'</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div><div><span style="color: red; font-weight: bold">//</span></div></div>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: red; font-weight: bold">should&nbsp;equal</span>&nbsp;<div style="display: inline-block; vertical-align: top"><div><span style="color: #df5000">'f00!'</span></div></div></div><div>&nbsp;</div><div><span style="background-color: red; color: white">foo</span><span style="color: red">!</span></div><div><span style="background-color: green; color: white">f00</span><span style="color: green">!</span></div></div></div></div></div><div>}</div></div>

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
        () => fsExtra.pathExists(expectedOutputFile),
        "to be fulfilled with",
        true
      );
    });
  });

  describe("with file globals", () => {
    it("should make the global available", async () => {
      function fileGlobalFunction() {
        return "woop woop";
      }

      const evaldown = new Evaldown({
        sourcePath: path.join(TESTDATA_PATH, "file-globals"),
        targetPath: TESTDATA_OUTPUT_PATH,
        fileGlobals: {
          fileGlobalFunction: () => fileGlobalFunction
        }
      });

      await evaldown.processFiles();

      const expectedOutputFile = path.join(
        TESTDATA_OUTPUT_PATH,
        "example.html"
      );
      await expect(expectedOutputFile, "to be present on disk");
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

  describe("when operating in update mode", function() {
    it("should make changes to the source markdown", async function() {
      const sourceFile = "expect.md";
      const sourceFilePath = path.join(TESTDATA_PATH, "example", sourceFile);
      const originalSource = await fsExtra.readFile(sourceFilePath, "utf8");

      await new Evaldown({
        update: true,
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

            \`\`\`output
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

      expect(stats, "to equal", {
        succeeded: 0,
        errored: 1
      });
    });
  });
});
