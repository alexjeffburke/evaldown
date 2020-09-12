# Evaldown

Evaluate JavaScript and TypeScript snippets in markdown files.

[![NPM version](https://img.shields.io/npm/v/evaldown.svg)](https://www.npmjs.com/package/evaldown)
[![Build Status](https://img.shields.io/travis/alexjeffburke/evaldown/master.svg)](https://travis-ci.org/alexjeffburke/evaldown)
[![Coverage Status](https://img.shields.io/coveralls/alexjeffburke/evaldown/master.svg)](https://coveralls.io/r/alexjeffburke/evaldown?branch=master)

This tool provides both CLI and programmatic interfaces for
locating JS/TS code blocks in one or more markdown files,
extracting and evaluating these blocks and provides a range
formats in which to serialise their pretty-printed output.

We start with discussing making use of the tool from the
command line, but later sections cover [authoring](#Authoring)
snippets and [validating](#Validation) them post annotation.

The sections below discuss configuring the tool and
authoring of examples.

## Use

We start by introducing an invocation for processing a single
markdown file:

```
npx evaldown ./docs/README.md > README.md
```

The file will be processed and the output written to stdout.
In order to store the output within the source file, thereby
automatically capturing it, we can use the `--inplace` option:

```
npx evaldown --inplace ./docs/README.md
```

> All the examples in this section are executable in a checkout of the
> evaldown repository.

### Process directories of files

Processing all the files in a directory looks almost identical:

```
npx evaldown --target-path testdata/output testdata/example
```

As does applying an update to the source files within a directory:

```
npx evaldown --inplace ./testdata/example
```

### Working with TypeScript

Support is inbuilt for processing TypeScript blocks into files.
An explicit path to the `tsconfig.json` file is required from
which point the project specific compiler is detected and used
to transpile snippets:

```
npx evaldown --tsconfig-path ./testdata/typescript/tsconfig.json ./testdata/typescript/example.md
```

### Beyond command line options

The tool supports many additional options to alter its behaviour.

Typically, the tool would be installed via a dependency via npm
and any options will be read directly from a configuration file:

```
npm install --save-dev evaldown
```

```
npx evaldown --config <path_to_config>
```

## Configuration

The tool ships with inbuilt support for processing directories
of markdown files. To do this, a small config file is needed to
indicate where the source path to read files from a target path
to write generated output to.

A basic `evaldown.conf.js` file is as follows:

<!-- evaldown evaluate:false -->

```javascript
module.exports = {
  sourcePath: "./input",
  targetPath: "./output"
};
```

### Output format and extension

Currently the rendering process will produce HTML files as standard with
their usual `.html` file extension. The tool can however be requested to
output markdown files to the output directory - with the output blocks
populated - allowing its use to pre-process markdown files before they
are passed to another template engine.

#### `"inlined"`

This option will write markdown files with the code and output blocks
replaced with static HTML that inlines all the colouring information.

<!-- evaldown evaluate:false -->

```javascript
module.exports = {
  outputFormat: "inlined",
  sourcePath: "./input",
  targetPath: "./output"
};
```

#### `"markdown"`

This option will write markdown files with the code and output blocks
replaced with text (for use when external highlighting is desired).

<!-- evaldown evaluate:false -->

```javascript
module.exports = {
  outputFormat: "markdown",
  sourcePath: "./input",
  targetPath: "./output"
};
```

### Capturing evaluation results from the console

By default, JavaScript code blocks found in markdown files - which
we refer to as _snippets_ - are allowed to use `return` statements.
The returned values will be rendered as an output block - an example
of this is shown in the [authoring](#Authoring) section below.

In some cases, rather than capture the result you may wish to capture the
logging output of a command, perhaps for code that emits messages when it
finished or just an example that uses the console.

The most convenient way to capture the console is usually to add a flag
to the particular snippet ([this is discussed below](#console-true)). If
all the examples require the console, it can be enabled globally via an
option to the CLI:

```
npx evaldown --capture console ...
```

or by adding an outputCapture key to the configuration object:

<!-- evaldown evaluate:false -->

```javascript
module.exports = {
  outputCapture: "console",
  sourcePath: "./input",
  targetPath: "./output"
};
```

### Keeping the source up-to-date

As you change your examples, updating means you can always keep the
output up-to-date. This mode is considered a key use-case and can
enabled by default via the configuration file:

It can also be activaited on the command line on demand:

```
./node_modules/.bin/evaldown --config <path_to_config> --update
```

## Authoring

Inside the input folder, you can make add markdown files that contain
"javascript" code blocks. In order to have any output shown these need
to be followed by "output" snippets.

By default, value returned from the code block is what will be captured
and displayed in the subsequent output block:

<!-- evaldown ignore:true -->
<pre>
```javascript
function doSomething() {
  return { foo: "bar" };
}

// objects are inspected too
return doSomething();
```

```output
{ foo: 'bar' }
```
</pre>

When they are rendered, the output will look something like:

```javascript
function doSomething() {
  return { foo: "bar" };
}

// objects are inspected too
return doSomething();
```

<!-- evaldown output:true -->

```
{ foo: 'bar' }
```

### Customising snippets with flags

When authoring examples you may find that you want to customise how
individual snippets are treated - this is done by annotations above
the code clocks inline in the markdown.

Comments with the `evaldown` marker will be located and the values
afterwards, which we call _flags_, will be used as processing hints.

#### async: true

This flag permits the use of the `await` keyword:

<!-- evaldown ignore:true -->
<pre>
<!-- evaldown async:true -->

```js
const value = await Promise.resolve('foo');

return `${value}bar`;
```

```output
'foobar'
```
</pre>

#### console: true

This flag will instrument the console such that any logged lines
will appear in the output snippet:

<!-- evaldown ignore:true -->
<pre>
<!-- evaldown console:true -->
```js
console.warn("whoa there!");
```

```output
whoa there!
```
</pre>

# Validation

Once you have authored your documentation and annotated the markdown
such that it can be executed, it is important that as your project
develops these examples stay correct with respect to future changes.

We can make use of the ability to execute the snippets to check that the
evaluated output matches what was previously recorded in the markdown. To
do this we can use the `--validate` option:

```
npx evaldown --validate ./README.md
```

In the case of an output mismatch an informative diff is produced:

<!-- evaldown output:true -->

```
SnippetValidationError:
expected \'foo\' to equal \'foobar\'

-foo
+foobar
```

This option allows such checks to easily occur as part of CI pipelines.

