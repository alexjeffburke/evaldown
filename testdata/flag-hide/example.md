<!-- evaldown hide:true -->
```javascript
function doSomething() {
  return { foo: "bar" };
}

global.doSomething = doSomething;
```

```javascript
return global.doSomething();
```

```output
Show me
```
