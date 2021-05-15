<!-- evaldown console:true,async:true -->

```javascript
console.log('foo bar baz');

await Promise.resolve().then(() => {
  console.log('..as is customary when testing');
});
```

```output
```
