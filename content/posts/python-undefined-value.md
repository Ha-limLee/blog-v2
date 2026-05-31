---
title: python과 undefined value
draft: false
date: 2026-06-01
tags: ["python", "pydantic"]
---

**환경**

- python==3.14
- pydantic==2.13.4

## 배경

### unset attribute

개발을 하다보면 **설정 안 됨**을 뜻하는 값이 필요할 때가 있다. python에선 이 값을 `None`으로 표현하곤 한다.

```py
class UpdateImagePayload(BaseModel):
    name: str | None = None
    tag_id: UUID | None = None
```

이렇게 명시적으로 `tag_id`가 설정이 안 된 경우(unset) 기본값을 `None`으로 하고 이를 "설정 안 됨"으로 취급한다.

"설정 안 됨"이 필요한 대표적인 경우는 DB 업데이트다.

```py
async def update_image(db: AsyncSession, image_id: UUID, payload: UpdateImagePayload):
    _ = await db.execute(
        update(Image)
        .where(Image.id == image_id)
        .values(payload.model_dump(exclude_unset=True))
    )
```

설정이 안 됐다는 건 해당 칼럼을 수정하지 않는다는 뜻이기 때문에 그 값은 빼고 업데이트 해야 한다. 이때 pydantic을 사용하는 경우 `exclude_unset=True`을 사용한다. 말 그대로 설정 안 된 값은 제외한다는 뜻이다. 만약 유저가 다음과 같은 json을 request body로 보냈다고 하자.

```json
{
  "name": "foo"
}
```

이 json으로 생성된 `UpdateImagePayload` instance는 json에 tag_id가 없음에도 기본값 None으로 그 속성을 가지고 있다. 따라서 `exclude_unset=True` 없이 model_dump를 하면 다음과 같은 python dict를 반환한다.

```py
{
    "name": "foo",
    "tag_id": None
}
```

이건 우리가 원하는 결과가 아니다. 왜냐하면 유저는 name만 수정하길 원했기 때문이다. 그러나 현재 python(3.14)에는 "정의됐지만 설정되지 않을 수 있는 속성"은 없다. 따라서 그런 동작은 유저가 직접 구현해야 한다. pydantic은 "설정된 속성 목록"을 기록하는 식으로 그런 동작을 구현했다. 그래서 나온 게 `exclude_unset` 옵션인 것이다. model_dump를 `exclude_unset=True`로 실행하면 결과는 다음과 같다.

```py
{
    "name": "foo",
}
```

우리가 원하는 대로 tag_id는 빠졌다.

## 문제

### 두 가지를 뜻하는 None

만약 `None`이 유저가 의도한 값이라고 해도 함수 `update_image`는 잘 작동할 것이다. 만약 유저가 tag를 떼고 싶다면 tag_id를 null로 설정할 것이다.

_유저가 보낸 json_

```json
{
  "tag_id": null
}
```

이 값은 unset이 아니므로 `model_dump(exclude_unset=True)`에서 제외되지 않을 것이다.

_model_dump(exclude_unset=True)_

```py
{
    "tag_id": None,
}
```

따라서 런타임에서는 의도한대로 동작한다. 문제는 **set, unset 모두 같은 값(None)이라서 맥락 없이 이 값만 보면 무엇을 뜻하는지 알 수가 없다**는 것이다.

```py
if payload.tag_id == None: # 이 값은 unset일까 아닐까?
    ...
```

즉, JS에서 `null`과 `undefined`로 구분된 것이 python에선 `None` 하나로 표현되기 때문에 문제가 생기는 것이다.

## 해결

### custom singleton

`undefined`와 같은 것을 python에서 구현하는 건 어려운 일이 아니다. python은 기본적으로 nominal typing이기 때문에, 새로운 class를 만들고 그 class로 singleton을 만들면 그만이다. 예를 들어 enum으로 구현하면

```py
class MissingType(enum.Enum):
    MISSING = "MISSING"

MISSING = MissingType.MISSING
```

이렇게 구현할 수 있고

```diff
 class UpdateImagePayload(BaseModel):
-    name: str | None = None
+    name: str | None | MissingType = MISSING
-    tag_id: UUID | None = None
+    tag_id: UUID | None | MissingType = MISSING
```

이렇게 사용할 수 있다. 실제로 msgspec에선 이런 식으로 `UNSET`이란 값을 구현했다[^msgspec-unset].

그러나 이렇게 정의한 값은 두 가지 문제가 있다.

1. 타입과 값의 이름이 다르다.

`None`가 타입이자 값인 것과는 달리 `MISSING`의 타입은 `MissingType`이고 값은 `MISSING`이다.

2. 여러 방식으로 구현할 수 있다.

enum을 사용하지 않고 그냥 빈 class를 정의해서 사용해도 된다.

### sentinel values

이런 문제를 해결하기 위해서 python 3.15에 `sentinel`이 추가됐다[^sentinel-values]. `sentinel`을 사용하면 `MISSING`을 이렇게 정의할 수 있다.

```py
MISSING = sentinel('MISSING')
```

enum을 쓰는 것보다 훨씬 간결하다. 이 값을 이렇게 사용할 수 있다.

```diff
 class UpdateImagePayload(BaseModel):
-    name: str | None = None
+    name: str | None | MISSING = MISSING
-    tag_id: UUID | None = None
+    tag_id: UUID | None | MISSING = MISSING
```

enum으로 정의한 `MISSING`과 달리, sentinel value는 이름을 그대로 타입으로 사용할 수 있다.

실제로 pydantic은 이 `sentinel`을 이용해 실험적으로 MISSING sentinel을 구현했다[^pydantic-missing-sentinal-pr][^pydantic-missing-sentinal-docs].

```py
from pydantic.experimental.missing_sentinel import MISSING

class UpdateImagePayload(BaseModel):
    name: str | None | MISSING = MISSING
    tag_id: UUID | None | MISSING = MISSING
```

이 `MISSING` 값은 pydantic이 이해하는 값이라서 `exclude_unset=True` 옵션을 사용하지 않아도 속성값이 `MISSING`이면 직렬화 과정에서 제외된다.

## 참고

https://github.com/pydantic/pydantic/issues/5326

[^msgspec-unset]: https://github.com/jcrist/msgspec/pull/350

[^sentinel-values]: https://peps.python.org/pep-0661/

[^pydantic-missing-sentinal-pr]: https://github.com/pydantic/pydantic/pull/11883

[^pydantic-missing-sentinal-docs]: https://pydantic.dev/docs/validation/dev/concepts/experimental/#missing-sentinel
