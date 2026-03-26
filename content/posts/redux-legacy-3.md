---
title: redux legacy에 타입 적용하기 - 3
date: '2023-05-06'
tags: ['redux-legacy', 'jsdoc', 'redux-actions']
draft: false
summary: generic handleActions
images: []
layout: PostSimple
authors: ['default']
---

# Introduction

[저번 시간](redux-legacy-2)에는 Todo에 대한 union payload를 처리하는 `handleTodoActions`를 만들었다

이번에는 `handleTodoActions`을 확장해 임의의 union payload를 처리하는 `handleActions`를 만들어보자

# Objective

- generic handleActions 작성

# Generic handleActions

우선 `handleTodoActions`의 이름을 `handleActions`로 바꾸자

_src/features/todo/reducer.js_

```diff
diff --git a/packages/redux-legacy-2/src/features/todo/reducer.js b/packages/redux-legacy-2/src/features/todo/reducer.js
index 1435365..70f0a61 100644
--- a/packages/redux-legacy-2/src/features/todo/reducer.js
+++ b/packages/redux-legacy-2/src/features/todo/reducer.js
@@ -1,5 +1,5 @@
 // @ts-check
-import { handleActions, handleAction } from "redux-actions";
+import { handleAction } from "redux-actions";
 import { SET_TODO, REMOVE_TODO } from "./action";
 import { combineReducers } from "redux";

@@ -32,7 +32,7 @@ const initialState = {};
  * @param {TodoReducerMap<S>} reducerMap
  * @param {S} initialState
  */
-const handleTodoActions = (reducerMap, initialState) => {
+const handleActions = (reducerMap, initialState) => {
   const actionTypes = Object.keys(reducerMap);
   const reducers = actionTypes.reduce((acc, actionType) => {
     const reducer = reducerMap[actionType];
@@ -60,7 +60,7 @@ const handleTodoActions = (reducerMap, initialState) => {
   return /** @type {ReduxCompatibleReducer<S, Payloads>} */(ret);
 };

-export default handleTodoActions(
+export default handleActions(
   {
     [SET_TODO]: (state, { payload }) => {
       return {

```

인자로 받는 `reducerMap`을 generic하게 바꾼다

```diff
diff --git a/packages/redux-legacy-3/src/features/todo/reducer.js b/packages/redux-legacy-3/src/features/todo/reducer.js
index 70f0a61..d7f5e93 100644
--- a/packages/redux-legacy-3/src/features/todo/reducer.js
+++ b/packages/redux-legacy-3/src/features/todo/reducer.js
@@ -29,7 +29,11 @@ const initialState = {};

 /**
  * @template S
- * @param {TodoReducerMap<S>} reducerMap
+ * @template P
+ * @template {{
+ *  [K: string]: (state: S, action: {type: string; payload: P}) => S;
+ * }} M
+ * @param {M} reducerMap
  * @param {S} initialState
  */
 const handleActions = (reducerMap, initialState) => {

```

generic reducerMap에서 payload의 타입을 추출한다

```diff
diff --git a/packages/redux-legacy-3/src/features/todo/reducer.js b/packages/redux-legacy-3/src/features/todo/reducer.js
index d7f5e93..b156e7e 100644
--- a/packages/redux-legacy-3/src/features/todo/reducer.js
+++ b/packages/redux-legacy-3/src/features/todo/reducer.js
@@ -51,13 +51,15 @@ const handleActions = (reducerMap, initialState) => {
    */

   /**
-   * @template A
-   * @typedef {A extends Action<infer P> ? P : never} ExtractPayload
+   * @template F
+   * @typedef {|
+   *  F extends (state: S, action: {type: string; payload: infer P}) => S ? P : never
+   * } ExtractPayload
    */

   /**
    * @typedef {|
-   *  ExtractPayload<Parameters<ValueOf<typeof reducerMap>>[1]>
+   *  ExtractPayload<ValueOf<typeof reducerMap>>
    * } Payloads
    */

```

이제 타입이 어떻게 잡히는지 보자

![](/static/images/redux-legacy-3/payload-any.png)

payload가 `any`로 나온다

왜냐하면 인자로 받은 reduceMap 객체의 payload가 `any`이기 때문이다

![](/static/images/redux-legacy-3/argument-payload-any.png)

`handleActions`를 사용하는 쪽에서 타입을 정해야 한다

```diff
diff --git a/packages/redux-legacy-3/src/features/todo/reducer.js b/packages/redux-legacy-3/src/features/todo/reducer.js
index b156e7e..d774e89 100644
--- a/packages/redux-legacy-3/src/features/todo/reducer.js
+++ b/packages/redux-legacy-3/src/features/todo/reducer.js
@@ -68,13 +68,13 @@ const handleActions = (reducerMap, initialState) => {

 export default handleActions(
   {
-    [SET_TODO]: (state, { payload }) => {
+    [SET_TODO]: (state, /** @type {{payload: Todo}} */ { payload }) => {
       return {
         ...state,
         [payload.id]: { ...payload },
       };
     },
-    [REMOVE_TODO]: (state, { payload }) => {
+    [REMOVE_TODO]: (state, /** @type {{payload: Pick<Todo, 'id'>}} */ { payload }) => {
       delete state[payload.id];
       return {
         ...state,

```

이제 타입이 제대로 나오는지 보자

![](/static/images/redux-legacy-3/payload-type.png)

잘 나온다!

`handleActions`를 다른 곳에 옮겨 `User`에서 재사용하자

_src/app/actions.js_

```js
// @ts-check
import { handleAction } from 'redux-actions'
import { combineReducers } from 'redux'

/**
 * @template S, P
 * @typedef {|
 *  import("redux-actions").ReduxCompatibleReducer<S, P>
 * } ReduxCompatibleReducer
 */

/**
 * @template S
 * @template P
 * @template {{
 *  [K: string]: (state: S, action: {type: string; payload: P}) => S;
 * }} M
 * @param {M} reducerMap
 * @param {S} initialState
 */
export const handleActions = (reducerMap, initialState) => {
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
   * @template F
   * @typedef {|
   *  F extends (state: S, action: {type: string; payload: infer P}) => S ? P : never
   * } ExtractPayload
   */

  /**
   * @typedef {|
   *  ExtractPayload<ValueOf<typeof reducerMap>>
   * } Payloads
   */

  return /** @type {ReduxCompatibleReducer<S, Payloads>} */ (ret)
}
```

더이상 불필요한 코드를 제거한다

```diff
diff --git a/packages/redux-legacy-3/src/features/todo/action.js b/packages/redux-legacy-3/src/features/todo/action.js
index 781ea12..6907920 100644
--- a/packages/redux-legacy-3/src/features/todo/action.js
+++ b/packages/redux-legacy-3/src/features/todo/action.js
@@ -1,26 +1,14 @@
 // @ts-check
 import { createAction } from "redux-actions";

-/**
- * @template T1, R
- * @typedef {import("redux-actions").ActionFunction1<T1, R>} ActionFunction1
- */
-
 /**
  * @typedef {import("./api").Todo} Todo
  */

 export const SET_TODO = 'Todo/ADD_TODO';
-export const setTodo = /** @type {typeof createAction<Todo>} */ (createAction)(SET_TODO);
+export const setTodo =
+  /** @type {typeof createAction<Todo>} */ (createAction)(SET_TODO);

 export const REMOVE_TODO = 'Todo/REMOVE_TODO';
 export const removeTodo =
   /** @type {typeof createAction<Pick<Todo, 'id'>>} */ (createAction)(REMOVE_TODO);
-
-/**
- * @template T
- * @typedef {{
- *  [SET_TODO]: (state: T, action: ReturnType<typeof setTodo>) => T;
- *  [REMOVE_TODO]: (state: T, action: ReturnType<typeof removeTodo>) => T;
- * }} TodoReducerMap
- */
diff --git a/packages/redux-legacy-3/src/features/todo/reducer.js b/packages/redux-legacy-3/src/features/todo/reducer.js
index d774e89..a2cf651 100644
--- a/packages/redux-legacy-3/src/features/todo/reducer.js
+++ b/packages/redux-legacy-3/src/features/todo/reducer.js
@@ -1,24 +1,6 @@
 // @ts-check
-import { handleAction } from "redux-actions";
+import { handleActions } from "../../app/actions";
 import { SET_TODO, REMOVE_TODO } from "./action";
-import { combineReducers } from "redux";
-
-/**
- * @template S, P
- * @typedef {|
-*  import("redux-actions").ReduxCompatibleReducer<S, P>
-* } ReduxCompatibleReducer
-*/
-
-/**
- * @template Payload
- * @typedef {import("redux-actions").Action<Payload>} Action
- */
-
-/**
- * @template S
- * @typedef {import("./action").TodoReducerMap<S>} TodoReducerMap
- */

 /**
  * @typedef {import("./api").Todo} Todo
@@ -27,45 +9,6 @@ import { combineReducers } from "redux";
 /** @type {{ [id: Pick<Todo, 'id'>['id']]: Todo }} */
 const initialState = {};

-/**
- * @template S
- * @template P
- * @template {{
- *  [K: string]: (state: S, action: {type: string; payload: P}) => S;
- * }} M
- * @param {M} reducerMap
- * @param {S} initialState
- */
-const handleActions = (reducerMap, initialState) => {
-  const actionTypes = Object.keys(reducerMap);
-  const reducers = actionTypes.reduce((acc, actionType) => {
-    const reducer = reducerMap[actionType];
-    acc[actionType] = handleAction(actionType, reducer, initialState);
-    return acc;
-  }, {});
-  const ret = combineReducers(reducers);
-
-  /**
-   * @template T
-   * @typedef {T[keyof T]} ValueOf
-   */
-
-  /**
-   * @template F
-   * @typedef {|
-   *  F extends (state: S, action: {type: string; payload: infer P}) => S ? P : never
-   * } ExtractPayload
-   */
-
-  /**
-   * @typedef {|
-   *  ExtractPayload<ValueOf<typeof reducerMap>>
-   * } Payloads
-   */
-
-  return /** @type {ReduxCompatibleReducer<S, Payloads>} */(ret);
-};
-
 export default handleActions(
   {
     [SET_TODO]: (state, /** @type {{payload: Todo}} */ { payload }) => {

```

`User`에 action을 추가한다

```diff
diff --git a/packages/redux-legacy-3/src/features/user/action.js b/packages/redux-legacy-3/src/features/user/action.js
index 19e49fd..4d607a0 100644
--- a/packages/redux-legacy-3/src/features/user/action.js
+++ b/packages/redux-legacy-3/src/features/user/action.js
@@ -7,3 +7,7 @@ import { createAction } from "redux-actions";

 export const EDIT_USER = 'User/EDIT_USER';
 export const editUser = /** @type {typeof createAction<User>} */ (createAction)(EDIT_USER);
+
+export const REMOVE_USER = 'User/REMOVE_USER';
+export const removeUser =
+  /** @type {typeof createAction<Pick<User, 'userId'>>} */ (createAction)(REMOVE_USER);

```

action을 reducer에 추가한다

```diff
diff --git a/packages/redux-legacy-3/src/features/user/reducer.js b/packages/redux-legacy-3/src/features/user/reducer.js
index f22f673..b8b1c1b 100644
--- a/packages/redux-legacy-3/src/features/user/reducer.js
+++ b/packages/redux-legacy-3/src/features/user/reducer.js
@@ -1,6 +1,6 @@
 // @ts-check
-import { handleActions } from "redux-actions";
-import { EDIT_USER } from "./action";
+import { handleActions } from "../../app/actions";
+import { EDIT_USER, REMOVE_USER } from "./action";

 /**
  * @typedef {Object} User
@@ -16,12 +16,19 @@ const initialState = {

 export default handleActions(
   {
-    [EDIT_USER]: (state, { payload }) => {
+    [EDIT_USER]: (state
+      , /** @type {{payload: User}} */ { payload }) => {
       return {
         ...state,
         userName: payload.userName,
       }
     },
+    [REMOVE_USER]: (state, /** @type {{payload: Pick<User, 'userId'>}} */ { payload }) => {
+      delete state[payload.userId];
+      return {
+        ...state,
+      };
+    },
   },
   initialState,
);

```

결과는?

![](/static/images/redux-legacy-3/payload-user.png)

역시 잘 나온다!

dispatch해도 타입 오류가 발생하지 않는다

![](/static/images/redux-legacy-3/dispatch-removeUser.png)

# Avoid Hard Coding

payload의 타입을 하드코딩 하고 있는데 이런 방식은 좋지 않다

action이 바뀔 수 있기 때문이다

action 생성자에 ReturnType을 적용해 타입을 유도하자

```diff
diff --git a/packages/redux-legacy-3/src/features/user/reducer.js b/packages/redux-legacy-3/src/features/user/reducer.js
index b8b1c1b..dc81add 100644
--- a/packages/redux-legacy-3/src/features/user/reducer.js
+++ b/packages/redux-legacy-3/src/features/user/reducer.js
@@ -1,6 +1,6 @@
 // @ts-check
 import { handleActions } from "../../app/actions";
-import { EDIT_USER, REMOVE_USER } from "./action";
+import { editUser, EDIT_USER, removeUser, REMOVE_USER } from "./action";

 /**
  * @typedef {Object} User
@@ -16,14 +16,15 @@ const initialState = {

 export default handleActions(
   {
-    [EDIT_USER]: (state
-      , /** @type {{payload: User}} */ { payload }) => {
+    [EDIT_USER]: (state,
+      /** @type {ReturnType<editUser>} */ { payload }) => {
       return {
         ...state,
         userName: payload.userName,
       }
     },
-    [REMOVE_USER]: (state, /** @type {{payload: Pick<User, 'userId'>}} */ { payload }) => {
+    [REMOVE_USER]: (state,
+      /** @type {ReturnType<removeUser>} */ { payload }) => {
       delete state[payload.userId];
       return {
         ...state,

```

# References

[TypeScript 최신 기능을 활용한 Redux 액션 타이핑](https://medium.com/@seungha_kim_IT/typescript-%EC%B5%9C%EC%8B%A0-%EA%B8%B0%EB%8A%A5%EC%9D%84-%ED%99%9C%EC%9A%A9%ED%95%9C-redux-%EC%95%A1%EC%85%98-%ED%83%80%EC%9D%B4%ED%95%91-ef46fff8850b)
