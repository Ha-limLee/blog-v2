---
title: identity map and lazy="raise"
date: "2025-10-29"
tags: ["python", "sqlalchemy"]
draft: true
---

## 문제

## Identity Map

<a id="prefetch"></a>반면 다음과 같이 imageset을 **미리 가져오면** 오류가 발생하지 않는다.

```diff
 async with async_session.begin() as session:
+    _ = await session.execute(Imageset, ident=1)
     image = await session.get(Image, ident=1)
     assert image

     imageset = image.imageset
```

## 원인

### Identity Map

그렇다면 왜 [미리 가져오는 경우](#prefetch)는 오류가 발생하지 않는 걸까? 그건 identity map에서 객체를 찾을 수 있기 때문이다.

앞에서 id == 1인 imageset을 가져왔고 이 객체는 sqlalchemy의 identity map[^identity-map]에 등록된다. image.imageset_id == 1이므로 이 id에 해당하는 객체는 identity map에서 찾을 수 있다. 따라서 이 경우 IO를 발생시키지 않고서 객체를 가져올 수 있는 것이다.

[^identity-map]: https://docs.sqlalchemy.org/en/21/glossary.html#term-identity-map
