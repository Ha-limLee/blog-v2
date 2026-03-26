---
title: Branded Type in TS
date: '2024-12-09'
tags: ['typescript']
draft: false
summary: Branded type을 이용해 런타임 오류 방지
images: []
layout: PostSimple
authors: ['default']
---
⚠️ TS v5.7.2 기준으로 작성됨

# 신입 개발자의 실수

다음과 같은 요구사항이 있다고 하자.

**요구사항**

- canvas에 새로운 도구 pencil을 추가
- 유저는 pencil을 써서 canvas에 그림을 그릴 수 있다
- (제약) point의 x, y 값은 정수여야 한다

코드로는 이렇게 모델링 할 것이다.

```ts
type Point = readonly [number, number];

function toInteger(p: Point): Point {
  return [Math.round(p[0]), Math.round(p[1])] as const;
}

type State = {
  points: Point[];
};

type Actions = {
  type: 'add';
  payload: Point;
};

function reducer(state: State, action: Actions): State {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        points: state.points.concat(toInteger(action.payload)),
      };
    default:
      return action.type satisfies never;
  }
}
```

...

이 코드를 작성한 후 몇 달이 지나 신입 개발자가 들어왔다. 신입은 첫 작업으로 canvas의 새 요구사항을 구현하게 됐다.

**요구사항**

- `shift`를 누른 채 pencil로 그리면 직선이 된다.

신입은 이렇게 구현했다.

```diff
 type Actions =
   | {
       type: "add";
       payload: Point;
     }
+  | {
+      type: "line";
+      payload: Point;
+    };

 function reducer(state: State, action: Actions): State {
   switch (action.type) {
     case "add":
       return {
         ...state,
         points: state.points.concat(toInteger(action.payload)),
       };
+    case "line":
+      return {
+        ...state,
+        points: [state.points[0], action.payload].filter((p) => p != null),
+      };
     default:
       return action satisfies never;
   }
 }

```

타입 오류가 없으니 신입은 작업을 마쳤다고 보고했고 이 코드는 고스란히 production build에 실렸다.

안타깝게도 신입의 생각과는 달리 서비스에서 곧바로 버그가 제보됐다. 서버에서 오류가 발생한 것이다!

디버깅을 해보니 원인은 새로 추가한 `line` action에 있었다. 프론트에서 서버로 x, y 값이 소수인 point를 보낸 것이다.

```ts {5,5}
case "line":
  return {
    ...state,
    // 💥 x, y가 소수인 point가 저장됨
    points: [state.points[0], action.payload].filter((p) => p != null),
  };
```

신입은 서둘러 `toInteger`를 적용해 문제를 해결했다.

```diff
 case "line":
   return {
     ...state,
     points: [state.points[0], action.payload]
       .filter((p) => p != null)
+      .map(toInteger),
   };
```

힘든 하루였다. 첫 작업에서 실수한 신입 개발자는 집으로 돌아가며 고민했다.

> 이런 실수를 미리 방지할 방법은 없을까?

# 정수 타입이 있었다면

이런 문제의 원인은 JavaScript(ES2020 이전)에서 정수와 소수를 구분하지 않기 때문이다.[^1] 만약 JS에 정수 타입이 있었다면 TS도 그랬을 것이고 `Point`를 이렇게 정의할 수 있었을 것이다.

```ts
type Point = readonly [integer, integer];
```

그렇게 했다면 `number`를 저장하려고 할 때 오류가 발생했을 것이고 서비스에서 버그가 발견되는 일은 없었을 것이다.

```ts {7,7}
function DrawingBoard(): React.JSX.Element {
  const [state, dispatch] = useBoardState();
  const [point, setPoint] = useState([0, 0] as const);

  const onMouseMove = () => {
    // 💥 TypeError: Type 'number' is not assignable to type 'integer'.
    dispatch({ type: 'line', payload: point });
  };

  return (
    // ...
  );
}
```

그러나 현재 TS에서는 이렇게 할 수 없다. `Branded type`을 사용하지 않는 한.

# Branded Type

정수 타입이 없다면 `number` 타입을 이용해 새로운 타입을 정의하면 될 일이다. 그러나 그냥 이름만 달라선 안 된다. TS 타입은 structural type system이기 때문에 이름이 달라도 구조가 같으면 같은 타입으로 취급하기 때문이다.

```ts
type Integer = number;

declare const num: number;

// 여기서 타입 오류를 내고 싶다!
// 그러나 지금은 오류가 안 난다. Integer와 number는 구조가 같기 때문이다.
const int: Integer = num;
```

그럼 새로운 속성을 추가하면 되지 않을까?

```diff
-type Integer = number;
+type Integer = number & { __tag: 'Integer' };
```

```ts
// 💥 TypeError: Type 'number' is not assignable to type 'Integer'.
const int: Integer = num;
```

이제 타입 오류가 난다! 이렇게 새로운 타입을 정의하는 방식을 `Branding`, `Branding`으로 만들어진 타입을 `Branded type`이라고 한다.

# 사상

타입을 만들었으니 `number`를 `Integer`로 사상(map)하는 함수를 하나 만들자.

```ts
function from(num: number): Integer {
  return Math.round(num) as Integer;
}
```

사상 함수는 두 가지 역할을 한다.

1. branded type이 무얼 뜻하는지 정의

   `Integer` 자체는 어떤 의미도 없는 이름에 불과하다. 여기에 '정수'라는 의미를 부여하려면 `Integer` 타입으로 사상하는 함수가 있어야 하며, 그 함수가 받은 값을 정수로 바꿔야 한다.

2. 타입 안전하지 않은 영역을 최소화

   일반적으로 branded type을 쓸 때는 타입 단언을 한다.[^2] 만약 사상 함수가 없으면 여기저기에서 타입 단언을 하게 되기 때문에 타입 안전하지 않은 영역이 커진다. 반면 사상 함수가 있으면, 타입 단언이 사상 함수 내부에서 한 번만 일어나기 때문에 타입 안전하지 않은 영역을 한 곳으로 좁힐 수 있다.

# tag가 겹치면 어쩌죠?

`Integer`와 전혀 다른 타입이 같은 `__tag`를 갖고 있다면 문제가 발생할 수 있다.

```ts {2,2}
// 실수로 Integer와 같은 tag를 사용
type Float = number & { __tag: 'Integer' };

declare const float: Float;

// Integer와 Float은 이름만 다를 뿐 같은 타입이므로 타입 오류가 발생하지 않음
const int: Integer = float;
```

이런 실수를 방지하기 위해서는 Symbol을 사용하면 된다.

```diff
+const integerSymbol = Symbol('Integer');

-type Integer = number & { __tag: 'Integer' };
+type Integer = number & { [integerSymbol]: unknown };
```

`Symbol()`은 항상 다른 값을 반환하기 때문에 중복 key 걱정을 안 해도 된다.

# 시간을 되돌려서

신입 개발자가 실수를 하지 않도록 해보자.

```ts
// Integer.ts

const integerSymbol = Symbol('Integer');
type Integer = number & { [integerSymbol]: unknown };

function from(num: number): Integer {
  return Math.round(num) as Integer;
}

// Integer를 타입이자 모듈로 취급
const Integer = Object.assign({}, { from });
export default Integer;
```

```ts
// reducer.ts

import Integer from './Integer';

type Point = readonly [Integer, Integer];

type State = {
  points: Point[];
};

type Actions =
  | {
      type: 'add';
      payload: Point;
    }
  | {
      type: 'line';
      payload: Point;
    };

export default function reducer(state: State, action: Actions): State {
  switch (action.type) {
    case 'add':
      return { ...state, points: state.points.concat(action.payload) };
    case 'line':
      return { ...state, points: [state.points[0], action.payload].filter((p) => p != null) };
    default:
      return action satisfies never;
  }
}
```

```tsx
// Canvas.tsx

import * as React from 'react';
import reducer from './reducer';

function Canvas() {
  const [state, dispatch] = React.useReducer(reducer, { points: [] });
  const [newPoint, setNewPoint] = React.useState([0, 0] as const);

  const onMouseMove = () => {
    // 💥 TypeError: Type 'number' is not assignable to type 'Integer'.
    dispatch({ type: 'line', payload: newPoint });
  };

  return <div>{/* ... */}</div>;
}
```

`number`를 저장하는 실수를 TS가 미리 알려준다! 그러므로 신입은 서비스에 잘못된 코드가 적용되기 전에 이렇게 고칠 것이다.

```diff
 import reducer from './reducer';
+import Integer from "./Integer";

 function Canvas() {

   const onMouseMove = () => {
-    dispatch({ type: 'line', payload: newPoint });
+    dispatch({
+      type: "line",
+      payload: [Integer.from(newPoint[0]), Integer.from(newPoint[1])],
+    });
   };

   return <div>{/* ... */}</div>;
 }
```

신입 개발자는 첫 업무를 무사히 마치고 홀가분한 마음으로 퇴근할 수 있게 되었다!

# 결론

Branded type을 이용하면 이와 같이 TS를 더 엄격하게 사용할 수 있다. 물론 장점만 있는 건 아니다. 사상 함수에서 타입 단언을 사용하기 때문에 함수의 로직이 타입 안전하다는 걸 개발자가 보장해야 한다. 그러므로 로직이 복잡해진다면 사상 함수에 대한 엄격한 테스트 코드를 작성하는 게 좋다.

[^1]: ES2020 이후엔 `BigInt`가 추가돼서 정수와 소수를 구분할 수 있다. 그러나 [BigInt 도입 의도](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)를 생각해보면 단순히 정수를 표현하기 위해 `BigInt`를 쓰는 건 좋지 않다.
[^2]: 타입 단언을 하지 않고 새롭게 추가한 속성(Integer의 경우 `__tag`)을 넣어줄 수도 있는데, 그러면 불필요한 값이 런타임에 추가되기 때문에 타입 단언을 하는 쪽을 선호한다.
