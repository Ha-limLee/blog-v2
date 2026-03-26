---
title: redux legacy에 타입 적용하기 - 2
date: '2023-04-28'
tags: ['redux-legacy', 'jsdoc']
draft: false
summary: union action type 다루기
images: []
layout: PostSimple
authors: ['default']
---

# Introduction

[저번 시간](redux-legacy)에는 redux legacy 환경에서 간단한 타입을 적용해봤다

이번에는 reducer에서 union action type을 처리해보자

⚠ redux 개발진은 [union payload type을 권장하지 않는다](https://redux.js.org/usage/usage-with-typescript#avoid-action-type-unions)

# Objective

- handleActions에서 union action type을 적용

# Union Payload Type

저번 action 코드를 보자

`src/features/todo/action.js`

```js
// @ts-check
import { createAction } from 'redux-actions'

/**
 * @typedef {import("./api").Todo} Todo
 */

export const SET_TODO = 'Todo/ADD_TODO'
export const setTodo = /** @type {typeof createAction<Todo>} */ (createAction)(SET_TODO)
```

여기에 Todo를 삭제하는 액션을 추가하자

```js
export const REMOVE_TODO = 'Todo/REMOVE_TODO'
export const removeTodo = /** @type {typeof createAction<Pick<Todo, 'id'>['id']>} */ (createAction)(
  REMOVE_TODO
)
```

`Pick<Todo, 'id'>['id']`는 `number`다

즉, `removeTodo`는 `payload`로 `number`를 받는 액션이다

이 액션을 reducer에 추가하자

```diff
diff --git a/packages/redux-legacy-1/src/features/todo/reducer.js b/packages/redux-legacy-1/src/features/todo/reducer.js
index aae880b..a6d4c6e 100644
--- a/packages/redux-legacy-1/src/features/todo/reducer.js
+++ b/packages/redux-legacy-1/src/features/todo/reducer.js
@@ -1,6 +1,7 @@
 // @ts-check
 import { handleActions } from "redux-actions";
 import { SET_TODO } from "./action";
+import { REMOVE_TODO } from "./action";

 /**
  * @typedef {import("./api").Todo} Todo
@@ -24,6 +25,12 @@ export default handleTodoActions(
         [payload.id]: { ...payload },
       };
     },
+    [REMOVE_TODO]: (state, { payload }) => {
+      delete state[payload];
+      return {
+        ...state,
+      };
+    }
   },
   initialState,
 );
```

이렇게 하면 타입 에러가 발생한다

![](/static/images/redux-legacy-2/remove-todo-type-error.png)

`payload`가 `Todo`이기 때문이다

`payload` 타입에 `removeTodo`의 `payload` 타입을 추가하자

```diff
diff --git a/packages/redux-legacy-1/src/features/todo/reducer.js b/packages/redux-legacy-1/src/features/todo/reducer.js
index aae880b..a6d21a6 100644
--- a/packages/redux-legacy-1/src/features/todo/reducer.js
+++ b/packages/redux-legacy-1/src/features/todo/reducer.js

@@ -14,7 +15,7 @@ import { SET_TODO } from "./action";
 const initialState = {};

 const handleTodoActions =
-  /** @type {typeof handleActions<typeof initialState, Todo>} */ (handleActions);
+  /** @type {typeof handleActions<typeof initialState, Todo | Pick<Todo, 'id'>['id']>} */ (handleActions);

 export default handleTodoActions(
   {
```

이러면 reducer의 payload 타입이 `Todo | number`가 됐지만 또 다른 문제가 발생한다

![](/static/images/redux-legacy-2/set-todo-type-error-with-union.png)

`SET_TODO`는 payload로 `Todo`만을 받아야 하는데 `number`도 받을 수 있어서 문제가 생겼다

이 두 타입 중 하나로 좁혀야 하는데 `handleActions`와 같은 구조에서는 그렇게 할 수 없다

# Discriminated Union Type

[타입 좁히기(Narrowing)](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)를 이용하면 우리 의도대로 타입을 지정할 수 있는데

이걸 잘 쓰면 [union type을 분리](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions)할 수 있다

관습적으로 redux 사용자들은 다음과 같이 reducer를 작성했다

```js
/**
 * @typedef {|
 *   { type: 'Todo/SET_TODO'; payload: Todo; } |
 *   { type: 'Todo/REMOVE_TODO'; payload: Pick<Todo, 'id'>['id']; }
 * } TodoActions
 */

/**
 *
 * @param {InitialState} state
 * @param {TodoActions} action
 */
function reducer(state, { type, payload }) {
  switch (type) {
    case 'Todo/SET_TODO':
      return {
        ...state,
        [payload.id]: { ...payload },
      }
    case 'Todo/REMOVE_TODO':
      delete state[payload]
      return {
        ...state,
      }
    default:
      return state
  }
}
```

이렇게 작성하면 각 case에 대해서 올바른 payload type을 얻을 수 있다

![](/static/images/redux-legacy-2/switch-case-set-todo.png)

![](/static/images/redux-legacy-2/switch-case-remove-todo.png)

개인적으로 switch-case로 reducer를 작성하는 것보다 `handleActions`와 같은 방식이 가독성이 좋다고 생각한다

그러나 `handleActions`는 `Object`를 인자로 받을 뿐이기 때문에 type narrowing을 할 수 없다

이런 문제를 어떻게 해결할 수 있을까?

# Type Assertion

때로는 우리가 TS보다 type을 잘 안다고 확신할 때가 있다

그럴 때 [type assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)을 쓰면 된다

계획은 다음과 같다

1. 기존 `handleActions(reducerMap, initialState)`와 같은 parameter를 가지는 새로운 함수 `handleTodoActions` 정의
2. `handleTodoActions`에서 `handleAction`을 이용해 reducer 객체를 하나씩 만든다
3. reducer들을 combineReducers로 합친다
4. type assertion으로 합친 reducer의 type을 바꾼다
5. 합친 reducer 반환

우선 `handleTodoActions`의 signature를 생각해보자

이 함수는 `reducerMap`과 `initialState`를 인자로 받는다

reducerMap은 `actionType`과 각 actionType에 대한 `reducer`를 가지고 있어야 한다

```js
/**
 * @template S
 * @typedef {{
 *  [SET_TODO]: (state: S, action: ReturnType<typeof setTodo>) => S;
 *  [REMOVE_TODO]: (state: S, action: ReturnType<typeof removeTodo>) => S;
 * }} TodoReducerMap
 */
```

그리고 return type은 기존 `handleActions`를 보면 된다

`node_modules/@types/redux-actions/index.d.ts`

```ts
export function handleActions<State, Payload>(
  reducerMap: ReducerMap<State, Payload>,
  initialState: State,
  options?: Options
): ReduxCompatibleReducer<State, Payload>
```

return type은 `ReduxCompatibleReducer<State, Payload>`이다

따라서 `handleTodoActions`의 return type은 `ReduxCompatibleReducer<State, Todo | Pick<Todo, 'id'>['id']>`가 되어야 한다

그럼 코드로 구현해보자

```js
/*
 * @template S
 * @param {TodoReducerMap<S>} reducerMap
 * @param {S} initialState
 */
const handleTodoActions = (reducerMap, initialState) => {
  const actionTypes = Object.keys(reducerMap)
  const reducers = actionTypes.reduce((acc, actionType) => {
    const reducer = reducerMap[actionType]
    acc[actionType] = handleAction(actionType, reducer, initialState)
    return acc
  }, {})

  const ret = combineReducers(reducers)

  /**
   * @template T
   * @typedef {T[keyof T]} ValueOf
   */

  /**
   * @template A
   * @typedef {A extends Action<infer P> ? P : never} ExtractPayload
   */

  /**
   * @typedef {|
   *  ExtractPayload<Parameters<ValueOf<typeof reducerMap>>[1]>
   * } Payloads
   */

  return /** @type {ReduxCompatibleReducer<S, Payloads>} */ (ret)
}
```

마지막에 type assertion으로 union payload가 들어가도록 했다

![](/static/images/redux-legacy-2/union-payload.png)

이제 payload의 타입이 제대로 잡힌다

![](/static/images/redux-legacy-2/type-assert-set-todo.png)

![](/static/images/redux-legacy-2/type-assert-remove-todo.png)

`combineReducers`에서도 잘 나온다

`src/features/reducers.js`

![](/static/images/redux-legacy-2/reducers-union-type.png)

store에도 잘 적용되었다

`src/app/store.js`

![](/static/images/redux-legacy-2/store-complete.png)
