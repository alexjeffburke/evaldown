<!-- evaldown ignore:true -->
```javascript
function doSomething() {
  return { foo: "bar" };
}

return doSomething();
```

```output
Ignore me
```

```javascript
return 'baz';
```

```output
But not me
```
