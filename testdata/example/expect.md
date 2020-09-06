Asserts deep equality.

```javascript
const expect = require('unexpected');

expect({ a: "b" }, "to equal", { a: 1234 });
var now = new Date();
expect(now, "to equal", now);
expect(now, "to equal", new Date(now.getTime()));
expect({ now: now }, "to equal", { now: now });
```

For a lot of types a failing equality test results in a nice
diff. Below you can see an object diff.

```javascript
const expect = require('unexpected');

expect({ text: "foo!" }, "to equal", { text: "f00!" });
```

<!-- evaldown output:true -->

```
Missing output
```
