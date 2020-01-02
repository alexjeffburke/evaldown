const expect = require('unexpected');

const evaluateSnippets = require('../lib/evaluateSnippets');

describe('extractSnippets', () => {
  it('should evaluate javascript snippets', async () => {
    const snippets = [
      {
        lang: 'javascript',
        flags: { evaluate: true },
        index: 24,
        code:
          'throw new Error("foo\\n  at bar (/somewhere.js:1:2)\\n  at quux (/blah.js:3:4)\\n  at baz (/yadda.js:5:6)")'
      },
      {
        lang: 'output',
        flags: { cleanStackTrace: true, evaluate: true },
        index: 198,
        code:
          'foo\n  at bar (/path/to/file.js:x:y)\n  at quux (/path/to/file.js:x:y)'
      }
    ];

    await evaluateSnippets(snippets);

    expect(snippets[0], 'to satisfy', {
      htmlErrorMessage:
        '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">foo</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;bar&nbsp;(/somewhere.js:1:2)</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;quux&nbsp;(/blah.js:3:4)</span></div><div><span style="color: red; font-weight: bold">&nbsp;&nbsp;at&nbsp;baz&nbsp;(/yadda.js:5:6)</span></div></div>',
      errorMessage:
        'foo\n  at bar (/somewhere.js:1:2)\n  at quux (/blah.js:3:4)\n  at baz (/yadda.js:5:6)'
    });
  });

  describe('with an aync snippet', () => {
    it('should evaluate javascript snippets', async () => {
      const snippets = [
        {
          lang: 'javascript',
          flags: { async: true, evaluate: true },
          index: 40,
          code: "return Promise.reject(new Error('boom'));"
        }
      ];

      await evaluateSnippets(snippets);

      expect(snippets[0], 'to satisfy', {
        htmlErrorMessage: '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">boom</span></div></div>',
        errorMessage: 'boom'
      });
    });

    it('should record an error string if missing a return', async () => {
      const snippets = [
        {
          lang: 'javascript',
          flags: { async: true, evaluate: true },
          index: 40,
          code: "Promise.resolve();"
        }
      ];

      await evaluateSnippets(snippets);

      expect(snippets[0], 'to satisfy', {
        htmlErrorMessage: '<div style="font-family: monospace; white-space: nowrap"><div><span style="color: red; font-weight: bold">Async&nbsp;code&nbsp;block&nbsp;did&nbsp;not&nbsp;return&nbsp;a&nbsp;promise&nbsp;or&nbsp;throw</span></div><div><span style="color: red; font-weight: bold">Promise.resolve();</span></div></div>',
        errorMessage: 'Async code block did not return a promise or throw\nPromise.resolve();'
      });
    });
  });
});
