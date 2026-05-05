---
title: REST API와 custom method
date: "2026-05-06"
tags: []
draft: false
---

## 문제

여러 id를 보내면 그 id에 맞는 item을 돌려주는 REST API는 이렇게 설계할 수 있다.

`GET /api/items?item-ids=...`

그런데 가져와야 하는 item이 아주 많고, id는 UUID로 되어 있어서 query string 제한을 넘을 수도 있다고 하자. 그렇다면 request body를 사용해야 한다.

`POST /api/items`

GET method가 request body를 받는 건 정의되지 않았기 때문에[^request-body-for-get] 대신 POST를 사용했다. 그런데 여기엔 또 다른 문제가 있다. 일반적으로 이런 형태는 자원을 생성하는 API이기 때문이다. 즉, item을 만드는 API로 보일 수 있다.

이런 문제를 해결하기 위해 URL에 action을 나타내기도 한다.

`POST /api/items/bulk-read`

이러면 의도가 명확하지만, 1) HTTP method를 통해서 action을 나타내지 않았고 2) URL에 resource가 아닌 action이 포함됐다는 점에서 RESTful하지 않다.

## 해결

### Custom method

이 문제를 해결하는 한 가지 방법은 REST 규칙의 일부를 포기하되, 그런 설계가 의도된 것임을 명시하는 것이다. 예를 들어 google에서는 쌍점`:`을 사용하는 걸 제안한다[^custom-method]. 이걸 Custom method라고 부른다.

`POST /api/items:bulk-read`

이 규칙의 가장 큰 장점은 resource와 action 표현이 명확히 나뉜다는 점이다. `POST /api/items/bulk-read`에서는 resource와 action 모두 슬래시`/`로 구분되는 걸 볼 수 있다. 반면 custom method는 쌍점 부분이 action을 나타낸다. 따라서 "bulk-read"가 resource인지 action인지 헷갈릴 일이 없다.

## 참고

- google ads에는 custom method가 적극적으로 쓰였다. https://developers.google.com/google-ads/api/rest/design/service-methods

[^request-body-for-get]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/GET

[^custom-method]: https://google.aip.dev/136
