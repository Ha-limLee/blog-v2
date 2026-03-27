---
date: "2025-10-29"
tags: ["python", "sqlalchemy"]
draft: true
---

## 문제

### Missing Greenlet

다음과 같이 imageset과 image table이 있고 1:N 관계라고 하자.

_project/db.py_

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

반면 다음과 같이 imageset을 **미리 가져오면** 오류가 발생하지 않는다.

```diff
 async with async_session.begin() as session:
+    _ = await session.execute(Imageset, ident=1)
     image = await session.get(Image, ident=1)
     assert image

     imageset = image.imageset
```

왜 이런 일이 생기는 걸까?

## 원인

###
