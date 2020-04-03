Testing output capturing.

```javascript
function fooer() {
  return "f00";
}
```

```javascript
const assert = require("assert");
process.env.NODE_DISABLE_COLORS = '1';

assert.strictEqual(fooer(), "foo");
```

```output
Input A expected to strictly equal input B:
+ expected - actual

- 'f00'
+ 'foo'
```
