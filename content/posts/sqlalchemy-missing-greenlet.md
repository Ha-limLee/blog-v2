---
title: async sqlalchemy와 missing greenlet 오류
date: "2026-04-05"
tags: ["python", "sqlalchemy"]
draft: false
---

NOTE: sqlalchemy 2.1 기준으로 작성됨

## 문제

### Missing Greenlet

다음과 같이 imageset과 image table이 있고 1:N 관계라고 하자.

```py
class Imageset(Base):
    __tablename__: str = "imageset"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()

    images: Mapped[list["Image"]] = relationship()


class Image(Base):
    __tablename__: str = "image"

    id: Mapped[int] = mapped_column(primary_key=True)
    imageset_id: Mapped[int] = mapped_column(ForeignKey(Imageset.id))
    name: Mapped[str] = mapped_column()

    imageset: Mapped[Imageset] = relationship()

```

그 다음 **비동기** 엔진을 만든다.

```py
engine = create_async_engine("sqlite+aiosqlite://", echo=True)
session_factory = async_sessionmaker(engine)
```

imageset과 image를 만들고 연결한다.

```py
async with async_session.begin() as session:
    imageset = Imageset(name="imageset1")
    session.add(imageset)
    await session.flush()

    image = Image(name="image1", imageset_id=imageset.id)
    session.add(image)

```

이제 새로운 session에서 image와 연관관계인 imageset을 불러보자.

```py
async with async_session.begin() as session:
    image = await session.get(Image, ident=1)
    assert image

    imageset = image.imageset
```

이렇게 하면 imageset을 참조할 때 다음과 같은 오류가 발생한다.

> sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here. Was IO attempted in an unexpected place? (Background on this error at: https://sqlalche.me/e/20/xd2s)

왜 이런 일이 생기는 걸까?

## 원인

### 동기 IO를 허용하지 않음

sqlalchemy는, 다른 ORM들이 그렇듯이, 연관관계 필드에 접근했을 때 그 필드에 해당하는 객체가 없으면 객체를 가져오기 위해 암시적으로 쿼리를 부른다. 그런데 연관관계 필드를 참조하는 건 "동기"이므로 여기에서 IO 작업이 발생하면 스레드가 멈출 수 있다.

> If you're working in asyncio, you can't call any method in SQLAlchemy that would emit a query that isn't an "async" method (unless you use the run_sync() block), because blocking IO is not allowed.[^blocking-io-is-not-allowed]

이런 문제를 해결하기 위해 sqlalchemy는 async engine을 사용하는 경우 동기 IO를 막는다. 그래서 MissingGreenlet 오류가 발생한 것이다.

## 해결 방안

### 1. AsyncAttrs

한 가지 방법은 필드 접근을 비동기로 하는 것이다. sqlalchemy에서 제공하는 AsyncAttrs[^async-attrs]를 사용하면 된다.

model이 AsyncAttrs를 상속받게 하고

```diff
+from sqlalchemy.ext.asyncio import AsyncAttrs

-class Image(Base):
+class Image(AsyncAttrs, Base):
     __tablename__: str = "image"
```

인스턴스의 `awaitable_attrs` 속성을 통해 imageset을 가져온다.

```diff
 async with async_session.begin() as session:
     image = await session.get(Image, ident=1)
     assert image

-    imageset = image.imageset
+    imageset = await image.awaitable_attrs.imageset
```

이러면 비동기 쿼리를 통해 원하는 결과를 얻을 수 있다.

#### 단점

##### 타입 미지원

![](/static/images/sqlalchemy-missing-greenlet/awaitable-attrs-no-type-hint.png)

awaitable_attrs를 통해 참조한 속성의 타입은 `Any`다. 따라서 자동완성이나 타입 체크 등의 기능을 사용할 수 없다.

### 2. Eager Loading

다른 방법은 연관 속성을 미리 가져오는 것(eager loading)이다.

```diff
+from sqlalchemy.orm import selectinload

 async with async_session.begin() as session:
-    image = await session.get(Image, ident=1)
+    image = await session.get(
+        Image, ident=1, options=[selectinload(Image.imageset)]
+    )
     assert image

     imageset = image.imageset
```

selectinload[^selectinload] 또는 joinedload[^joinedload]를 사용하면 해당 속성과 관련된 테이블에서 record를 가져온다. 따라서 속성을 참조할 때 추가 쿼리가 발생하지 않으니 missing greenlet 오류가 발생하지 않는다.

#### 단점

##### 불필요한 연산

쿼리가 lazy 하지 않아서 생기는 문제들이 따라온다. 예를 들어 사용 빈도가 낮은 record라도 미리 가져오게 된다.

```py
async with session_factory.begin() as session:
    imageset = await session.get(
        Imageset,
        ident=1,
        # 아주 많은 image들
        options=[selectinload(Imageset.images)],
    )
    assert imageset

    # 빈도가 낮은 조건
    if need_to_copy_images:
        await copy_images(imageset.images)
    else:
        # images 안 씀
        ...
```

이런 문제는 lazy loading의 경우 잘 발생하지 않는다. 필요한 경우에만 쿼리를 하기 때문이다. 따라서 eager loading을 사용할 때는 불필요한 연산에 유의해야 한다.

## 결론

### Eager Loading을 사용하자

AsyncAttrs는 편리하지만 타입 힌트를 지원하지 않는다는 점에서 유지보수하기 쉽지 않다. 반면 eager loading은 타입 힌트가 잘 지원되기 때문에 한결 낫다.

[^blocking-io-is-not-allowed]: https://github.com/sqlalchemy/sqlalchemy/discussions/5913

[^async-attrs]: https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html#sqlalchemy.ext.asyncio.AsyncAttrs

[^selectinload]: https://docs.sqlalchemy.org/en/21/orm/queryguide/relationships.html#select-in-loading

[^joinedload]: https://docs.sqlalchemy.org/en/21/orm/queryguide/relationships.html#joined-eager-loading
