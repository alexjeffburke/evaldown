# Evaldown

Evalute JavaScript snippets in markdown files and output static HTML.

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

## Authoring

Inside the input folder, you can make add markdown files that contain
"javascript" code blocks. In order to have any output shown these need
to be
followed by "output" blocks.

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
