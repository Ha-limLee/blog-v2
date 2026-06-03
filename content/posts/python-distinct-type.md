---
title: 구별된 타입
draft: false
date: 2026-06-04
tags: ["python"]
---

**환경**

- python==3.13
- basedpyright==1.39.6

## 배경

ORM을 사용할 때, model instance를 hash map에 저장하는 경우가 종종 있다. hash map의 key는 model의 id, value는 id와 매칭되는 model instance로 저장한다.

예를 들어 이렇게 정의된 sqlalchemy model이 있다고 하자.

```py
class Image(Base):
    __tablename__: str = "image"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
```

그럼 dict를 이용해 이렇게 저장할 수 있다.

```py
images = await session.scalars(select(Image).where(...))
image_dict = {image.id: image for image in images}
```

이 패턴은 여러 model을 한 번에 업데이트 하는 등 DB와의 통신을 줄일 때 사용한다.

## 문제

이 패턴의 단점은 dict가 많아졌을 때 dict의 key가 뭘 뜻하는지 알기 어려워진다는 것이다. 그래서 엉뚱한 key로 참조하는 실수가 생길 수 있다.

```py
# label_id도 int면 타입 상 문제가 없다.
image_dict[label_id] = image
```

## 해결

이런 문제는 id가 스칼라 타입(int)이기 때문에 생긴다. 따라서 스칼라 타입과 구별된 타입을 정의하면 문제를 해결할 수 있다.

### 상속

python은 모든 게 객체이기 때문에[^all-data-is-objects] int를 상속하면 구별된 타입을 만들 수 있다.

```diff
+class ImageId(int):
+    pass

 class Image(Base):
     __tablename__: str = "image"

-    id: Mapped[int] = mapped_column(primary_key=True)
+    id: Mapped[ImageId] = mapped_column(primary_key=True)
     name: Mapped[str] = mapped_column()
```

이렇게 하면 label_id로 image_dict에 접근하는 코드는 타입 오류가 난다.

![](/static/images/python-distinct-type/type-error.png)

#### 단점

- 직렬화, 역직렬화 구현 필요

상속으로 만든 `ImageId`를 어떻게 처리해야 할지 대부분의 라이브러리들은 모른다. 예를 들어 ImageId를 사용하면 sqlalchemy는 이런 오류를 던진다.

```bash
sqlalchemy.orm.exc.MappedAnnotationError: Could not locate SQLAlchemy Core type when resolving for Python type indicated by '<class 'src.models.ImageId'>' inside the Mapped[] annotation for the 'id' attribute; the type object is not resolvable by the registry
```

이런 경우 `TypeDecorator`를 사용해 sqlalchemy에게 ImageId를 처리하는 방법을 알려줘야 한다[^type-decorator].

```diff
+from sqlalchemy import types


+class ImageIdType(types.TypeDecorator[ImageId]):
+    impl = types.Integer
+
+    cache_ok = True
+
+    @override
+    def process_bind_param(self, value, dialect):
+        # python -> DB
+        return int(value)
+
+    @override
+    def process_result_value(self, value, dialect):
+        # DB -> python
+        return ImageId(value)


 class Image(Base):
     __tablename__: str = "image"

-    id: Mapped[ImageId] = mapped_column(primary_key=True)
+    id: Mapped[ImageId] = mapped_column(ImageIdType, primary_key=True)
     name: Mapped[str] = mapped_column()
```

### NewType

python의 NewType을 사용하면 상속을 사용하는 것보다 쉽게 구별된 타입을 정의할 수 있다[^new-type].

```diff
+ImageId = NewType("ImageId", int)

 class Image(Base):
     __tablename__: str = "image"

-    id: Mapped[int] = mapped_column(primary_key=True)
+    id: Mapped[ImageId] = mapped_column(primary_key=True)
     name: Mapped[str] = mapped_column()
```

#### 장점

- 직렬화, 역직렬화 구현을 하지 않아도 됨

NewType으로 정의한 타입은 타입 힌트에만 영향을 미치며 런타임에는 원본 타입과 같다. 즉, ImageId는 런타임에 int다. 그렇기 때문에 직렬화, 역직렬화 로직을 구현하지 않아도 된다.

#### 단점

- 런타임엔 영향이 없음

런타임에 영향이 없다는 건 단점이기도 하다. 예를 들어 다음 코드는 런타임에 실패한다.

```py
image_id = ImageId(100)
assert type(image_id) is ImageId
```

ImageId가 NewType으로 정의된 타입이라는 걸 모른다면 이 동작은 혼란스러울 것이다.

## 참고

https://sot.dev/everything-should-be-typed.html

[branded-type-in-ts](/posts/branded-type-in-ts.md)

[^all-data-is-objects]: https://docs.python.org/3/reference/datamodel.html#objects-values-and-types

[^type-decorator]: https://docs.sqlalchemy.org/en/21/core/custom_types.html#sqlalchemy.types.TypeDecorator

[^new-type]: https://docs.python.org/3/library/typing.html#newtype
