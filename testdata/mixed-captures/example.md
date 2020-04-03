Mixed capturing.

First there is a return value:

<!-- evaldown return:true -->
```javascript
function doSomething() {
  return { foo: "bar" };
}

// objects are inspected too
return doSomething();
```

```output
```

Then we try logging to the console:

<!-- evaldown console:true -->
```javascript
console.log('foo bar baz');
console.warn('..as is customary when testing');
```

```output
```
