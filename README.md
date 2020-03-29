# Evaldown

Evalute JavaScript snippets in markdown files and output static pages.

[![NPM version](https://img.shields.io/npm/v/evaldown.svg)](https://www.npmjs.com/package/evaldown)
[![Build Status](https://img.shields.io/travis/alexjeffburke/evaldown/master.svg)](https://travis-ci.org/alexjeffburke/evaldown)
[![Coverage Status](https://img.shields.io/coveralls/alexjeffburke/evaldown/master.svg)](https://coveralls.io/r/alexjeffburke/evaldown?branch=master)

This project will recursively traverse a folder structure searching
for markdown files. Once found, it will extract any javascript blocks

## Use

Once the tool is installed and configured, you can point it at a
config file and it will automatically generate output files for
each of the mardown files it finds. The tool is invoked by:

```
./node_modules/.bin/evaldown --config <path_to_config>
```

The sections below discuss configuring and creating your files.
Captung javascript uses an additional `--update` option which
is discussed in the [updating](#Updating) section below.

## Configuration

The package must first be installed and then a config file written
which will indicate where it should read source files and target
for writing output.

In its most basic form a configuration is as follows:

```javascript
module.exports = {
  sourcePath: "./input",
  targetPath: "./output"
};
```

### Output format and extension

Currently the rendering process will produce HTML files as standard with
their usual `.html` extentionsion. The tool can however be requested to
output markdown files to the output directory - with the output blocks
populated - allowing its use to pre-process markdown files before they
are passed to another template engine.

#### `"inlined"`

This option will write markdown files with the code and output blocks
replaced with static HTML that inlines all the colouring information.

```javascript
module.exports = {
  outputFormat: 'inlined',
  sourcePath: "./input",
  targetPath: "./output"
};
```

#### `"markdown"`

This option will write markdown files with the code and output blocks
replaced with text (for use in a case external highlighting is desired).

```javascript
module.exports = {
  outputFormat: 'markdown',
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

Capturing from the console can be configured by adding an outputCapture
key with a value of `"console"` to the configuration object:

```javascript
module.exports = {
  outputCapture: "console",
  sourcePath: "./input",
  targetPath: "./output"
};
```

> Note: changing output capturing affects all markdown files
> currently but will be configurable made per-snippet in future

## Authoring

Inside the input folder, you can make add markdown files that contain
"javascript" code blocks. In order to have any output shown these need
to be followed by "output" snippets.

By default, value returned from the code block is what will be captured
and displayed in the

<pre>
```javascript
return { foo: 'bar' }
```

```output

```
</pre>

### Updating

Automatically executing the provided code snippets and injecting them
into the "output" placeholder blocks means that you can always keep
the code snippets up to date.

This is considered a primary use-case and is activated by supplying an
additional option on the command line:

```
./node_modules/.bin/evaldown --config <path_to_config> --update
```
