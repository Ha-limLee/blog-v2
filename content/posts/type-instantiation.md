---
title: type instantiation
date: '2024-06-20'
tags: ['typescript']
draft: true
summary:
images: []
layout: PostSimple
authors: ['default']
---



# Type instantiation

Here's a function that accept an array, do something on it and then return it.

```js
function foo(xs) {
  return xs.filter(checkSomething);
}
```

Now let's give it a type. It returns same structure of the input, so the return type is same as the input's.

However TS throws a type error like this.

```ts
function foo<T extends unknown[]>(xs: T): T {
  // Type 'unknown[]' is not assignable to type 'T'.
  // 'unknown[]' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint 'unknown[]'.(2322)
  return xs.filter(checkSomething);
}
```


