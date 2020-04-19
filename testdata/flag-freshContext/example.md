```javascript
expect.addAssertion('<any> to foo', (expect, subject) => {
  expect(Object.keys(subject), 'to contain', 'foo');
})
```

<!-- evaldown freshContext:true -->

```javascript
expect({ foo: null }, 'to foo');
```

```output
```

```javascript
expect({ foo: null }, 'to foo');
```

```output
```
