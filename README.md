This module uses the markdown parser [marked](https://github.com/chjj/marked) to
generate html output from markdown files.

[![NPM version](https://img.shields.io/npm/v/unexpected-markdown.svg)](https://www.npmjs.com/package/unexpected-markdown)
[![Build Status](https://img.shields.io/travis/unexpectedjs/unexpected-markdown/master.svg)](https://travis-ci.org/unexpectedjs/unexpected-markdown)
[![Coverage Status](https://img.shields.io/coveralls/unexpectedjs/unexpected-markdown/master.svg)](https://coveralls.io/r/unexpectedjs/unexpected-markdown?branch=master)

In addition to what marked already offers, this module uses
[magicpen-prism](https://github.com/unexpectedjs/magicpen-prism) to syntax
highlight code blocks and uses [unexpected](http://unexpectedjs.github.io/) to
evaluate JavaScript code examples.

Right now the documentation for this plugin is pretty lacking, until
that is fixed the best example on how to use the plugin is to look at
how it is used in
[unexpected](https://github.com/unexpectedjs/unexpected/tree/master/site).

An example is a JavaScript code block:

    ```js
    helloWorld()
    ```

If you expect the example to fail, you can follow the code block with
an expected output block:

    ```output
    Error: Silence this is a library!
    ```

There are a few things you can achieve more then what is explained
above, like async examples with promises and skiping examples for
different environments or just skipping evaluation altogether. For now
you'll have to look at how
[unexpected](https://github.com/unexpectedjs/unexpected/tree/master/site)
does it to learn the ticks.
