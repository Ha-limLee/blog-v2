---
title: yarn workspace를 이용한 컴포넌트 분리
date: '2023-06-05'
tags: ['yarn', 'workspace', 'monorepo']
draft: false
summary: ''
images: []
layout: PostSimple
authors: ['default']
---

# Introduction

프론트엔드 프로젝트는 규모가 커질수록 다양한 라이브러리에 대한 의존성 또한 커진다

라이브러리들은 UI, UI 로직, 비즈니스 로직, 테스팅 등 역할도 다양하다

이렇게 의존성이 많아지면 몇 가지 문제가 있다

1. 프로젝트 전체를 파악하기 어렵다
2. 빌드 설정이 복잡해진다
3. lint & type check 시간이 길어진다

이런 문제들은 하나의 프로젝트를 작은 프로젝트들로 나눠서 해결할 수 있다

# Initial Structure

현재 프로젝트 구조는 이렇게 되어있다

```
src
  |- components
  |   |- TodoItem.jsx
  |   |- TodoList.jsx
  |- App.js
  |- index.js
  ⋮
```

간단한 Todo App이라서 당장은 문제가 없지만 컴포넌트가 많아지면 앞에서 언급한 문제가 발생할 수 있다

이 프로젝트에서 components를 분리해 MUI, Bootstrap 같은 라이브러리처럼 사용해보자

# Monorepo

하나의 저장소에 여러 프로젝트가 있는 걸 monorepo라고 한다

프론트엔드에서 monorepo를 구축하는 방법은 여러 가지가 있다

이번에는 yarn에서 제공하는 workspace 기능을 이용해 monorepo를 만들어보자

# Move files

기존 프로젝트의 node_modules를 삭제한다

공통 dependency는 root에 hoisting 되기 때문이다

```shell
rm -r node_modules
```

`packages`라는 폴더를 만들고 `components`를 이 폴더로 옮기자

※ packages 아래에 있는 폴더들을 프로젝트로 만들 것이다

```shell
mkdir packages && mv src/components packages/components
```

`packages` 폴더 아래 `front` 폴더를 만들고 나머지 파일들을 여기로 옮긴다

```shell
mkdir packages/front
ls -1 | grep -v "packages" | xargs -I {} mv {} packages/front/{}
```

옮긴 후 폴더 구조는 다음과 같다

```
packages
  |- components
  |     |- TodoItem.jsx
  |     |- TodoList.jsx
  |- front
        |- public
        |- src
        |- package.json
        ⋮
```

# Root Settings

monorepo 루트에 json 파일을 추가한다

_package.json_

```json
{
  "private": true,
  "name": "root",
  "workspaces": ["packages/*"],
  "scripts": {}
}
```

`"private": true`는 프로젝트를 배포하지 않는다는 뜻이다

추가로 .gitignore에 있는 /node_modules를 node_modules로 바꾼다

_.gitignore_

```diff
# dependencies
-/node_modules
+node_modules
/.pnp
.pnp.js
```

/node_modules로 되어 있으면 root에 있는 node_modules만 제외되기 때문에 workspace에 있는 node_modules가 git에 잡힌다

**/node_modules 제외할 때**

![](/static/images/yarn-workspace/gitignore-before.png)

**node_modules 제외할 때**

![](/static/images/yarn-workspace/gitignore-after.png)

# Workspace Settings

components workspace에 json 파일을 추가한다

_packages/components/package.json_

```json
{
  "private": true,
  "name": "components",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0"
  },
  "scripts": {}
}
```

react 버전은 `packages/front`에서 가져왔다

components를 front workspace에 등록하자

_packages/front/package.json_

```diff
{
  "private": true,
  "name": "front",
  "dependencies": {
+    "components": "1.0.0",
```

# Install Packages

이제 의존성을 설치하자

```shell
yarn
```

설치 후 repo 전체 구조는 다음과 같다

![](/static/images/yarn-workspace/yarn-inst-after.png)

# Inspect node_modules

node_modules를 살펴보자

**components workspace**

components workspace에는 node_modules가 없다

components가 사용하는 package인 react는 root로 hoisting 되었기 때문이다

**front workspace**

front workspace에는 node_modules가 있다

이 workspace에서만 사용하는 파일들이 있고 나머지는 모두 hoisting 되었다

![](/static/images/yarn-workspace/front-node_modules.png)

**root**

root의 node_modules에는 hoisting 된 패키지들이 있다

![](/static/images/yarn-workspace/root-node_modules.png)

여기에는 components workspace도 있다

![](/static/images/yarn-workspace/root-node_modules-components.png)

front workspace에서 components workspace를 사용하기 때문에 root의 node_modules에 등록된 것이다

다른 패키지와는 다르게 workspace를 이어준 것이기 때문에 symbolic link로 생성되었다

# Run Application

front workspace로 가서 react app을 실행해보자

```shell
yarn start
```

실행하면 이런 오류가 발생한다

![](/static/images/yarn-workspace/react-start-error.png)

components를 분리했는데 아직 상대경로로 참조하고 있기 때문에 오류가 발생했다

상대경로 대신 모듈 이름으로 가져오자

```diff
// @ts-check
import React, { useState } from 'react';

-import { TodoList } from './components/TodoList';
+import { TodoList } from 'components/TodoList';
```

변경하니 이런 오류가 발생했다

![](/static/images/yarn-workspace/react-start-error;unexpected-token.png)

JSX 구문을 파싱하지 못하고 있다

react app은 create-react-app(CRA)으로 시작했는데 CRA는 현재 프로젝트에 있는 파일만 읽는다

즉, 다른 프로젝트인 components는 js로 transfile 되지 않는다

이 문제를 해결하기 위해서는 CRA의 webpack 설정을 바꿔 babel이 components 파일을 빌드에 포함하도록 해야한다

webpack 설정을 바꾸기 위해 craco를 사용하자

```shell
yarn add -D @craco/craco
```

craco 설정 파일을 추가한다

_craco.config.js_

```js
const path = require('path')
const { getLoader, loaderByName } = require('@craco/craco')
const absolutePath = path.join(__dirname, '../components')
module.exports = {
  webpack: {
    alias: {},
    plugins: [],
    configure: (webpackConfig, { env, paths }) => {
      const { isFound, match } = getLoader(webpackConfig, loaderByName('babel-loader'))
      if (isFound) {
        const include = Array.isArray(match.loader.include)
          ? match.loader.include
          : [match.loader.include]
        match.loader.include = include.concat[absolutePath]
      }
      return webpackConfig
    },
  },
}
```

craco 설정 파일을 사용하기 위해 scripts를 바꾼다

_packages/front/package.json_

```diff
"scripts": {
-  "start": "react-scripts start",
-  "build": "react-scripts build",
-  "test": "react-scripts test",
-  "eject": "react-scripts eject"
+  "start": "craco start",
+  "build": "craco build",
+  "test": "craco test",
+  "eject": "craco eject"
},
```

다시 실행해보자

![](/static/images/yarn-workspace/craco-start.png)

이제 오류가 발생하지 않는다

그런데 CSS가 제대로 적용되지 않았다

Tailwind CSS를 사용하고 있기 때문에 Tailwind 설정에 components를 추가해줘야 한다

```diff
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
+    "../components/**/*.{js,jsx,ts,tsx}",
  ],
}
```

이제 CSS도 잘 적용된다!

![](/static/images/yarn-workspace/craco-tailwind.png)

# References

1. [Monorepo](https://en.wikipedia.org/wiki/Monorepo)
2. [yarn workspace란 (with yarn v1)](https://velog.io/@proshy/yarn-workspace%EB%9E%80)
3. [Workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/)
4. [Using Create-React-App In A Monorepo](https://frontend-digest.com/using-create-react-app-in-a-monorepo-a4e6f25be7aa)
