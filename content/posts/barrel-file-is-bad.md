---
title: 왜 barrel file은 나쁜가
date: 2023-11-26
tags:
  - circular-dependency
draft: false
summary: 순환참조를 유발하는 barrel file
images: []
layout: PostSimple
authors:
  - default
---

# Introduction

barrel file이란 여러 모듈을 가져와 다시 내보내는 파일을 말한다[^rr]

JS 생태계에서는 일반적으로 index.js(또는 .ts)를 가리킨다[^r]

barrel file을 잘 쓰면 import 구문을 깔끔하게 만들 수 있다

```ts
import { convertToImage } from 'utils/convert';
import { red500 } from 'utils/color';
import { pipe } from 'utils/functional';
...
```

```ts
import { convertToImage, red500, pipe } from 'utils';
...
```

모듈이 많으면 많을수록 효과가 크다

이렇게 보면 좋아보이지만 한 가지 큰 문제가 있다

바로 순환참조다

# Circular dependency

모듈의 순환참조는 한 파일에서 시작해 import 경로를 따라가다 보면 다시 첫 파일로 돌아오는 걸 말한다

순환참조를 파악하는 방법은 다양하다

- eslint-plugin-import의 no-cycle[^rrr]
- webpack circular-dependency-plugin[^rrrr]
- cli 이용(dpdm[^rrrrr] 또는 madge[^rrrrrr])

아래는 dpdm을 이용해 출력한 순환참조의 일부다

`dpdm -T --no-tree --no-warning --skip-dynamic-imports circular ./src/index.ts`


![](/static/images/barrel-file-is-bad/dpdm.png)


# Barrel and Circular dependency

그래서 barrel과 순환참조는 무슨 상관이 있는가?

dpdpm 이미지를 보면 짐작할 수 있듯이 barrel은 순환참조를 유발한다

이런 폴더 구조를 생각해보자

```
utils
  |-- index.ts
  |-- hooks
  |     |-- index.ts
  |     |-- useRotation.ts
  |     ⋮
  |-- colors
        |-- index.ts
        |-- basicColors.ts
        ⋮
```

hooks/index.ts에서 hook을 모아서 내보내고 colors/index.ts에서 color를 모아서 내보낸다

그 다음 utils/index.ts에서 하위 모듈(hooks, colors)을 모아서 내보낸다

현재 의존 경로는 다음과 같다

```
utils/index.ts -> hooks/index.ts -> useRotation.ts
utils/index.ts -> colors/index.ts -> basicColors.ts
```

아직은 순환참조가 없다

여기에 useBasicColors라는 훅을 만들고 colors를 참조하도록 하자

_useColor.ts_

```ts
import basicColors from 'utils';

export default function useBasicColors() {
  ...
};
```

이제 의존 경로는 다음과 같다

```
utils/index.ts -> hooks/index.ts -> useBasicColors.ts -> utils/index.ts
utils/index.ts -> hooks/index.ts -> useRotation.ts
utils/index.ts -> colors/index.ts -> basicColors.ts
```

순환참조가 생겼다!

`import basicColors from 'utils';` 때문이다

`import basicColors from 'utils/colors';`로 변경하면 문제가 해결되지만 이걸 의식하기 쉽지 않다

utils가 utils/colors보다 짧으며 VSCode에서 ctrl + space로 자동 완성을 하면 utils를 추천하기 때문이다[^rrrrrrr]

# Why circular dependency is bad

## Module Resolution Failure

barrel이 순환참조를 일으킬 수 있다는 건 알았다

그런데 순환참조는 왜 나쁜가?

간단하다

순환참조는 예상치 못한 오류를 낼 수 있다

여러 오류 중 하나는 **의존성 파악 실패**다

![](/static/images/barrel-file-is-bad/jest-with-circular.png)

위 코드는 순환참조가 있는 모듈을 참조한 테스트 코드다

이 코드를 실행하면 어떻게 될까?

![](/static/images/barrel-file-is-bad/test-circular.png)


OOM이 발생하고 테스트가 끝나지 않았다

그렇다면 직접참조하면 어떨까?

![](/static/images/barrel-file-is-bad/jest-without-circular.png)


경로를 utils에서 utils/colors로 바꿨다

![](/static/images/barrel-file-is-bad/test-no-circular.png)

OOM 없이 테스트가 잘 끝났다

# Conclusions

순환참조의 가장 큰 문제점은 작은 프로젝트에서는 순환참조로 인한 문제가 발생하지 않는다는 것이다

즉, 현재 프로젝트에서 모든 게 잘 돌아가더라도 언제 순환참조 이슈가 터질지 모른다

따라서 순환참조는 미리 방지하는 게 좋고 발견했다면 가능한 한 빨리 해결해야 한다

# Further reading

- [Barrel and Circular dependency](https://github.com/angular/angular-cli/issues/7369)

해결되면 barrel 순환참조 문제도 같이 풀릴 수 있는 이슈

- [Option for auto-import to prefer direct exports over re-exports](https://github.com/microsoft/TypeScript/issues/43777)

eslint로 import 경로 제한해서 순환참조 해결

- [eslint-plugin-import/no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md)

node.js 공식문서의 순환참조에 대한 설명

- [Cycles](https://nodejs.org/api/modules.html#modules_cycles)

# References

[^r]: [What is a barrel file](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js#what-is-a-barrel-file)
[^rr]: [Barrel](https://basarat.gitbook.io/typescript/main-1/barrel)
[^rrr]: [eslint-plugin-import/no-cycle](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md)
[^rrrr]: [circular-dependency-plugin](https://github.com/aackerman/circular-dependency-plugin)
[^rrrrr]: [dpdm](https://github.com/acrazing/dpdm)
[^rrrrrr]: [madge](https://github.com/pahen/madge)
[^rrrrrrr]: [Auto-import prefers parent index.ts which leads to circular reference](https://github.com/microsoft/TypeScript/issues/45953)
