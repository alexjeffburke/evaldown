# Evaldown

Evaluate JavaScript snippets in markdown files.

[![NPM version](https://img.shields.io/npm/v/evaldown.svg)](https://www.npmjs.com/package/evaldown)
[![Build Status](https://img.shields.io/travis/alexjeffburke/evaldown/master.svg)](https://travis-ci.org/alexjeffburke/evaldown)
[![Coverage Status](https://img.shields.io/coveralls/alexjeffburke/evaldown/master.svg)](https://coveralls.io/r/alexjeffburke/evaldown?branch=master)

This tool provides both CLI and programmatic interfaces for
locating JavaScript code blocks in one or more markdown files,
extracting and evaluating these blocks and provides a range
formats in which to serialise their pretty-printed output.

## Use

We start by introducing an invocation for processing a single
markdown file:

```
./node_modules/.bin/evaldown ./docs/README.md
```

The file will be processed and the output written to stdout.
In order to store the output within the source file, thereby
automatically capturing it, we can use the `--inplace` option:

```
./node_modules/.bin/evaldown --inplace ./docs/README.md
```

### Process directories of files

Applying a similiar update to all files within a directory
structure looks almost identical:

```
./node_modules/.bin/evaldown --inplace ./testdata/
```

### Beyond command line options

The tool supports many additional options to alter its behaviour,
and these can all be read directly from a configuration file:

```
./node_modules/.bin/evaldown --config <path_to_config>
```

The sections below discuss configuring the tool and
authoring of examples.

## Configuration

The tool ships with inbuilt support for processing directories
of markdown files. To do this, a small config file is needed to
indicate where the source path to read files from a target path
to write generated output to.

A basic `evaldown.conf.js` file is as follows:

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

```javascript
module.exports = {
  outputFormat: 'inlined',
  sourcePath: "./input",
  targetPath: "./output"
};
```

#### `"markdown"`

This option will write markdown files with the code and output blocks
replaced with text (for use when external highlighting is desired).

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
and displayed in the

<pre>
```javascript
function doSomething() {
  return { foo: "bar" };
}

// objects are inspected too
return doSomething();
```

```output
```
</pre>

When they are rendered, the output will look something like:

<div class="code lang-javascript"><div><span style="color: #07a">function</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">()</span>&nbsp;<span style="color: #999">{</span></div><div>&nbsp;&nbsp;<span style="color: #07a">return</span>&nbsp;<span style="color: #999">{</span>&nbsp;foo<span style="color: #a67f59">:</span>&nbsp;<span style="color: #690">&quot;bar&quot;</span>&nbsp;<span style="color: #999">};</span></div><div><span style="color: #999">}</span></div><div>&nbsp;</div><div><span style="color: #708090">//&nbsp;objects&nbsp;are&nbsp;inspected&nbsp;too</span></div><div><span style="color: #07a">return</span>&nbsp;<span style="color: #DD4A68">doSomething</span><span style="color: #999">();</span></div></div>

<div class="output"><div>{&nbsp;<span style="color: #555">foo</span>:&nbsp;<span style="color: #df5000">&#39;bar&#39;</span>&nbsp;}</div></div>

### Customising snippets

When authoring examples you may find that you want to customise how
individual snippets are treated - be this to allow using promises or
to capture the console.

HTML comments inserted above the code blocks allow doing just this.
First, we look at an example that makes use of some `async` code:

<pre>
<!-- evaldown async:true -->
```js
return new Promise('foo');
```

```output
foo
```
</pre>

Comments with the `evaldown` marker will be located and the values
afterwards, which we call _flags_, will be used as processing hints.

Outputting uses of the `console` would look something like:

<pre>
<!-- evaldown console:true -->
```js
console.warn("whoa there!");
```

```output
whoa, there!
```
</pre>
