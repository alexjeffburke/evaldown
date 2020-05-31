<!-- evaldown nowrap:true -->

```javascript
class Person {
  constructor(foo) {
    this.foo = !!foo;
  }
}
```

```javascript
expect.addType({
  name: 'Person',
  base: 'object',
  identify: v => v instanceof Person
});

expect.addAssertion('<Person> to foo', (expect, subject) => {
  expect(subject.foo, 'to be true');
})

expect(new Person(false), 'to foo');
```

```output
```

<!-- evaldown freshContext:true -->

```javascript
class Person {
  constructor(foo) {
    this.foo = !!foo;
  }
}

expect.addType({
  name: 'Person',
  base: 'object',
  identify: v => v instanceof Person,
  prefix: output => output.text('PERSON:'),
  suffix: output => output.text('')
});

expect.addAssertion('<Person> to foo', (expect, subject) => {
  expect(subject.foo, 'to be true');
})

expect(new Person(false), 'to foo');
```

```output
```
