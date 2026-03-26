---
title: Object.entries와 interface
date: '2024-01-05'
tags: ['typescript']
draft: false
summary: type과 inferface의 차이점
images: []
layout: PostSimple
authors: ['default']
---

TS 5.3.3 기준 interface에 대해서 `Object.entries()`를 사용하면 타입이 제대로 안 잡히는 경우가 있다

```tsx
interface Foo {
  [key: number]: string;
}

declare const obj: Foo;

const entries = Object.entries(obj); // [string, any][]
```

value의 타입이 `string`으로 추론되지 않고 `any`가 되었다

interface 대신 type으로 선언하면 타입이 제대로 나온다

```tsx
type Foo = {
  [key: number]: string;
};

const obj: Foo = {};

const entries = Object.entries(obj); // [string, string][]
```

이렇게 된 이유는 interface는 type과는 달리 index signature를 암시적으로 `string`으로 바꾸지 않기 때문이다

```tsx
interface ObjectConstructor {
    ...
    entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
    entries(o: {}): [string, any][];
    ...
}
```

`Object.entries()`의 첫 번째 정의를 보면 인자로 `{ [s: string]: T }`를 받는다

interface의 경우 index signature가 `number`이므로 첫 번째 함수에는 대입할 수 없다

따라서 두 번째 함수에 대입되고 두 번째 함수의 반환 타입인 `[string, any][]`이 나온 것이다

반면 type의 경우 index signature가 number이지만 암시적으로 string으로 바뀌어서 첫 번째 함수에 대입할 수 있다

따라서 첫 번째 함수에 대입되고 반환 타입이 올바른 타입인 `[string, string][]`이 되었다

**참고**

[Index Signatures](https://www.typescriptlang.org/docs/handbook/2/objects.html#index-signatures)

[Object.entries behaves differently for interfaces and types](https://github.com/microsoft/TypeScript/issues/49872)
