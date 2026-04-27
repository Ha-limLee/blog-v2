---
title: REST API와 custom method
date: "2026-04-27"
tags: []
draft: true
---

## 문제

여러 id를 보내면 그 id에 맞는 item을 돌려주는 REST API는 이렇게 설계할 수 있다.

`GET /api/items?item-ids=...`

그런데 가져와야 하는 item이 아주 많고, id는 UUID로 되어 있어서 query string 제한을 넘을 수도 있다고 하자. 그렇다면 request body를 사용해야 한다.

`POST /api/items`

GET method가 request body를 받는 건 정의되지 않았기 때문에[^request-body-for-get] 대신 POST를 사용했다. 그런데 여기엔 또 다른 문제가 있다. 일반적으로 이런 형태는 자원을 생성하는 API이기 때문이다. 즉, item을 만드는 API로 보일 수 있다.

...

이런 문제가 발생하는 이유는 REST API에선 자원에 대한 행위를 HTTP method로만 표현하기 때문이다. HTTP method에 속하지 않는 것 같은 동작들은 REST API 규칙을 따르기 어려울 수 있다.

## 해결

### Action in message

### Custom method

## 참고

https://google.aip.dev/136

[^request-body-for-get]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/GET
