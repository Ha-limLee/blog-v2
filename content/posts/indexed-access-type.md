---
title: indexed access와 undefined
date: "2023-10-27"
tags: ["clean-code"]
draft: false
summary: 런타임 오류를 방지하는 방법
images: []
layout: PostSimple
authors: ["default"]
---

# Introduction

⚠ 본 글은 TypeScript v5.2.2를 바탕으로 작성되었습니다

아마 JS에서 가장 자주 일어나는 실수는 nullish value(null 또는 undefined)[^a] 참조일 것이다

많은 개발자들이 TS를 사용하게 되면서 nullish value임이 명확한 경우 오류를 내는 경우는 크게 줄어들었다

![](/static/images/indexed-access-type/referencing-nullish.png)

그렇다면 아래 코드는 어떨까?

```ts showLineNumbers
type Data = Record<string, number>;

const data: Data = {
  james: 28,
};

const value = data["david"];

console.log(value.toString());
```

JS를 다루는 사람은 value가 `undefined`이며 9번 줄에서 오류가 발생할 거라는 걸 안다

그렇다면 타입은 어떨까?

[TypeScript Playground](https://www.typescriptlang.org/play)에서 보면 이렇게 나온다

![](/static/images/indexed-access-type/property-access-code.png)

타입 오류가 없다! value는 `number`로 추론된다

![](/static/images/indexed-access-type/property-access-no-undefined.png)

왜 value는 `number`일까? `number | undefined`가 되어야 하지 않을까?

# Why undefined is not included

문제 상황은 이렇다

_index signature[^c]를 가진 타입이 있고 이 타입으로 선언된 객체가 있을 때, 그 객체의 속성 값을 속성 접근자[^e]로 가져오면 런타임에서는 undefined일 수 있지만 타입에는 나타나지 않는다_

TS 개발진은 의도적으로 index signature를 가진 객체 undefined를 배제했는데 그 이유는 개발자 경험 때문이었다[^b]

아래 코드를 보자

```ts showLineNumbers
let total = 0;
for (let i = 0; i < arr.length; i++) {
  const student = arr[i];
  total += student.age;
}
```

배열을 순회하고 조회하는 일반적인 코드다

index 범위 안에서 순회하기 때문에 `arr[i]`가 `undefined`일 리가 없다

그러나 index signature의 값 타입이 `T | undefined`였다면 4번 줄에서 타입 오류가 발생했을 것이다

```ts {4} showLineNumbers
let total = 0;
for (let i = 0; i < arr.length; i++) {
  const student = arr[i];
  total += student.age; // Error: 'student' is possibly undefined
}
```

오류를 해결하려면 조건문으로 체크하거나 non-null assertion operator[^d]로 nullish value가 아님을 컴파일러에게 알려줘야 한다

```ts {4} showLineNumbers
let total = 0;
for (let i = 0; i < arr.length; i++) {
  const student = arr[i];
  if (student) total += student.age;
  // 또는 total += student!.age;
}
```

property에 n번 접근하면 n개의 검증을 추가로 해야한다

이런 반복 작업은 분명 개발자 경험을 떨어뜨린다

# But value is possibly undefined

그러나 우리는 속성 값을 가져올 때 항상 존재하는 키를 사용하지는 않는다

```ts
const idFromServer = await fetchId();

const image = images[idFromServer];
```

속성 값에 접근할 때 서버에서 받아왔거나 클라이언트에서 연산한 키를 사용한다

도중에 키가 바뀌었을 수도 있고 객체가 바뀌었을 수도 있다

즉, 속성 값이 undefined가 아니라는 건 코드를 작성한 사람 알고 그 조차도 기억에 의존한 거라 부정확하다

따라서 이런 코드는 런타임에서 언제 터질지 모르는 시한폭탄이라고 볼 수 있다

# How to solve

TS를 도입하는 이유를 생각해보면 타자를 조금 더 치더라도 런타임 오류를 차단하는 게 맞다

## TS config

앞선 논의들은 모두 2017년에 논의된 적이 있으며[^f] TS 4.1의 옵션으로 추가되었다[^g]

바로 `noUncheckedIndexedAccess` 옵션이다

![](/static/images/indexed-access-type/ts-config-no-unchecked-indexed-access.png)

이 옵션을 활성화하면 속성 접근자로 가져온 값의 타입이 `T | undefined`가 된다

![](/static/images/indexed-access-type/property-access-with-config.png)

- Pros
  - TS에서 native로 지원

- Cons
  - TS 4.1 이상이 아니면 사용할 수 없음
  - 기존 코드도 영향을 받음

## Library

underscore나 lodash의 `get` 함수를 사용할 수도 있다[^h] [^i]

![](/static/images/indexed-access-type/underscore-get.png)

배열의 값만 가져온다면 ES2022에 추가된 `Array.prototype.at()`을 사용할 수도 있다[^j]

![](/static/images/indexed-access-type/array-at.png)

- Pros
  - 점진적으로 도입할 수 있음

- Cons
  - 디펜던시가 추가됨
  - get 함수는 두번째 인자로 `string`을 받기 때문에 배열에 사용할 경우 키를 string으로 변환해야 함

## Write yourself

상황이 여의치 않으면 직접 작성할 수도 있다

```ts
type Key = number | string | symbol;

export function get<T extends Record<Key, unknown>>(
  target: T,
  index: Key,
): T extends Record<Key, infer E> ? E | undefined : never;

export function get<T extends Array<unknown>>(
  target: T,
  index: Key,
): T extends Array<infer E> ? E | undefined : never;

export function get(target: any, index: any) {
  return target[index];
}
```

![](/static/images/indexed-access-type/custom-get.png)

# Conclusion

좋은 코드는 다른 사람이 읽기 좋아야하고 나아가 런타임 오류를 방지하는 코드라고 생각한다

읽기 좋다는 건 정보가 많다는 것이다

정보 전달은 주석뿐만 아니라 상세한 타입으로도 할 수 있다

타입을 잘 사용하면 주석의 역할을 일부 수행하면서 런타임 오류를 미연에 방지할 수 있다

이런 관점에서 속성 접근에 타입을 잘 적용하면 좋은 코드에 한 걸음 더 다가갈 수 있다고 생각한다

# References

[^a]: [Nullish value](https://developer.mozilla.org/en-US/docs/Glossary/Nullish)

[^b]: [Why index signature doesn't return T | undefined](https://github.com/microsoft/TypeScript/issues/13778#issuecomment-277104502)

[^c]: [Index signature](https://www.typescriptlang.org/glossary#index-signatures)

[^d]: [Non-null assertion operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator)

[^e]: [Property accessors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors)

[^f]: [Suggestion: option to include undefined in index signatures](https://github.com/microsoft/TypeScript/issues/13778#issue-204273831)

[^g]: [Checked Indexed Accesses](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#checked-indexed-accesses---nouncheckedindexedaccess)

[^h]: [underscore get](https://underscorejs.org/#get)

[^i]: [lodash get](https://lodash.com/docs/#get)

[^j]: [Array.prototype.at](https://github.com/sudheerj/ECMAScript-features#array-at-method)
