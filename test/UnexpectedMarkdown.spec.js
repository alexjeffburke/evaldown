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
        "expect({ a: 'b' }, 'to equal', { a: 'b' });",
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
    var htmlPromise;
    beforeEach(function() {
      htmlPromise = expect.promise(function(resolve, reject) {
        markdown.toHtml({}, function(err, html) {
          if (err) {
            reject(err);
          } else {
            resolve(html);
          }
        });
      });
    });

    it('syntax highlight examples', function() {
      return expect(
        htmlPromise,
        'when fulfilled',
        'to contain',
        '<span style="color: #DD4A68">expect</span>'
      );
    });

    it('outputs evaluated examples', function() {
      return expect(
        htmlPromise,
        'when fulfilled',
        'to contain',
        '<span style="background-color: green; color: white">f00</span>'
      );
    });
  });

  describe('withUpdatedExamples', function() {
    it('produces a markdown where the examples has been updated', function() {
      return expect(
        expect.promise(function(resolve, reject) {
          markdown.withUpdatedExamples({}, function(err, markdown) {
            if (err) {
              reject(err);
            } else {
              resolve(markdown.toString());
            }
          });
        }),
        'when fulfilled',
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
      expect.promise(function(resolve, reject) {
        markdown.withUpdatedExamples({}, function(err, markdown) {
          if (err) {
            reject(err);
          } else {
            resolve(markdown.toString());
          }
        });
      }),
      'when fulfilled',
      'to contain',
      [
        '<!-- unexpected-markdown cleanStackTrace:true -->',
        '```output',
        'foo',
        '  at bar (/path/to/file.js:x:y)',
        '  at quux (/path/to/file.js:x:y)',
        '```'
      ].join('\n')
    );
  });
});
