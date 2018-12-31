/*global describe, it, unexpected:true, setImmediate*/
var convertMarkdownToMocha = require('../lib/convertMarkdownToMocha');
var esprima = require('esprima');
var escodegen = require('escodegen');

function codeToString(obj) {
    var ast;
    if (typeof obj === 'function') {
        obj = '(' + obj.toString() + '());';
    } else {
        obj = '(function () {' + obj + '}());';
    }
    ast = esprima.parse(obj).body[0].expression.callee.body;
    return escodegen.generate(ast);
}

var expect = require('unexpected').clone()
    .use(require('magicpen-prism'))
    .addAssertion('to come out as', function (expect, subject, value) {
        expect(codeToString(convertMarkdownToMocha(subject).code).replace(/    var fileName = '<inline code>'[\s\S]*$/, '}'), 'to equal', codeToString(value));
    });

var synchronousSuccessfulSnippet =
    "var foo = 'abc';\n" +
    "expect(foo, 'to equal', 'abc');\n";

var returningSuccessfulSnippet =
    "var blah = 'abc';\n" +
    "if (blah === 'abc') {\n" +
    '  return expect.promise(function (resolve, reject) {\n' +
    '    setImmediate(resolve);\n' +
    '  });\n' +
    '} else {\n' +
    '  return 456;\n' +
    '}\n';

var synchronousThrowingSnippet =
    "var bar = 'abc';\n" +
    "expect(bar, 'to equal', 'def');\n";

function fences(code, language) {
    return '```' + (language || 'js') + '\n' + code + '\n```\n';
}

describe('convertMarkdownToMocha', function () {
    it('should convert a returning snippet expected to be successful', function () {
        expect(
            fences(returningSuccessfulSnippet),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }
                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var blah = 'abc';
                            if (blah === 'abc') {
                                __returnValue1 = expect.promise(function (resolve, reject) {
                                    setImmediate(resolve);
                                });
                                break example1;
                            } else {
                                __returnValue1 = 456;
                                break example1;
                            }
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect.fail(err);
                            }
                        }
                    });
                });
            }
        );
    });

    it('should convert a returning snippet expected to fail', function () {
        expect(
            fences(returningSuccessfulSnippet) + '\n' +
            fences('theErrorMessage', 'output'),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }

                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should fail with the correct error message', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var blah = 'abc';
                            if (blah === 'abc') {
                                __returnValue1 = expect.promise(function (resolve, reject) {
                                    setImmediate(resolve);
                                });
                                break example1;
                            } else {
                                __returnValue1 = 456;
                                break example1;
                            }
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect(err, 'to have message', 'theErrorMessage');
                            } else {
                                throw new Error('expected example 1 to fail');
                            }
                        }
                    });
                });
            }
        );
    });

    it('should convert a returning snippet expected to fail followed by another one', function () {
        expect(
            fences(returningSuccessfulSnippet) + '\n' +
            fences('theErrorMessage', 'output') + '\n' +
            fences(synchronousSuccessfulSnippet),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }

                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should fail with the correct error message', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var blah = 'abc';
                            if (blah === 'abc') {
                                __returnValue1 = expect.promise(function (resolve, reject) {
                                    setImmediate(resolve);
                                });
                                break example1;
                            } else {
                                __returnValue1 = 456;
                                break example1;
                            }
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect(err, 'to have message', 'theErrorMessage');
                            } else {
                                throw new Error('expected example 1 to fail');
                            }
                        }
                    });

                    it('example #2 (<inline code>:18:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var blah = 'abc';
                            if (blah === 'abc') {
                                __returnValue1 = expect.promise(function (resolve, reject) {
                                    setImmediate(resolve);
                                });
                                break example1;
                            } else {
                                __returnValue1 = 456;
                                break example1;
                            }
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        // eslint-disable-next-line handle-callback-err
                        function endOfExample1(err) {
                            var __returnValue2;
                            example2: try {
                                var foo = 'abc';
                                expect(foo, 'to equal', 'abc');
                            } catch (err) {
                                return endOfExample2(err);
                            }
                            if (isPromise(__returnValue2)) {
                                return __returnValue2.then(function () { return endOfExample2(); }, endOfExample2);
                            } else {
                                return endOfExample2();
                            }
                            function endOfExample2(err) {
                                if (err) {
                                    expect.fail(err);
                                }
                            }
                        }
                    });
                });
            }
        );
    });

    it('should convert non-returning snippet expected to be successful', function () {
        expect(
            fences(synchronousSuccessfulSnippet),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }

                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var foo = 'abc';
                            expect(foo, 'to equal', 'abc');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect.fail(err);
                            }
                        }
                    });
                });
            }
        );
    });

    it('should convert a non-returning snippet expected to fail', function () {
        expect(
            fences(synchronousThrowingSnippet) + '\n' +
            fences('theErrorMessage', 'output'),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }

                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should fail with the correct error message', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var bar = 'abc';
                            expect(bar, 'to equal', 'def');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect(err, 'to have message', 'theErrorMessage');
                            } else {
                                throw new Error('expected example 1 to fail');
                            }
                        }
                    });
                });
            }
        );
    });

    it('should convert a non-returning snippet expected to fail followed by another one', function () {
        expect(
            fences(synchronousThrowingSnippet) + '\n' +
            fences('theErrorMessage', 'output') + '\n' +
            fences(synchronousSuccessfulSnippet),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }

                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should fail with the correct error message', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var bar = 'abc';
                            expect(bar, 'to equal', 'def');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect(err, 'to have message', 'theErrorMessage');
                            } else {
                                throw new Error('expected example 1 to fail');
                            }
                        }
                    });

                    it('example #2 (<inline code>:12:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var bar = 'abc';
                            expect(bar, 'to equal', 'def');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        // eslint-disable-next-line handle-callback-err
                        function endOfExample1(err) {
                            var __returnValue2;
                            example2: try {
                                var foo = 'abc';
                                expect(foo, 'to equal', 'abc');
                            } catch (err) {
                                return endOfExample2(err);
                            }
                            if (isPromise(__returnValue2)) {
                                return __returnValue2.then(function () { return endOfExample2(); }, endOfExample2);
                            } else {
                                return endOfExample2();
                            }
                            function endOfExample2(err) {
                                if (err) {
                                    expect.fail(err);
                                }
                            }
                        }
                    });
                });
            }
        );
    });

    it('should convert a synchronously succeeding snippet followed by another one', function () {
        expect(
            fences(synchronousSuccessfulSnippet) + '\n' +
            fences(synchronousThrowingSnippet),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }

                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var foo = 'abc';
                            expect(foo, 'to equal', 'abc');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect.fail(err);
                            }
                        }
                    });

                    it('example #2 (<inline code>:8:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var foo = 'abc';
                            expect(foo, 'to equal', 'abc');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        // eslint-disable-next-line handle-callback-err
                        function endOfExample1(err) {
                            var __returnValue2;
                            example2: try {
                                var bar = 'abc';
                                expect(bar, 'to equal', 'def');
                            } catch (err) {
                                return endOfExample2(err);
                            }
                            if (isPromise(__returnValue2)) {
                                return __returnValue2.then(function () { return endOfExample2(); }, endOfExample2);
                            } else {
                                return endOfExample2();
                            }
                            function endOfExample2(err) {
                                if (err) {
                                    expect.fail(err);
                                }
                            }
                        }
                    });
                });
            }
        );
    });

    it('should inject a fresh unexpected clone before a snippet with #freshExpect:true', function () {
        expect(
            fences(synchronousSuccessfulSnippet) + '\n' +
            fences(synchronousThrowingSnippet, 'javascript#freshExpect:true'),
            'to come out as',
            function () {
                function isPromise(obj) {
                    return obj && typeof obj.then === 'function';
                }

                if (typeof unexpected === 'undefined') {
                    unexpected = require('unexpected');
                    unexpected.output.preferredWidth = 80;
                }

                describe('<inline code>', function () {
                    it('example #1 (<inline code>:2:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var foo = 'abc';
                            expect(foo, 'to equal', 'abc');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        function endOfExample1(err) {
                            if (err) {
                                expect.fail(err);
                            }
                        }
                    });

                    it('example #2 (<inline code>:8:1) should succeed', function () {
                        var expect = unexpected.clone();
                        var __returnValue1;
                        example1: try {
                            var foo = 'abc';
                            expect(foo, 'to equal', 'abc');
                        } catch (err) {
                            return endOfExample1(err);
                        }
                        if (isPromise(__returnValue1)) {
                            return __returnValue1.then(function () { return endOfExample1(); }, endOfExample1);
                        } else {
                            return endOfExample1();
                        }
                        // eslint-disable-next-line handle-callback-err
                        function endOfExample1(err) {
                            expect = unexpected.clone();
                            var __returnValue2;
                            example2: try {
                                var bar = 'abc';
                                expect(bar, 'to equal', 'def');
                            } catch (err) {
                                return endOfExample2(err);
                            }
                            if (isPromise(__returnValue2)) {
                                return __returnValue2.then(function () { return endOfExample2(); }, endOfExample2);
                            } else {
                                return endOfExample2();
                            }
                            function endOfExample2(err) {
                                if (err) {
                                    expect.fail(err);
                                }
                            }
                        }
                    });
                });
            }
        );
    });
});
