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
    var updatedMarkdownPromise;
    beforeEach(function() {
      updatedMarkdownPromise = expect.promise(function(resolve, reject) {
        markdown.withUpdatedExamples({}, function(err, markdown) {
          if (err) {
            reject(err);
          } else {
            resolve(markdown.toString());
          }
        });
      });
    });

    it('produces a markdown where the examples has been updated', function() {
      return expect(
        updatedMarkdownPromise,
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
});
