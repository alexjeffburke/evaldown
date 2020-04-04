Testing output capturing.

```javascript
const assert = require("assert");

function fooer() {
  return "f00";
}

assert.strictEqual(fooer(), "foo", "Not the same :-(");
```

```output
Not the same :-(
```
