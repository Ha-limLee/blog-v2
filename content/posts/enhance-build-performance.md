---
title: esbuild를 이용한 빌드 시간 단축
date: '2023-09-09'
tags: ['webpack', 'esbuild']
draft: false
summary:
images: []
layout: PostSimple
authors: ['default']
---

# Introduction

Create React App(CRA)으로 구축된 개발환경의 빌드 시간 단축

# Environment

## Specs

| 프로세서    | Intel(R) Core(TM) i5-9600K CPU @ 3.70GHz 3.70 GHz |
| ----------- | ------------------------------------------------- |
| RAM         | 32.0GB(31.9GB 사용 가능)                          |
| 시스템 종류 | 64비트 운영 체제, x64 기반 프로세서               |

## Windows

| 에디션    | Windows 11 Pro |
| --------- | -------------- |
| 버전      | 22H2           |
| 설치 날짜 | 2023-‎02-‎03   |
| OS 빌드   | 22621.1265     |

# Build Test

## Using Babel

빌드 시간을 측정하기 위해서 Speed Measure Plugin(SMP)을 이용한다

⚠️ SMP 자체가 빌드를 느리게 하기 때문에 참고만 해야 한다

**SMP plugin 설치**

```bash
$ yarn add -D speed-measure-webpack-plugin
```

CRA에서 웹팩 설정을 바꾸기 위해 CRACO를 사용하고 있다

CRACO 설정에 SMP를 넣어준다

```jsx
// craco.config.js

...
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const smp = new SpeedMeasurePlugin();

module.exports = {
  webpack: {
    configure: (webpackConfig) => smp.wrap(webpackConfig),
  },
	...
};
```

웹팩은 빌드 작업을 수행할 때 node_modules/.cache 폴더에 캐시를 생성한다

정확한 성능 측정을 위해서 .cache가 없을 때 성능과 있을 때 성능을 비교한다

![](/static/images/enhance-build-performance/Untitled.png)


**.cache 없을 때 빌드 결과**

![](/static/images/enhance-build-performance/Untitled%201.png)



**6분 38.48초** 걸렸다

**.cache 있을 때 빌드 결과**

![](/static/images/enhance-build-performance/Untitled%202.png)



**3분 16.072초** 걸렸다

babel-loader가 전체 시간의 2/3가량 차지했다

babel-loader를 esbuild로 대체해보자

## Using Esbuild

Vite를 사용하면 좋겠지만 각종 설정이 웹팩에 크게 의존하고 있어 어려움이 있다

따라서 기존 환경에 esbuild plugin을 적용해 esbuild가 웹팩 대신 번들링하도록 만든다

**craco-esbuild plugin 설치**

```jsx
> yarn add -D craco-esbuild
```

설정 파일에 plugin을 추가한다

```jsx
// craco.config.js

...
const CracoEsbuildPlugin = require('craco-esbuild');

module.exports = {
	...
  plugins: [
		...
    {
      plugin: CracoEsbuildPlugin,
    },
  ],
};
```

테스트 시작!

**.cache 없을 때 빌드 결과**

![](/static/images/enhance-build-performance/Untitled%203.png)



**4분 29.71초** 걸렸다

**.cache 있을 때 빌드 결과**

![](/static/images/enhance-build-performance/Untitled%204.png)



**3분 9.025초** 걸렸다

# Conclusions

## Pros

|           | .cache 없을 때 | .cache 있을 때 |
| --------- | -------------- | -------------- |
| 기존      | 6분 38.48초    | 3분 16.072초   |
| esbuild   | 4분 29.71초    | 3분 9.025초    |
| 성능 향상 | 32.32%         | 3.59%          |

캐시가 없을 때 성능이 크게 향상하는 걸로 나타났다

## Cons

- esbuild가 만드는 코드는 es6 미만은 호환되지 않는다

es5까지 지원하는 IE 11는 빌드된 앱을 실행할 수 없다

- 수많은 babel plugin을 사용할 수 없음

예를 들어 babel macro를 이용하는 `typed-redux-saga/macro`는 사용할 수 없다

# References

환상적인 케미, Webpack + ESBuild
[https://tech.osci.kr/2022/11/23/환상적인-케미-webpack-esbuild/](https://tech.osci.kr/2022/11/23/%ED%99%98%EC%83%81%EC%A0%81%EC%9D%B8-%EC%BC%80%EB%AF%B8-webpack-esbuild/)

craco-esbuild
[https://github.com/pradel/create-react-app-esbuild/blob/main/packages/craco-esbuild/README.md](https://github.com/pradel/create-react-app-esbuild/blob/main/packages/craco-esbuild/README.md)
