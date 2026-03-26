---
title: 매개변수 변경 알리기
date: '2023-07-30'
tags: ['clean-code']
draft: false
summary: 사이드 이펙트를 사용자에게 알려 버그를 줄이자
images: []
layout: PostSimple
authors: ['default']
---




# Introduction

철수는 다음과 같이 dfs를 구현했다

```js
/**
@param { [number, number] } point board 상 현재 위치
@param { number[][] } board 탐색할 배열
@param { boolean[][] } visited 방문 체크
@returns { number } 탐색한 cell의 수
 */
const dfs = (point, board, visited) => {
  const [r, c] = point
  // 이미 방문했거나 갈 수 없는 곳이면 탐색 종료
  if (visited[r][c] || !board[r][c]) return 0

  // ⚠ 변경 발생
  visited[r][c] = true

  // 움직일 수 있는 쪽으로 탐색 진행
  const count = [directions]
    .map((next) => dfs(next, board, visited))
    .reduce((acc, curr) => acc + curr, 0)

  return count + 1
}
```

어느날 철수와 협업하는 영희는 board를 탐색할 일이 생겼다

비슷한 경우가 있는지 찾아본 영희는 dfs를 사용하고 있는 코드를 보고는 그대로 따라하기로 했다

```js
import { dfs } from 'utils';

const searchInBoard = () => {
  ...
  let count = 0;
  count += dfs(point0, board, visited);
  count += dfs(point1, board, visited);
  ...
};
```

영희는 서로 다른 두 점(point0, point1)에서 시작해 board를 탐색하고자 했다

그러나 생각하는 방식대로 작동하지 않았다

어떤 경우에는 잘 작동했지만 어떤 경우에는 그렇지 않았다

결국 버그를 찾기 위해 영희는 긴 여행을 떠났다

searchInBoard 함수의 첫 번째 줄에 break point를 걸고 디버깅을 시작했고 443번 줄에 있는 dfs가 문제인 걸 발견한 건 먼 미래의 일이었다

...

이런 비극이 발생한 이유는 dfs 함수가 인자로 받은 visited를 변경했기 때문이다

```js
// visited 변경!
count += dfs(point0, board, visited)
// 변경된 visited를 그대로 사용
// 즉, 몇몇 지점을 이미 방문한 것으로 간주하고 가지 않는다
count += dfs(point1, board, visited)
```

그렇다면 어떻게 해야 이런 문제를 예방할 수 있을까?

# Denote Mutation

영희가 dfs 함수가 visited를 변경한다는 걸 미리 알았다면 코드를 이렇게 작성했을 것이다

```js
count += dfs(point0, board, visited)
// visited 배열을 false로 초기화
clear(visited)
count += dfs(point1, board, visited)
```

또는

```js
count += dfs(point0, board, visited)
// 새로운 visited 배열 생성
const newVisited = Array.from(board, () => Array.from(board[0], () => false))
count += dfs(point1, board, newVisited)
```

바꿔 말하면 함수를 만든 철수가 영희에게 충분한 정보를 제공하지 않았기 때문에 벌어진 일이라고 볼 수 있다

## Returns nothing

어떤 함수가 아무것도 반환하지 않는다면 그 함수는 side effect를 발생시킬 거라고 예상할 수 있다

그렇지 않다면 그 함수는 존재할 이유가 없기 때문이다

❗ JavaScript에서는 명시적으로 반환하지 않거나 값 없이 반환하면 `undefined`를 반환한다

```diff
/**
@param { [number, number] } point board 상 현재 위치
@param { number[][] } board 탐색할 배열
@param { boolean[][] } visited 방문 체크
+@param { (point: [number, number]) => void } 탐색에 성공했을 때 실행될 함수
-@returns { number } 탐색한 cell의 수
+@returns { void }
 */
-const dfs = (point, board, visited) => {
+const dfs = (point, board, visited, cb) => {
  const [r, c] = point;
  // 이미 방문했거나 갈 수 없는 곳이면 탐색 종료
-  if (visited[r][c] || !board[r][c]) return 0;
+  if (visited[r][c] || !board[r][c]) return;

  // ⚠ 변경 발생
  visited[r][c] = true;
+  cb(point);

  // 움직일 수 있는 쪽으로 탐색 진행
-  const count = [directions]
-    .map((next) => dfs(next, board, visited))
-    .reduce((acc, curr) => acc + curr, 0);
+  for (const next of directions) {
+    dfs(next, board, visited, cb);
+  }

-  return count + 1;
};
```

영희는 함수 시그니처를 보고 dfs 함수가 side effect를 발생시킬 거라고 추측할 수 있다

## Naming convention

Julia나 Clojure 같은 함수형 언어들은 순수하지 않은 함수를 나타내기 위해 함수 이름 끝에 느낌표를 붙인다

```js
const dfs! = (point, board, visited) => {
  ...
};
```

그러나 JavaScript는 느낌표를 이름에 쓸 수 없다

대신 swift guideline을 따라 이렇게 이름을 지을 수 있다

`useDfs` : 비순수 함수

`usingDfs` : 순수 함수

## Mutate type

위에서 언급한 방법들만으론 부족하다

매개변수 중 어떤 것이 바뀔지는 모르기 때문이다

해결 방법은 두 가지가 있다

- 변경될 매개변수를 제외한 나머지를 읽기 전용이라고 표시
- 변경될 매개변수를 특별히 표시

두 번째가 더 간단해 보인다

변경 표시를 타입으로 나타내보자

```js
/**
@template T
@typedef {{
  -readonly [P in keyof T]: T[P];
}} Mutable
 */
```

객체의 속성에서 readonly를 지우는 generic type이다

이 타입을 사용하면 매개변수가 변경될 것임을 명시적으로 나타낼 수 있다

```diff
/**
@param { [number, number] } point board 상 현재 위치
@param { number[][] } board 탐색할 배열
-@param { boolean[][] } visited 방문 체크
+@param { Mutable<boolean[][]> } visited 방문 체크
@param { (point: [number, number]) => void } 탐색에 성공했을 때 실행될 함수
@returns { void }
 */
const dfs = (point, board, visited, cb) => {
  ...
};
```

프로젝트 내부적으로 매개변수를 변경하려면 반드시 Mutable을 사용한다는 규칙이 있다면 더욱 좋다

그러면 영희는 함수 시그니처만 보고 dfs 사용법을 추론할 수 있게 된다

1. dfs가 아무것도 반환하지 않기 때문에 이 함수가 비순수 함수임을 알고

2. 매개변수 중 visited가 Mutable 타입이므로 visited만 변경될 것임을 안다

따라서 dfs를 여러 번 사용할 때 visited를 공유하는 실수를 저지르지 않을 것이다

# References

[Bang convention](https://docs.julialang.org/en/v1/manual/style-guide/#bang-convention)

[Signature (functions)](https://developer.mozilla.org/ko/docs/Glossary/Signature/Function)

[Mutable type](https://github.com/microsoft/TypeScript/issues/24509)

[Unsafe Functions](https://github.com/bbatsov/clojure-style-guide#naming-unsafe-functions)

[How to distinguish mutating and pure functions in javascript?](https://stackoverflow.com/questions/67847038/how-to-distinguish-mutating-and-pure-functions-in-javascript)

[Strive for Fluent Usage](https://www.swift.org/documentation/api-design-guidelines/#strive-for-fluent-usage)

[Command–query separation](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation)
