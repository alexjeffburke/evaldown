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
    "<string> to be present on disk",
    async (expect, subject) => {
      await expect(
        () => fsExtra.pathExists(subject),
        "to be fulfilled with",
        true
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

    it('should default to "output"', () => {
      const evaldown = new Evaldown({});

      expect(evaldown.capture, "to equal", "output");
    });

    it('should allow capturing "output"', async function() {
      const evaldown = new Evaldown({
        outputCapture: "output",
        sourcePath: path.join(TESTDATA_PATH, "capture-output"),
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
          <div class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;bar&quot;</span>&nbsp;<span style="color: #999">};</span></div><div><span style="color: #999">}</span></div><div>&nbsp;</div><div><span style="color: #708090">//&nbsp;objects&nbsp;are&nbsp;inspected&nbsp;too</span></div><div><span style="color: #07a">return</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></div><div class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">'bar'</span>&nbsp;}</div></div>
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
        '<div style="font-family: monospace; white-space: nowrap"><div>hello,&nbsp;world!</div><div><span style="color: red; font-weight: bold">foobar</span></div></div>'
      );
    });

    it('should allow capturing "expect"', async function() {
      const evaldown = new Evaldown({
        outputCapture: "expect",
        sourcePath: path.join(TESTDATA_PATH, "capture-expect"),
        targetPath: TESTDATA_OUTPUT_PATH
      });

      await evaldown.processFiles();

      // check the file was created
      const expectedOutputFile = path.join(
        TESTDATA_OUTPUT_PATH,
        "nothing.html"
      );
      await expect(
        expectedOutputFile,
        "to be present on disk with content satisfying",
        "to equal snapshot",
        expect.unindent`
          <p>Testing output capturing.</p>
          <div class="code lang-javascript"><div><span style="color: #DD4A68">expect</span><span style="color: #999">(</span><span style="color: #690">&quot;f00&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #690">&quot;to&nbsp;equal&quot;</span><span style="color: #999">,</span>&nbsp;<span style="color: #690">&quot;foo&quot;</span><span style="color: #999">);</span></div></div><div class="output"><div><span style="color: red; font-weight: bold">expected</span>&nbsp;<span style="color: #df5000">'f00'</span>&nbsp;<span style="color: red; font-weight: bold">to&nbsp;equal</span>&nbsp;<span style="color: #df5000">'foo'</span></div><div>&nbsp;</div><div><span style="background-color: red; color: white">f00</span></div><div><span style="background-color: green; color: white">foo</span></div></div>
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
            expect({ a: "b" }, "to equal", { a: 1234 });
            var now = new Date();
            expect(now, "to equal", now);
            expect(now, "to equal", new Date(now.getTime()));
            expect({ now: now }, "to equal", { now: now });
            \`\`\`

            For a lot of types a failing equality test results in a nice
            diff. Below you can see an object diff.

            \`\`\`javascript
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
});
