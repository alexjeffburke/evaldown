# Evaldown

Evalute JavaScript snippets in markdown files and output static pages.

[![NPM version](https://img.shields.io/npm/v/evaldown.svg)](https://www.npmjs.com/package/evaldown)
[![Build Status](https://img.shields.io/travis/alexjeffburke/evaldown/master.svg)](https://travis-ci.org/alexjeffburke/evaldown)
[![Coverage Status](https://img.shields.io/coveralls/alexjeffburke/evaldown/master.svg)](https://coveralls.io/r/alexjeffburke/evaldown?branch=master)

This project will recursively traverse a folder structure searching
for markdown files. Once found, it will extract javascript code blocks,
evaluate them and serialise their pretty-printed output for rendering.

The tool can even automatically capture the output of your examples.
See the [updating](#Updating-examples) section for more details.

## Use

Once the tool is installed and configured, you can point it at a
config file and it will scan the specified source path and write
output for matching files to a target path. The tool is invoked by:

```
./node_modules/.bin/evaldown --config <path_to_config>
```

The sections below discuss configuring the the tool and
authoring you first example files.

## Configuration

After the package is installed, a small config file is needed
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

## Updating examples

Rather than be forced to write the output by hand, we can automatially
execute the provided code snippets and inject their results into the
source markdown files. This is done using the `"update"` option.

As you change your examples, updating means you can always keep the
output up-to-date. This mode is considered a _primary use-case_ and
can be activated by supplying an additional command line option:

```
./node_modules/.bin/evaldown --config <path_to_config> --update
```

It can also be placed within the configuration file:

```js
module.exports = {
  update: true,
  sourcePath: "./input",
  targetPath: "./output"
};
```
