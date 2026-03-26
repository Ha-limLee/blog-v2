---
title: 깊은 복사
date: '2023-08-06'
tags: ['clean-code']
draft: false
summary: JS에서 깊은 복사를 하는 3 가지 방법
images: []
layout: PostSimple
authors: ['default']
---
# Introduction

[이전 글](denote-mutation)에서는 매개변수를 변경하는 비순수 함수를 조금 더 안전하게 만드는 방법에 대해서 알아보았다

사용자에게 사이드 이펙트를 알리는 건 안 하는 것보다는 낫지만 근본적인 해결책은 되지 않는다

여전히 함수를 사용하는 사람에게 책임을 떠넘기고 있다

그렇다면 어떻게 해야 함수를 안전하게 만들 수 있을까?

애초에 사이드 이펙트를 일으키지 않으면 된다!

# Copy Object

문제가 발생하는 이유는 함수 내부와 바깥이 한 객체를 공유하기 때문이다

따라서 함수 내부에서 객체를 복사해서 쓰면 문제가 발생하지 않는다

```diff
/**
@param { [number, number] } point board 상 현재 위치
@param { number[][] } board 탐색할 배열
@param { boolean[][] } visited 방문 체크
@returns { number } 탐색한 cell의 수
 */
const dfs = (point, board, visited) => {
+  // 변경할 객체를 복사
+  const visitedClone = copy(visited);
  const [r, c] = point;
  // 이미 방문했거나 갈 수 없는 곳이면 탐색 종료
-  if (visited[r][c] || !board[r][c]) return 0;
+  if (visitedClone[r][c] || !board[r][c]) return 0;

  // ⚠ 변경 발생
-  visited[r][c] = true;
+  visitedClone[r][c] = true;

  // 움직일 수 있는 쪽으로 탐색 진행
  const count = [directions]
-    .map((next) => dfs(next, board, visited))
+    .map((next) => dfs(next, board, visitedClone))
    .reduce((acc, curr) => acc + curr, 0);

  return count + 1;
}
```

# Deep Clone

가장 간단하고 안전한 방법은 객체를 통째로 복사하는 것이다

깊은 복사를 하는 방법은 여러 가지가 있다

샘플 객체를 가지고 성능을 비교해보자

실험 환경: jdoodle.com에서 제공하는 node.js 17.1.0

```js
// 샘플 객체를 만드는 함수
// 2^20개의 원소가 있고 깊이가 20인 트리
const createSample = (depth = 0, init = {}) => {
  if (depth === 20) return [];
  init[0] = createSample(depth + 1);
  init[9] = createSample(depth + 1);
  return init;
};
```

## JSON 문자열

JSON.stringify로 객체를 JSON 문자열로 만들고 JSON.parse로 새로운 객체를 만들 수 있다

```js
const copyUsingJSON = (obj) => JSON.parse(JSON.stringify(obj));

// test

const obj = { a: 1, b: { c: 100 } };

const cloned = copyUsingJSON(obj);

assert.notEqual(obj, cloned);

cloned[b][c] = 0;

assert.notEqual(obj[b][c], cloned[b][c]);
```

```js
// performance

const sample = createSample();

console.time('json');

const copied = copyUsingJSON(sample);

console.timeEnd('json'); // json: 1.253s
```

JSON 문자열을 이용한 깊은 복사는 1.253s 걸렸다

## Structured Clone

Chrome 98, Node.js 17부터 지원하는 전역함수 `structuredClone`을 사용할 수도 있다

```js
const obj = { a: 1, b: { c: 100 } };

const cloned = structuredClone(obj);

assert.notEqual(obj, cloned);

cloned[b][c] = 0;

assert.notEqual(obj[b][c], cloned[b][c]);
```

```js
// performance

const sample = createSample();

console.time('structuredClone');

const copied = structuredClone(sample);

console.timeEnd('structuredClone'); // structuredClone: 2.549s
```

`structuredClone`은 2.549s 걸렸다

## Recursive Shallow Copy

앞에서 설명한 방법들은 깊은 복사만 하는 게 아니기 때문에 다소 느리다

속도가 중요하다면 검증된 라이브러리를 이용하거나 재귀함수를 이용해 얕은 복사를 반복하면 된다

```js
/**
단순 재귀 복사
얕은 복사를 반복
@template T
@param {T} obj
@returns {T} */
const recursiveShallowClone = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const cloned = new obj.constructor();
  for (const key in obj) cloned[key] = recursiveShallowClone(obj[key]);
  return cloned;
};

// test
const obj = { a: 1, b: { c: 100 } };

const cloned = recursiveShallowClone(obj);

assert.notEqual(obj, cloned);

cloned[b][c] = 0;

assert.notEqual(obj[b][c], cloned[b][c]);
```

```js
// performance

const sample = createSample();

console.time('recursiveShallowClone');

const copied = recursiveShallowClone(sample);

console.timeEnd('recursiveShallowClone'); // recursiveShallowClone: 1.207s
```

재귀 얕은 복사는 1.207s 걸렸다

# Conclusion

| 방식            | 걸린 시간(ms) |
| --------------- | ------------- |
| recursion       | 1207.0        |
| JSON            | 1253.0        |
| structuredClone | 2549.0        |

단순 재귀 복사는 JSON 방식에 비해 근소하게 빨랐다

JSON 방식은 `structuredClone`보다 약 2배 빨랐다

`structuredClone`이 느린 이유는 다른 방식들보다 많은 작업을 하기 때문이다

예를 들어 `structuredClone`은 순환참조가 있는 객체도 복사할 수 있다

```js
const circular = { apple: 1 };
// 자기 자신을 참고하는 객체
circular.banana = circular;

const clonedByJSON = JSON.parse(JSON.stringify(circular)); // 오류
const clonedByRecursion = recursiveShallowClone(circular); // 오류
const clonedByStructuredClone = structuredClone(circular); // 성공
```

반면 함수는 복사하지 못한다

```js
const instance = new (class {
  constructor() {
    this.name = 'asd';
    this.obj = { apple: [1, 2, 3] };
  }
  log() {
    console.log(this.obj);
  }
})();

const clonedByJSON = JSON.parse(JSON.stringify(circular));
clonedByJSON.log(); // Error: clonedByJSON.log is not a function
const clonedByRecursion = recursiveShallowClone(circular);
clonedByRecursion.log(); // 성공. 그러나 이 경우 log 함수는 원본과 같은 함수다
const clonedByStructuredClone = structuredClone(circular);
clonedByStructuredClone.log(); // Error: clonedByJSON.log is not a function
```

# References

- [JSON.stringify()](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [JSON.parse()](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
- [Deep copy](https://developer.mozilla.org/en-US/docs/Glossary/Deep_copy)
