const extractSnippets = require('../lib/extractSnippets');
const expect = require('unexpected');

describe('extractSnippets', function() {
  it('should extract a snippet between some markdown sections', function() {
    expect(
      extractSnippets(
        '# foo\n\n```javascript\nalert("Hello!");\n```\n\n# bar\n'
      ),
      'to satisfy',
      [{ code: 'alert("Hello!");' }]
    );
  });

  it('should multiple snippets', function() {
    expect(
      extractSnippets(
        '```js\nalert("Hello!");\n```\n\n```js\nalert("world!");\n```\n'
      ),
      'to satisfy',
      [{ code: 'alert("Hello!");' }, { code: 'alert("world!");' }]
    );
  });

  it('should normalize js to javascript', function() {
    expect(extractSnippets('```js\nalert("Hello!");\n```\n'), 'to satisfy', [
      { lang: 'javascript', code: 'alert("Hello!");' }
    ]);
  });

  it('should extract a flag after the language specifier and #', function() {
    expect(
      extractSnippets('```js#foo:true\nalert("Hello!");\n```\n'),
      'to satisfy',
      [{ flags: { foo: true } }]
    );
  });

  it('should extract multiple comma-separated flags after the language specifier and #', function() {
    expect(
      extractSnippets('```js#foo:true,bar:false\nalert("Hello!");\n```\n'),
      'to satisfy',
      [{ flags: { foo: true, bar: false } }]
    );
  });
});
