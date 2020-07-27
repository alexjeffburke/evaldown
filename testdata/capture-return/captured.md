Testing output capturing.

```javascript
return "foo";
```

```output
'foo'
```

```javascript
function doSomething() {
  return { foo: "bar" };
}

// objects are inspected too
return doSomething();
```

```output
Missing output
```
