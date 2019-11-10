const expect = require('unexpected');
const cleanStackTrace = require('../lib/cleanStackTrace');

describe('cleanStackTrace', function() {
  it('should turn line numbers into :x:y', function() {
    expect(
      cleanStackTrace('foo\n  at bar (/somewhere.js:1:2)'),
      'to contain',
      ':x:y'
    );
  });

  it('should only preserve 2 stack locations per trace', function() {
    expect(
      cleanStackTrace(
        [
          'foo',
          '  at bar (/a.js:1:2)',
          '  at baz (/a.js:1:2)',
          '  at quux (/a.js:1:2)',
          'something else',
          'foo',
          '  at bar (/a.js:1:2)',
          '  at baz (/a.js:1:2)',
          '  at quux (/a.js:1:2)',
          'hey'
        ].join('\n')
      ),
      'to equal',
      [
        'foo',
        '  at bar (/path/to/file.js:x:y)',
        '  at baz (/path/to/file.js:x:y)',
        'something else',
        'foo',
        '  at bar (/path/to/file.js:x:y)',
        '  at baz (/path/to/file.js:x:y)',
        'hey'
      ].join('\n')
    );
  });
});
