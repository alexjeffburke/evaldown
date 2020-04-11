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

<!-- evaldown ignore:true -->
<pre>
```javascript
return 'baz';
```

```output
While still ignoring me
```
</pre>
