---
title: Type-hinting Django Manager's Model
date: '2025-08-30'
tags: ['python', 'django']
draft: false
summary:
images: []
layout: PostSimple
authors: ['default']
---



# 문제

Django에서 user 정보에 `age` field를 추가할 일이 있었다.

```py
from typing import override
from django.contrib.auth.models import UserManager, User
from django.db.models import IntegerField


class CustomUserManager(UserManager):
    @override
    def create_user(
        self,
        username: str,
        email: str | None = None,
        password: str | None = None,
        **extra_fields: object,
    ):
        age = extra_fields["age"]
        if not isinstance(age, int):
            raise ValueError("age should be integer")

        model = self.model(username=username, email=email, age=age)
        model.set_password(password)
        model.save()

        return model


class CustomUser(User):
    age = IntegerField()
    objects = CustomUserManager()

```

이렇게 코드를 작성하면 한 가지 문제가 있다. 바로 `CustomUserManager.model`의 타입이 `Any`라는 것이다.

![model-is-any](/static/images/type-hinting-django-manager-model/model-is-any.png)

어떻게 하면 올바른 타입으로 추론되도록 할 수 있을까?

# Stub

Django는 FastAPI와는 달리 type hint를 프레임워크 차원에서 지원하지 않는다. 대신 stub 파일을 만들면 type hint를 지원하는 것처럼 보이게 할 수 있다[^dts]. 다행히 다른 사람들이 작성한 Django stub 파일이 있기 때문에 그걸 쓰면 된다.

```bash
# mypy를 쓰는 경우
uv add "django-stubs[compatible-mypy]"
# pyright을 쓰는 경우
uv add django-types
```

나는 pyright을 사용하고 있기 때문에 `django-types`를 설치했다.

**참고**

만약 language server로 `pylance`를 사용하고 있다면 `django-types`를 설치할 필요 없다. pylance는 django-types를 내장하고 있기 때문이다[^pylance-ships-django-types].

pylance 설치 폴더에서 django-types를 볼 수 있다.

예) `%USERPROFILE%\.vscode\extensions\ms-python.vscode-pylance-2025.7.1\dist\bundled\stubs\django-stubs`

![pylance-django-types](/static/images/type-hinting-django-manager-model/pylance-django-types.png)

## Type Argument

django-types를 설치하면 `UserManager`에 type argument를 줄 수 있다.

```diff
-class CustomUserManager(UserManager):
+class CustomUserManager(UserManager["CustomUser"]):
```

[^forward-references]

이렇게 하면 `model`의 타입이 `CustomUser`로 추론된다.

![model-is-custom-user](/static/images/type-hinting-django-manager-model/model-is-custom-user.png)

## How It Works?

django-types 코드를 보면 [stub 파일](https://github.com/sbdchd/django-types/blob/62b7e9dd74a19c645672936f2968062e45adc028/django-stubs/contrib/auth/models.pyi#L52)에 `UserManager`가 이렇게 정의되어 있다.

```py
class UserManager(BaseUserManager[_T]):
    ...
```

상속 계층을 따라 올라가면 `UserManager -> BaseUserManager -> Manager -> BaseManager -> QuerySet -> _BaseQuerySet`으로 가게 되는데, [\_BaseQuerySet](https://github.com/sbdchd/django-types/blob/62b7e9dd74a19c645672936f2968062e45adc028/django-stubs/db/models/query.pyi#L26)을 보면 model의 타입이 이렇게 정의되어 있다.

```py
_T = TypeVar("_T", bound=models.Model)

class _BaseQuerySet(Generic[_T], Sized):
    model: type[_T]
```

이 코드를 통해서 \_BaseQuerySet은 type argument `_T`를 받고, `model`이라는 attribute의 타입을 `_T`의 subclass[^type-subclasses]로 지정한다는 걸 알 수 있다.

즉, `class CustomUserManager(UserManager["CustomUser"])`에서 `_T`로 `CustomUser`를 준 것이고, `model: type[_T]`에 따라 model이 `CustomUser`로 추론된 것이다.

# References

- https://stackoverflow.com/a/75968415

[^dts]: stub 파일은 TypeScript의 d.ts 파일과 비슷하다. 기존 module 코드를 수정하지 않고 유저에게 정적 타입을 제공할 수 있기 때문이다.
[^pylance-ships-django-types]: https://github.com/microsoft/pylance-release/issues/4597#issuecomment-1640577809
[^forward-references]:
    CustomUser를 참조하는 시점엔 아직 CustomUser가 정의되지 않았기에 바로 참조(`[CustomUser]`) 할 수 없고 string literal로 참조(`["CustomUser"]`) 해야 한다. 이를 forward reference라 한다.
    https://peps.python.org/pep-0484/#forward-references

[^type-subclasses]:
    `type[_T]`는 \_T의 subclass를 나타낸다.
    https://typing.python.org/en/latest/spec/special-types.html#type
