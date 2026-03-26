---
title: pnpm workspace로 여러 프로젝트 그룹핑
date: '2023-04-23'
tags: ['pnpm', 'workspace', 'monorepo']
draft: false
summary: 여러 react 프로젝트를 monorepo로 관리
images: []
layout: PostSimple
authors: ['default']
---





# Introduction

redux legacy에 대한 글을 쓰면서 repo를 관리하고 있는데 문제가 생겼다

각 post마다 하나의 repo를 사용하려고 하는데 글이 늘어날 때마다 repo가 redux-legacy-1, redux-legacy-2, redux-legacy-3, ... 이런 식으로 여러 개 생겨서 관리가 어렵다

repo를 이런 식으로 group화 할 수는 없을까?

```
redux-legacy-post
    |-- redux-legacy-1
    |-- redux-legacy-2
    |-- redux-legacy-3
    ⋮
```

안타깝게도 GitHub은 이런 기능을 제공하지 않는다

하지만 pnpm의 workspace를 이용하면 비슷한 효과를 낼 수 있다

# Install

```shell
npm install -g pnpm
```

⚠ pnpm v8.x은 node v16.14 이상이 설치되어 있어야 한다

설치 확인

```shell
pnpm -v
```

```
$ pnpm -v
8.3.1
```

# Create workspace

현재 redux-legacy-1 repo가 있으며 이 repo를 clone해 redux-legacy-2 repo를 만들려고 한다

우선 redux-legacy-1 이름을 redux-legacy-workspace로 바꾼다

```shell
mv redux-legacy-1 redux-legacy-workspace
```

기존에는 yarn으로 패키지를 관리했었는데 pnpm으로 바꿨으니 node_modules를 지운다[^1]

```shell
cd redux-legacy-workspace
rm -r node_modules
```

숨긴 파일(.vscode, .gitignore, .git)을 제외한 모두를 packages/redux-legacy-1 폴더로 옮긴다[^2]

```shell
folder="packages/redux-legacy-1"
mkdir folder
ls -1 | grep -v ${folder} | xargs -I % mv % ${folder}/%
```

![move redux-legacy-1 folder](/static/images/pnpm-workspace/move-legacy-1.png)

redux-legacy-1을 복사해 redux-legacy-2를 만든다

```shell
cp -r packages/redux-legacy-1 packages/redux-legacy-2
```

![copy redux-legacy-1 folder](/static/images/pnpm-workspace/copy-legacy-1.png)

pnpm-workspace.yaml 파일을 만든다

```yaml
packages:
  # include packages in subfolders (e.g. packages/)
  - 'packages/*'
  # if required, exclude some directories
  - '!**/test/**'
```

workspace용 package.json을 만든다[^3]

```json
// ./package.json

{
  "name": "redux-legacy",
  "private": true,
  "scripts": {
    "preinstall": "pnpm dlx only-allow pnpm"
  },
  "workspaces": ["packages/*"],
  "engines": {
    "node": ">=16.14.2",
    "pnpm": ">=8.3.1"
  },
  "packageManager": "pnpm@8.3.1",
  "devDependencies": {
    "pnpm": "^8.3.1"
  }
}
```

redux-legacy-1 폴더로 가서 yarn.lock 파일을 바탕으로 pnpm-lock 파일 생성
yarn.lock을 바탕으로 pnpm-lock 파일 생성

```shell
cd packages/redux-legacy-1 && pnpm import && cd ../..
```

workspace에 pnpm-lock.yaml이 생긴 걸 볼 수 있다

![pnpm import](/static/images/pnpm-workspace/pnpm-import.png)

이제 yarn.lock 파일은 필요 없으니 지운다

```shell
rm ./packages/*/yarn.lock
```

dependency들을 설치한다

```shell
pnpm install
```

workspace와 각 package에 node_modules가 생긴 걸 볼 수 있다

두 package 중 하나로 가서 `pnpm start`를 입력하면 CRA를 실행할 수 있다

![pnpm start](/static/images/pnpm-workspace/pnpm-start.png)

❗ workspace에 있는 .gitignore에 `node_modules/`를 추가해야 package에 있는 node_modules를 커밋에서 제외할 수 있다

# References

[^1]: [How to migrate from yarn / npm to pnpm](https://dev.to/andreychernykh/yarn-npm-to-pnpm-migration-guide-2n04)
[^2]: [mv files with | xargs](https://askubuntu.com/a/487038)
[^3]: [Building a Monorepo with pnpm Workspace](https://dev.to/soom/building-a-monorepo-with-pnpm-workspace-1544)
