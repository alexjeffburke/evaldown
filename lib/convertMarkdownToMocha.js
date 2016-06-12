/*global unexpected:true*/
var pathModule = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var snippetRegexp = require('./snippetRegexp');
var locateBabelrc = require('./locateBabelrc');
var fs = require('fs');

var transpile;
var hasBabel = false;
try {
    var babelCore = require.main.require('babel-core');
    var babelrc = locateBabelrc();
    var babelOptions = JSON.parse(fs.readFileSync(babelrc, 'utf-8'));
    hasBabel = true;

    transpile = function transpile(code) {
        var babelResult = babelCore.transform(code, extend({}, babelOptions, {
            sourceMaps: false,
            compact: false
        }));

        return babelResult.code.replace(/'use strict';/, '');
    };
} catch (e) {
    transpile = function transpile(code) {
        return code;
    };
}

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
    return esprima.parse(fn.toString()).body[0].body.body;
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
    /* eslint-disable */
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
    /* eslint-enable */


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

        topLevelStatements.forEach(function (topLevelStatement, i) {
            switch (topLevelStatement.type) {
            case 'VariableDeclaration':
                topLevelStatement.kind = 'var';
                break;
            case 'FunctionDeclaration':
                var newStatement = {
                    loc: topLevelStatement.loc,
                    type: 'VariableDeclaration',
                    declarations: [{
                        loc: topLevelStatement.loc,
                        type: 'VariableDeclarator',
                        id: topLevelStatement.id,
                        init: topLevelStatement
                    }],
                    kind: 'var'
                };
                topLevelStatements[i] = newStatement;
                break;
            }
        });

        if (codeBlock.flags.freshExpect) {
            /* eslint-disable */
            Array.prototype.push.apply(cursor, parseFunctionBody(function f() {
                expect = unexpected.clone();
            }));
            /* eslint-enable */
        }
        var tryCatch = makeTryCatchConstruct(previousExampleNumber, topLevelStatements);

        Array.prototype.push.apply(cursor, tryCatch);

        cursor = tryCatch[3].body.body;
        if (i === codeBlocks.length - 1) {
            var check;
            if (typeof codeBlock.output === 'string') {
                /* eslint-disable */
                check = parseFunctionBody(function f() {
                    if (err) {
                        expect(err, 'to have message', 'expectedErrorMessage');
                    } else {
                        throw new Error('expected example 1 to fail');
                    }
                });
                /* eslint-enable */
                check[0].consequent.body[0].expression.arguments[2].value = codeBlock.output;
            } else {
                /* eslint-disable */
                check = parseFunctionBody(function f() {
                    if (err) {
                        expect.fail(err);
                    }
                });
                /* eslint-enable */
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
        /* eslint-disable */
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
        /* eslint-enable */

    var describeCall = ast.body[2].expression;

    describeCall.arguments[0].value = pathModule.basename(fileName, '.md');

    var preamble;
    if (hasBabel) {
        var preambleSeparator = '\n//---------------------um-preamble----------------------\n';
        var separator = '\n//---------------------um-separator---------------------\n';
        var transpiledCode = transpile(preambleSeparator + codeBlocks.map(function (codeBlock) {
            return codeBlock.flags.async
              ? '(function unexpectedMarkdownScope() {' +
                  codeBlock.code +
                '})("unexpectedMarkdownScope");'
              : codeBlock.code;
        }).join(separator));

        var transpiledBlocks = transpiledCode
            .split(new RegExp(preambleSeparator + '|' + separator));


        preamble = esprima.parse(transpiledBlocks[0]);

        transpiledBlocks.slice(1).forEach(function (transpiledBlock, i) {
            if (codeBlocks[i].flags.async) {
                codeBlocks[i].code = transpiledBlock
                    .replace(/^\(function unexpectedMarkdownScope\(\) \{\n/, '')
                    .replace(/\n\}\)\("unexpectedMarkdownScope"\);$/, '')
                    .replace(/^    /gm, '');
            } else {
                codeBlocks[i].code = transpiledBlock;
            }
        });
    }

    codeBlocks.forEach(function (codeBlock, i) {
        var exampleNumber = i + 1;
        /* eslint-disable */
        var itExpressionStatement = parseFunctionBody(function f() {
            it('', function () {
                var expect = unexpected.clone();
            });
        })[0];
        /* eslint-enable */
        itExpressionStatement.expression.arguments[0].value = 'example #' + exampleNumber + ' (' + fileName + ':' + (codeBlock.lineNumber + 1) + ':1) should ' + (typeof codeBlock.output === 'string' ? 'fail with the correct error message' : 'succeed');

        if (preamble) {
            itExpressionStatement.expression.arguments[1].body.body.push(preamble);
        }

        describeCall.arguments[1].body.body.push(itExpressionStatement);

        Array.prototype.push.apply(
            itExpressionStatement.expression.arguments[1].body.body,
            compileCodeBlocksToAst(codeBlocks.slice(0, i + 1), fileName)
        );
    });
    return escodegen.generate(ast, { sourceMap: true, sourceMapWithCode: true });
};
