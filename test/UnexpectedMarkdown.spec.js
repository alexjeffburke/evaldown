var expect = require('unexpected');
var UnexpectedMarkdown = require('../lib/UnexpectedMarkdown');

describe('UnexpectedMarkdown', function() {
  var markdown;
  beforeEach(function() {
    markdown = new UnexpectedMarkdown(
      [
        'Asserts deep equality.',
        '',
        '```javascript',
        "expect({ a: 'b' }, 'to equal', { a: 1234 });",
        'var now = new Date();',
        "expect(now, 'to equal', now);",
        "expect(now, 'to equal', new Date(now.getTime()));",
        "expect({ now: now }, 'to equal', { now: now });",
        '```',
        '',
        'For a lot of types a failing equality test results in a nice',
        'diff. Below you can see an object diff.',
        '',
        '```javascript',
        "expect({ text: 'foo!' }, 'to equal', { text: 'f00!' });",
        '```',
        '',
        '```output',
        'Missing output',
        '```'
      ].join('\n')
    );
  });

  describe('toHtml', function() {
    it('syntax highlight examples (dark)', function() {
      return expect(
        markdown.toHtml({ theme: 'dark' }),
        'when fulfilled',
        'to contain',
        '<span style="color: #66D9EF; font-weight: bold">1234</span>'
      );
    });

    it('outputs highlight examples (light)', function() {
      return expect(
        markdown.toHtml({ theme: 'light' }),
        'when fulfilled',
        'to contain',
        '<span style="background-color: green; color: white">f00</span>'
      );
    });
  });

  describe('withUpdatedExamples', function() {
    it('produces a markdown where the examples has been updated', function() {
      return expect(
        markdown.withUpdatedExamples({}),
        'when fulfilled',
        expect.it(markdown =>
          expect(
            markdown.toString(),
            'to contain',
            [
              '```output',
              "expected { text: 'foo!' } to equal { text: 'f00!' }",
              '',
              '{',
              "  text: 'foo!' // should equal 'f00!'",
              '               //',
              '               // -foo!',
              '               // +f00!',
              '}',
              '```'
            ].join('\n')
          )
        )
      );
    });
  });

  it('produces a markdown where the examples has been updated', function() {
    const markdown = new UnexpectedMarkdown(
      [
        'Asserts deep equality.',
        '',
        '```javascript',
        'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")',
        '```',
        '',
        '<!-- unexpected-markdown cleanStackTrace:true -->',
        '```output',
        'Missing output',
        '```'
      ].join('\n')
    );

    return expect(
      markdown.withUpdatedExamples({}),
      'when fulfilled',
      expect.it(markdown =>
        expect(
          markdown.toString(),
          'to contain',
          [
            '<!-- unexpected-markdown cleanStackTrace:true -->',
            '```output',
            'foo',
            '  at bar (/path/to/file.js:x:y)',
            '  at quux (/path/to/file.js:x:y)',
            '```'
          ].join('\n')
        )
      )
    );
  });
});
