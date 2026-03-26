---
title: nginx spa
date: '2025-09-06'
tags: []
draft: true
summary:
images: []
layout: PostSimple
authors: ['default']
---

# problem

nginx로 docusaurus를 서빙할 일이 있었다. docusaurus는 정적 사이트를 빌드(SSG)하며[^docusaurus-ssg], routing은 client side에서 한다(SPA)[^docusaurus-spa]. 또한 i18n을 적용하면 언어마다 SPA를 만든다[^docusaurus-spa-per-locale]. 만약 기본 언어가 영어(en)이며 한국어 번역을 따로 제공하면 빌드 결과는 다음과 같다.

```
build/
    ⋮
    |- index.html
    |- ko/
        ⋮
        |- index.html
```

만약 baseUrl이 `/static/manual/`이면 빌드물을 nginx 경로에 이렇게 옮길 것이다.

```
nginx/
    ⋮
    |- conf/
    |- static/
        |- manual/
            ⋮
            |- index.html
            |- ko/
                ⋮
                |- index.html
```

이 상태에서 nginx config을 수정해야 한다.

# def

asd
asd

sdf

# dho

[^docusaurus-ssg]: "Strictly speaking, Docusaurus is a static site generator" https://docusaurus.io/docs/advanced/ssg
[^docusaurus-spa]: "Docusaurus builds a single-page application" https://docusaurus.io/docs/advanced/routing#escaping-from-spa-redirects
[^docusaurus-spa-per-locale]: "Docusaurus will build one single-page application per locale" https://docusaurus.io/docs/i18n/tutorial#single-domain-deployment
