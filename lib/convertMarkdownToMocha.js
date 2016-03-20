/*global unexpected:true, global*/
var esprima = require('esprima');
var escodegen = require('escodegen');
var pathModule = require('path');
var snippetRegexp = require('./snippetRegexp')

global.sourceMapByFileName = global.sourceMapByFileName || {};

function extend(target) {
    for (var i = 1; i < arguments.length; i += 1) {
        var source = arguments[i];
        Object.keys(source).forEach(function (key) {
            target[key] = source[key];
        });
    }
    return target;
}

function parseBlockInfo(lang) {
    var m = /^(\w+)#(\w+:\w+(,\w+:\w+)*)/.exec(lang);
    var flags = { evaluate: true };
    if (m) {
        lang = m[1];
        extend(flags, parseFlags(m[2]));
    }

    if (lang === 'js') {
        lang = 'javascript';
    }

    return {
        lang: lang,
        flags: flags
    };
}

function parseFlags(flagsString) {
    var flags = {};
    flagsString.split(/,/).forEach(function (flagString) {
        var m = /(\w+):(\w+)/.exec(flagString);
        flags[m[1]] = m[2] === 'true';
    });
    return flags;
}

function parseFunctionBody(fn) {
    return esprima.parse(fn.toString(), { loc: true, source: '<generated code>' }).body[0].body.body;
}

function instrumentReturns(astNode, exampleNumber) {
    if (Array.isArray(astNode)) {
        for (var i = 0 ; i < astNode.length ; i += 1) {
            var statement = astNode[i];
            if (statement.type === 'ReturnStatement') {
                astNode.splice(i, 1, {
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'AssignmentExpression',
                        operator: '=',
                        left: { type: 'Identifier', name: '__returnValue' + exampleNumber },
                        right: statement.argument
                    }
                }, {
                    type: 'BreakStatement',
                    label: {
                        type: 'Identifier',
                        name: 'example' + exampleNumber
                    }
                });
            } else if (statement.type === 'IfStatement') {
                instrumentReturns(statement.consequent, exampleNumber);
                instrumentReturns(statement.alternate, exampleNumber);
            }
        }
    } else if (astNode && typeof astNode === 'object') {
        if (astNode.type === 'BlockStatement') {
            instrumentReturns(astNode.body, exampleNumber);
        }
    }
}

function makeTryCatchConstruct(exampleNumber, topLevelStatements) {
    var tryCatch = parseFunctionBody(function f() {
        var __returnValueX;
        exampleX: try {
        } catch (err) {
            return endOfExampleX(err);
        }
        if (isPromise(__returnValueX)) {
            return __returnValueX.then(function () {
                return endOfExampleX();
            }, endOfExampleX);
        } else {
            return endOfExampleX();
        }
        function endOfExampleX(err) {}
    });

    tryCatch[0].declarations[0].id.name = '__returnValue' + exampleNumber;
    tryCatch[1].label.name = 'example' + exampleNumber;
    tryCatch[1].body.handler.body.body[0].argument.callee.name = 'endOfExample' + exampleNumber;
    tryCatch[2].test.arguments[0].name = '__returnValue' + exampleNumber;
    tryCatch[2].consequent.body[0].argument.callee.object.name = '__returnValue' + exampleNumber;
    tryCatch[2].consequent.body[0].argument.arguments[1].name = 'endOfExample' + exampleNumber;
    tryCatch[2].consequent.body[0].argument.arguments[0].body.body[0].argument.callee.name = 'endOfExample' + exampleNumber;
    tryCatch[2].alternate.body[0].argument.callee.name = 'endOfExample' + exampleNumber;
    tryCatch[3].id.name = 'endOfExample' + exampleNumber;

    instrumentReturns(topLevelStatements, exampleNumber);

    Array.prototype.push.apply(tryCatch[1].body.block.body, topLevelStatements);
    return tryCatch;
}

function countLinesUntilIndex(text, untilIndex) {
    var count = 0;
    text.replace(/\r\n?|\n\r?/g, function ($0, index) {
        if (index < untilIndex) {
            count += 1;
        }
    });
    return count;
}

function findCodeBlocks(mdSrc) {
    snippetRegexp.lastIndex = 0;
    var codeBlocks = [];
    var matchCodeBlock;
    while ((matchCodeBlock = snippetRegexp.exec(mdSrc))) {
        var codeBlock = parseBlockInfo(matchCodeBlock[1]);
        codeBlock.code = matchCodeBlock[2];
        codeBlock.index = matchCodeBlock.index;
        codeBlock.lineNumber = 1 + countLinesUntilIndex(mdSrc, codeBlock.index);
        if (codeBlock.lang === 'output') {
            var lastJavaScriptBlock = codeBlocks[codeBlocks.length - 1];
            if (!lastJavaScriptBlock || 'output' in lastJavaScriptBlock) {
                throw new Error('output block must follow code block');
            }
            lastJavaScriptBlock.output = codeBlock.code;
        } else if (codeBlock.lang === 'javascript' && codeBlock.flags.evaluate) {
            codeBlocks.push(codeBlock);
        }
    }
    return codeBlocks;
}

function compileCodeBlocksToAst(codeBlocks, fileName) {
    var top = [];
    var cursor = top;
    codeBlocks.forEach(function (codeBlock, i) {
        var previousExampleNumber = i + 1;
        var topLevelStatements = esprima.parse(new Array(codeBlock.lineNumber).join('\n') + '(function () {\n' + codeBlock.code + '\n}());', { loc: true, source: pathModule.resolve(fileName) }).body[0].expression.callee.body.body;
        if (codeBlock.flags.freshExpect) {
            Array.prototype.push.apply(cursor, parseFunctionBody(function f() {
                expect = unexpected.clone();
            }));
        }
        var tryCatch = makeTryCatchConstruct(previousExampleNumber, topLevelStatements);

        Array.prototype.push.apply(cursor, tryCatch);

        cursor = tryCatch[3].body.body;
        if (i === codeBlocks.length - 1) {
            var check;
            if (typeof codeBlock.output === 'string') {
                check = parseFunctionBody(function f() {
                    if (err) {
                        expect(err, 'to have message', 'expectedErrorMessage');
                    } else {
                        throw new Error('expected example 1 to fail');
                    }
                });
                check[0].consequent.body[0].expression.arguments[2].value = codeBlock.output;
            } else {
                check = parseFunctionBody(function f() {
                    if (err) {
                        expect.fail(err);
                    }
                });
            }
            Array.prototype.push.apply(cursor, check);
        }
    });
    return top;
}

module.exports = function (mdSrc, fileName) {
    if (fileName) {
        fileName = pathModule.relative(process.cwd(), fileName);
    } else {
        fileName = '<inline code>';
    }

    var codeBlocks = findCodeBlocks(mdSrc);

    var ast = {
        type: 'Program',
        body: parseFunctionBody(function f() {
            function isPromise(obj) {
                return obj && typeof obj.then === 'function';
            }
            if (typeof unexpected === 'undefined') {
                unexpected = require('unexpected');
                unexpected.output.preferredWidth = 80;
            }
            describe('', function () {
            });
        })};

    var describeCall = ast.body[2].expression;

    describeCall.arguments[0].value = pathModule.basename(fileName, '.md');

    codeBlocks.forEach(function (codeBlock, i) {
        var exampleNumber = i + 1;
        var itExpressionStatement = parseFunctionBody(function f() {
            it('', function () {
                var expect = unexpected.clone();
            });
        })[0];
        itExpressionStatement.expression.arguments[0].value = 'example #' + exampleNumber + ' (' + fileName + ':' + (codeBlock.lineNumber + 1) + ':1) should ' + (typeof codeBlock.output === 'string' ? 'fail with the correct error message' : 'succeed');

        describeCall.arguments[1].body.body.push(itExpressionStatement);

        Array.prototype.push.apply(
            itExpressionStatement.expression.arguments[1].body.body,
            compileCodeBlocksToAst(codeBlocks.slice(0, i + 1), fileName)
        );
    });
    var sourceMapWithCode = escodegen.generate(ast, { sourceMap: true, sourceMapWithCode: true });
    global.sourceMapByFileName[fileName] = sourceMapWithCode.map.toString();
    return (
        sourceMapWithCode.code + '\n' +
        'var fileName = ' + JSON.stringify(fileName) + ';\n' +
        'var SourceMapConsumer = require(' + JSON.stringify(__dirname + '/../node_modules/source-map') + ').SourceMapConsumer;\n' +

        // From https://github.com/evanw/node-source-map-support/blob/master/source-map-support.js
        '(' + function () {
            var map = new SourceMapConsumer(global.sourceMapByFileName[fileName]);

            var fs = require('fs');

            function mapSourcePosition(position) {
                var originalPosition = map.originalPositionFor(position);
                // Only return the original position if a matching line was found. If no
                // matching line is found then we return position instead, which will cause
                // the stack trace to print the path and line for the compiled file. It is
                // better to give a precise location in the compiled file than a vague
                // location in the original file.
                if (originalPosition.source !== null && map.sources.indexOf(position.source) !== -1) {
                    return originalPosition;
                }
                return position;
            }

            // Parses code generated by FormatEvalOrigin(), a function inside V8:
            // https://code.google.com/p/v8/source/browse/trunk/src/messages.js
            function mapEvalOrigin(origin) {
                // Most eval() calls are in this format
                var match = /^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(origin);
                if (match) {
                    var position = mapSourcePosition({
                        source: pathModule.resolve(match[2]),
                        line: match[3],
                        column: match[4] - 1
                    });
                    return 'eval at ' + match[1] + ' (' + position.source + ':' +
                        position.line + ':' + (position.column + 1) + ')';
                }

                // Parse nested eval() calls using recursion
                match = /^eval at ([^(]+) \((.+)\)$/.exec(origin);
                if (match) {
                    return 'eval at ' + match[1] + ' (' + mapEvalOrigin(match[2]) + ')';
                }

                // Make sure we still return useful information if we didn't find anything
                return origin;
            }

            // This is copied almost verbatim from the V8 source code at
            // https://code.google.com/p/v8/source/browse/trunk/src/messages.js. The
            // implementation of wrapCallSite() used to just forward to the actual source
            // code of CallSite.prototype.toString but unfortunately a new release of V8
            // did something to the prototype chain and broke the shim. The only fix I
            // could find was copy/paste.
            function CallSiteToString() {
                var fileName;
                var fileLocation = "";
                if (this.isNative()) {
                    fileLocation = "native";
                } else {
                    fileName = this.getScriptNameOrSourceURL();
                    if (!fileName && this.isEval()) {
                        fileLocation = this.getEvalOrigin();
                        fileLocation += ", ";  // Expecting source position to follow.
                    }

                    if (fileName) {
                        fileLocation += fileName;
                    } else {
                        // Source code does not originate from a file and is not native, but we
                        // can still get the source position inside the source string, e.g. in
                        // an eval string.
                        fileLocation += "<anonymous>";
                    }
                    var lineNumber = this.getLineNumber();
                    if (lineNumber != null) {
                        fileLocation += ":" + lineNumber;
                        var columnNumber = this.getColumnNumber();
                        if (columnNumber) {
                            fileLocation += ":" + columnNumber;
                        }
                    }
                }

                var line = "";
                var functionName = this.getFunctionName();
                var addSuffix = true;
                var isConstructor = this.isConstructor();
                var isMethodCall = !(this.isToplevel() || isConstructor);
                if (isMethodCall) {
                    var typeName = this.getTypeName();
                    var methodName = this.getMethodName();
                    if (functionName) {
                        if (typeName && functionName.indexOf(typeName) != 0) {
                            line += typeName + ".";
                        }
                        line += functionName;
                        if (methodName && functionName.indexOf("." + methodName) != functionName.length - methodName.length - 1) {
                            line += " [as " + methodName + "]";
                        }
                    } else {
                        line += typeName + "." + (methodName || "<anonymous>");
                    }
                } else if (isConstructor) {
                    line += "new " + (functionName || "<anonymous>");
                } else if (functionName) {
                    line += functionName;
                } else {
                    line += fileLocation;
                    addSuffix = false;
                }
                if (addSuffix) {
                    line += " (" + fileLocation + ")";
                }
                return line;
            }

            function cloneCallSite(frame) {
                var object = {};
                Object.getOwnPropertyNames(Object.getPrototypeOf(frame)).forEach(function(name) {
                    object[name] = /^(?:is|get)/.test(name) ? function() { return frame[name].call(frame); } : frame[name];
                });
                object.toString = CallSiteToString;
                return object;
            }

            function wrapCallSite(frame) {
                // Most call sites will return the source file from getFileName(), but code
                // passed to eval() ending in "//# sourceURL=..." will return the source file
                // from getScriptNameOrSourceURL() instead
                var source = frame.getFileName() || frame.getScriptNameOrSourceURL();
                if (source) {
                    var line = frame.getLineNumber();
                    var column = frame.getColumnNumber() - 1;

                    // Fix position in Node where some (internal) code is prepended.
                    // See https://github.com/evanw/node-source-map-support/issues/36
                    if (line === 1 && !frame.isEval()) {
                        column -= 62;
                    }

                    var position = mapSourcePosition({
                        source: source,
                        line: line,
                        column: column
                    });
                    frame = cloneCallSite(frame);
                    frame.getFileName = function() { return position.source; };
                    frame.getLineNumber = function() { return position.line; };
                    frame.getColumnNumber = function() { return position.column + 1; };
                    frame.getScriptNameOrSourceURL = function() { return position.source; };
                    return frame;
                }

                // Code called using eval() needs special handling
                var origin = frame.isEval() && frame.getEvalOrigin();
                if (origin) {
                    origin = mapEvalOrigin(origin);
                    frame = cloneCallSite(frame);
                    frame.getEvalOrigin = function() { return origin; };
                    return frame;
                }

                // If we get here then we were unable to change the source position
                return frame;
            }

            var fileContentsCache = {};

            // This function is part of the V8 stack trace API, for more info see:
            // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
            function prepareStackTrace(error, stack) {
                return error + stack.map(function(frame) {
                    return '\n    at ' + wrapCallSite(frame);
                }).join('');
            }

            // Generate position and snippet of original source with pointer
            function getErrorSource(error) {
                var match = /\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(error.stack);
                if (match) {
                    var source = match[1];
                    var line = +match[2];
                    var column = +match[3];

                    // Support the inline sourceContents inside the source map
                    var contents = fileContentsCache[source];

                    // Support files on disk
                    if (!contents && fs.existsSync(source)) {
                        contents = fs.readFileSync(source, 'utf8');
                    }

                    // Format the line from the original source code like node does
                    if (contents) {
                        var code = contents.split(/(?:\r\n|\r|\n)/)[line - 1];
                        if (code) {
                            return source + ':' + line + '\n' + code + '\n' +
                                new Array(column).join(' ') + '^';
                        }
                    }
                }
                return null;
            }

            function printErrorAndExit(error) {
                var source = getErrorSource(error);

                if (source) {
                    console.error();
                    console.error(source);
                }

                console.error(error.stack);
                process.exit(1);
            }

            function shimEmitUncaughtException() {
                var origEmit = process.emit;

                process.emit = function (type) {
                    if (type === 'uncaughtException') {
                        var hasStack = (arguments[1] && arguments[1].stack);
                        var hasListeners = (this.listeners(type).length > 0);

                        if (hasStack && !hasListeners) {
                            return printErrorAndExit(arguments[1]);
                        }
                    }
                    return origEmit.apply(this, arguments);
                }
            }

            exports.wrapCallSite = wrapCallSite;
            exports.getErrorSource = getErrorSource;
            exports.mapSourcePosition = mapSourcePosition;

            Error.prepareStackTrace = prepareStackTrace;

            // Configure options

            var installHandler = true;

            shimEmitUncaughtException();
        }.toString() + '());\n'
    );
};
