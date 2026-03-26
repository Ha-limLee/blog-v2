---
title: iterator helpers
date: '2024-10-27'
tags: []
draft: true
summary:
images: []
layout: PostSimple
authors: ['default']
---



# 문제

임의의 정수를 가진 배열 `numbers`가 있다. numbers의 길이는 100,000이다. 이 배열에서 짝수 5개를 고르려고 한다.

# 일반적인 방법

## Array method

```ts
numbers.filter((x) => x % 2 === 0).slice(0, 5);
```

대부분의 경우 이 코드는 충분히 좋다. 그러나 숫자 5개 뽑자고 배열 전체를 도는 건 별로 좋은 생각은 아닌 것 같다.

## For loop

그렇다면 for 구문을 이용해 명령형으로 코드를 작성할 수 있다.

```ts
// for-of loop
const result: number[] = [];

for (const x of numbers) {
  if (result.length === 5) break;

  if (x % 2 === 0) {
    result.push(x);
  }
}
```

또는

```ts
// for loop
const result: number[] = [];

for (let i = 0; i < numbers.length; i++) {
  if (result.length === 5) break;

  const x = numbers[i];
  if (x % 2 === 0) {
    result.push(x);
  }
}
```

이 코드는 Array method를 사용한 것보다 훨씬 효율적이다. 그러나 이번에는 가독성을 잃었다.

가독성과 효율성 둘 다 잡을 방법은 없을까?

# Lazy evaluation

앞에서 살펴본 문제는 JS에선 연산이 곧바로 평가되기 때문이다(Eager evaluation). 만약 JS가 연산을 느긋하게 했다면 배열 메서드는 효율적으로 동작할 수 있었을 것이다.

```ts
numbers
  .filter((x) => x % 2 === 0) // 바로 실행하지 않음
  .slice(0, 5); // 결과값이 필요하므로 이제 실행함
```

Lazy evaluation의 가장 큰 장점은 최적화가 가능하다는 것이다. 만약 연산이 느긋하다면 전체 연산의 결과가 어떤 형태여야 하는지 알 수 있기 때문에, 연산을 끝까지 하기 전에 원하는 결과를 얻었다면 연산을 중단할 수 있다.

```ts
numbers
  .filter((x) => x % 2 === 0) // 바로 실행하지 않음
  // 결과값이 필요하므로 이제 실행함
  // 원하는 결과는 길이가 5인 배열이므로 filter를 실행하다가 길이 5인 배열이 완성되면 filter를 종료
  .slice(0, 5);
```

## Iterator helpers

만약
