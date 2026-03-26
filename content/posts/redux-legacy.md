---
title: redux legacy에 타입 적용하기 - 1
date: '2023-04-16'
tags: ['redux-legacy', 'jsdoc']
draft: false
summary: jsdoc을 이용한 타입 적용
images: ['/static/images/store-type-complete.png']
layout: PostSimple
authors: ['default']
---





# Introduction

redux 개발진은 redux toolkit(RTK)이라는 새로운 방식을 열심히 홍보하고 있다

공식문서는 물론이고 코드 상에서도 기존 방식을 사용하면 안 될 것처럼 해놓았다

![createStore deprecated](/static/images/redux-legacy/deprecated.png)

개발진은 RTK가 기존 redux(이하 redux legacy)에 비해서 여러 장점이 있다고 한다

- TypeScript를 제대로 쓸 수 있고
- Boilerplate를 제거하며
- RTK Query를 사용해 Data fetching을 쉽게 할 수 있고
- ...

그러나 이런 장점들이 정말 체감 될까?

기존 방식으로 충분하지 않을까?

직접 고생하며 알아보자

전체 코드는 [여기](https://github.com/Ha-limLee/redux-legacy)에서 볼 수 있다

# Objective

- redux-legacy를 이용한 store 만들기
- jsdoc을 이용해 타입 적용

# Setting

create-react-app으로 react 프로젝트 설치

```shell
$ yarn create react-app redux-legacy
```

라이브러리 설치

```shell
$ cd redux-saga
$ yarn add redux react-redux redux-actions
$ yarn add -D @types/react-redux @types/redux-actions
```

# Sample App

간단한 Todo 앱을 만들어보자

fetch code 작성

```js
// src\features\todo\api.js

/**
 * @typedef {Object} Todo
 * @prop {number} userId
 * @prop {number} id
 * @prop {string} title
 * @prop {boolean} completed
 */

/**
 * @param {number} id
 */
export const getTodo = async (id) => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
  /** @type {Todo} */
  const data = await res.json()
  return data
}
```

action 작성

```js
// src\features\todo\action.js

import { createAction } from 'redux-actions'

/**
 * @typedef {import("./api").Todo} Todo
 */

export const SET_TODO = 'SET_TODO'
export const setTodo = /** @type {typeof createAction<Todo>} */ (createAction)(SET_TODO)
```

reducer 작성

```js
// src\features\todo\reducer.js

// @ts-check
import { handleActions } from 'redux-actions'
import { SET_TODO } from './action'

/**
 * @typedef {import("./api").Todo} Todo
 */

/**
 * @typedef {{ [id: Pick<Todo, 'id'>['id']]: Todo }} InitialState
 */

/** @type {InitialState} */
const initialState = {}

export default handleActions(
  {
    [SET_TODO]: (state, { payload }) => {
      return {
        ...state,
        [payload.id]: { ...payload },
      }
    },
  },
  initialState
)
```

이렇게 하면 타입이 이상하게 잡힌다

`payload`로 원하는 타입은 `Todo`인데 `handleActions`는 타입을 `InitialState`로 잡고 있다

![reducer type error](/static/images/redux-legacy/reducer-type-error.png)

이건 `handleActions`가 기본적으로 `initialState`와 같은 타입을 `payload`로 지정하기 때문이다

```ts
// node_modules\@types\redux-actions\index.d.ts:169

export function handleActions<StateAndPayload>(
  reducerMap: ReducerMap<StateAndPayload, StateAndPayload>,
  initialState: StateAndPayload,
  options?: Options
): ReduxCompatibleReducer<StateAndPayload, StateAndPayload>
```

`handleActions`에 State와 Payload 타입을 주자

```diff
...

+ const handleTodoActions =
+   /** @type {typeof handleActions<typeof initialState, Todo>} */ (handleActions);

- export default handleActions(
+ export default handleTodoActions(
  {
    [SET_TODO]: (state, { payload }) => {
      return {
        ...state,
        [payload.id]: { ...payload },
      };
    },
  },
  initialState,
);

```

같은 방식으로 userReducer를 만든다

한 명의 사용자만 있고 이 사용자의 이름을 바꾸는 기능만 제공한다고 하자

```js
// src\features\user\action.js

// @ts-check
import { createAction } from 'redux-actions'

/**
 * @typedef {import("./reducer").User} User
 */

export const EDIT_USER = 'User/EDIT_USER'
export const editUser = /** @type {typeof createAction<User>} */ (createAction)(EDIT_USER)
```

```js
// src\features\user\reducer.js

// @ts-check
import { handleActions } from 'redux-actions'
import { EDIT_USER } from './action'

/**
 * @typedef {Object} User
 * @prop {number} userId
 * @prop {string} userName
 */

/** @type {User} */
const initialState = {
  userId: 1,
  userName: 'James',
}

export default handleActions(
  {
    [EDIT_USER]: (state, { payload }) => {
      return {
        ...state,
        userName: payload.userName,
      }
    },
  },
  initialState
)
```

두 reducer를 `combineReducers`로 내보낸다

```js
// src\features\reducers.js

import { combineReducers } from 'redux'
import todoReducer from './todo/reducer'
import userReducer from './user/reducer'

export default combineReducers({
  todoReducer,
  userReducer,
})
```

store에 등록한다

```js
// src\store.js

import { createStore } from 'redux'
import reducers from './features/reducers'

const store = createStore(reducers)

export default store
```

여기서 문제가 발생한다

store 타입이 `any`다

![store type any](/static/images/redux-legacy/store-type-any.png)

타입을 직접 적어주자..

`reducers`로부터 Type parameter를 추출해야 한다[^1]

```js
// src\app\store.js

// @ts-check
import { legacy_createStore as createStore } from 'redux'
import reducers from '../features/reducers'

/**
 * @template S
 * @template {AnyAction} A
 * @typedef {import("redux").Reducer<S, A>} Reducer
 */

/**
 * Reducer로부터 State type을 추출하는 Utility type
 * @template P
 * @typedef {P extends Reducer<infer T, Object> ? T : never} ExtractState
 */

/**
 * Reducer로부터 Action type을 추출하는 Utility type
 * @template P
 * @typedef {P extends Reducer<Object, infer U extends AnyAction> ? U : never} ExtractAction
 */

/**
 * @typedef {ExtractState<typeof reducers>} State
 * @typedef {ExtractAction<typeof reducers>} Action
 */

/**
 * @typedef {import("redux").Store<State, Action>} Store
 * @typedef {import("redux").AnyAction} AnyAction
 */

/** @type {Store} */
const store = createStore(reducers)

export default store
```

드디어 store의 타입이 제대로 나온다!

![store type complete](/static/images/redux-legacy/store-type-complete.png)

여기에 Helper type을 추가하자[^2]

```diff
// src\app\store.js

...

/** @type {Store} */
const store = createStore(reducers);

+ /**
+  * @typedef {typeof store.dispatch} AppDispatch
+  * @typedef {ReturnType<typeof store.getState>} RootState
+  */

export default store;

```

이제 타입을 적용한 `useSelector`와 `useDispatch`를 정의할 수 있다[^3]

```js
// src\app\hooks.js

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

/**
 * @typedef {import("./store").RootState} RootState
 * @typedef {import("./store").AppDispatch} AppDispatch
 */

/** @type {() => AppDispatch} */
export const useAppDispatch = useDispatch

/** @type {TypedUseSelectorHook<RootState>} */
export const useAppSelector = useSelector
```

이 고생을 한 이유를 이제야 알 수 있다

`useAppDispatch`를 이용하면 Action 타입이 추론된다!

![dispatch type infer](/static/images/redux-legacy/dispatch-type-infer.png)

`useAppSelector`도 잘 작동한다

![selector type infer](/static/images/redux-legacy/selector-type-infer.png)

# References

[^1]: [TypeScript — Extract/Unpack a Type from a Generic](https://itnext.io/typescript-extract-unpack-a-type-from-a-generic-baca7af14e51)

[^2]: [Define Root State and Dispatch Types](https://react-redux.js.org/tutorials/typescript-quick-start#define-root-state-and-dispatch-types)

[^3]: [Define Typed Hooks](https://react-redux.js.org/tutorials/typescript-quick-start#define-typed-hooks)
