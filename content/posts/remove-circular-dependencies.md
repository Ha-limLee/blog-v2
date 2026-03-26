---
title: 순환참조 제거
date: 2023-12-07
tags:
  - circular-dependency
draft: false
summary:
images: []
layout: PostSimple
authors:
  - default
---





# 모듈 내부에서 해당 모듈을 참조하지 않도록 설정

_.eslintrc.json_

```tsx
"overrides": [
  ...
	{
	  "parser": "@typescript-eslint/parser",
	  "parserOptions": {
	    "project": "./tsconfig.json"
	  },
	  "plugins": ["@typescript-eslint"],
	  "files": ["./src/utils/**/*.{js,jsx,ts,tsx}"],
	  "rules": {
	    "no-restricted-imports": [
	      "error",
	      {
	        "patterns": [
	          {
	            "group": ["utils"],
	            "message": "Please avoid using utils in this folder to avoid circular dependencies. Use relative paths instead."
	          }
	        ]
	      }
	    ]
	  }
	},
  ...
],
```

`no-restricted-imports`를 사용하면 모듈 내부에서 해당 모듈을 참조하지 않도록 할 수 있다

- 오류

  ![Untitled](/static/images/remove-circular-dependencies/Untitled.png)

- 해결

  ![Untitled](/static/images/remove-circular-dependencies/Untitled%201.png)

# 다른 모듈을 참조할 때 가장 하위 모듈을 참조

barrel 파일로 발생한 순환참조는 대부분 실제로 사용하지 않는 파일까지 탐색해서 발생한다

![importUsingBarrel.svg](/static/images/remove-circular-dependencies/importUsingBarrel.svg)

모듈 B의 fn2는 실제로 모듈 A의 fn1만 쓰고 있지만 모듈 A에서 가져오고 있기 때문에 fn0 또한 탐색하게 된다

A/fn0는 모듈 B에 의존하고 있기 때문에 순환참조가 발생한다

이런 문제를 해결하기 위해서 barrel 파일을 통해서 가져오지 않고 사용하려는 심볼을 직접 참조하면 된다

![importUsingBarrel.noCycle.svg](/static/images/remove-circular-dependencies/importUsingBarrel.noCycle.svg)

대부분의 경우는 앞에서 언급한 방법으로 해결된다

그러나 이렇게 해도 해결되지 않는 경우가 있다

# 순환참조를 공통 파일로 분리

순환참조 중 일부는 barrel file을 통하지 않고 발생할 수 있다

아래와 같은 경우는 js 파일 자체가 순환참조를 일으키는 경우다

![commonModule.before.svg](/static/images/remove-circular-dependencies/commonModule.before.svg)

이럴 때는 하위 모듈을 참조하는 방법은 쓸 수가 없다

대신 순환참조를 일으키는 부분을 공통 파일로 분리하면 문제를 해결할 수 있다

![commonModule.after.svg](/static/images/remove-circular-dependencies/commonModule.after.svg)

# Dynamic import

Dynamic import는 가져오려는 모듈이 실제로 쓰일 때 가져오는 방식으로 [static import로 인한 순환참조를 회피하는 방법](https://github.com/import-js/eslint-plugin-import/issues/2265)이 될 수 있다

대표적인 예시는 react나 redux saga 바깥에서 redux store를 사용해서 action을 dispatch하는 경우가 있다

그런 경우 아래와 같이 dynamic import로 store를 가져와서 dispatch하는 함수를 하나 만들어서 사용하면 된다

```tsx
const dispatch = (action: AnyAction) =>
  import('redux/ConfigureStore').then(({ store }) => store.dispatch(action));
```

**⚠️ 주의**

Dynamic import로 순환참조를 피하는 건 어디까지나 임시방편이다

가능하면 더 좋은 구조로 리팩토링 해야 한다

# 순환참조 제거 전후

순환참조 확인하는 방법

```bash
npx --yes dpdm -T --no-tree --no-warning --skip-dynamic-imports circular --exit-code circular:1 ./src/index.js
```

순환참조 제거 전: 431개

![Untitled](/static/images/remove-circular-dependencies/Untitled%202.png)

제거 후

![Untitled](/static/images/remove-circular-dependencies/Untitled%203.png)

# 순환참조 예방

순환참조를 해결한 이후에 작업하면서 순환참조가 늘어날 수도 있다

이런 문제를 해결하기 위해서 GitHub Actions에 Workflow를 추가하면 순환참조를 예방할 수 있다

_.github/workflows/circular.yml_

```
# Workflow name
name: 'detect circular dependencies'

# Event for the workflow
on: [pull_request]

# List of jobs
jobs:
  check-circular-dependencies:
    # Operating System
    runs-on: ubuntu-latest
    # Job steps
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - name: run dpdm
        run: npx --yes dpdm -T --no-tree --no-warning --skip-dynamic-imports circular --exit-code circular:1 ./src/index.js
```

PR을 올리면 해당 브랜치에 대해서 순환참조를 탐색하는 명령어를 실행하고 만약 순환참조가 존재하면 오류가 나도록 만든다

- PR에 순환참조가 있는 경우

![Untitled](/static/images/remove-circular-dependencies/Untitled%204.png)

- 없는 경우

![Untitled](/static/images/remove-circular-dependencies/Untitled%205.png)

마지막으로 순환참조 체크를 통과하지 못하면 merge 못하도록 설정한다

Settings -> Branch protection rules에서

![set-branch-protection-rule](/static/images/remove-circular-dependencies/set-branch-protection-rule.png)

- PR에 순환참조가 있는 경우

![circular-dependency-detected-with-protection-rule](/static/images/remove-circular-dependencies/circular-dependency-detected-with-protection-rule.png)
