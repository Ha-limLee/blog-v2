---
title: Decouple commit from service
date: 2026-06-15
draft: false
tags:
  - python
  - fastapi
  - sqlalchemy
---

## 문제

### 재사용하기 어려운 service

다음과 같이 각 domain별로 service layer가 있고, 각 method에서 commit과 rollback을 한다고 하자.

```py
class ImagesetService:
    ...
    async def create_imageset(self, payload):
        try:
            imageset = Imageset(name=payload.name)
            self.session.add(imageset)
            await self.session.commit()

            return ImagesetResponse(id=imageset.id, name=imageset.name)

	    except Exception:
            await self.session.rollback()
            raise HTTPException(...)
```

```py
class FlagService:
    ...
    async def create_flag(self, payload):
	    try:
            flag = Flag(name=payload.name, imageset_id=payload.imageset_id)
            self.session.add(flag)
            await self.session.commit()

            return FlagResponse(
                id=flag.id,
                name=flag.name,
                imageset_id=flag.imageset_id,
            )

	    except Exception:
            await self.session.rollback()
            raise HTTPException(...)
```

이런 패턴은 명시적이지만 **재사용이 어렵다**는 단점이 있다.

flag를 만들고 imageset에 flag를 연결하는 동작을 구현한다고 하자.

```py
class CreateImagesetWithFlagUsecase:
    ...
    async def execute(self, payload):
        try:
            imageset = await self.imageset_service.create_imageset(payload)
            flag = await self.flag_service.create_flag(
                FlagPayload(name=payload.flag.name, imageset_id=imageset.id)
            )
            return ImagesetWithFlagResponse(
                id=imageset.id,
                name=imageset.name,
                flag=flag,
            )

        except Exception:
            # rollback?
            ...
```

imageset 생성은 성공해도 flag 생성에 실패하면 imageset 생성이 rollback 되기를 원하는데, 이미 imageset 생성을 commit 했으므로 그렇게 할 수 없다. 대신 직접 imageset을 지워야 한다.

```diff
         except Exception:
-            # rollback?
-            ...
+            if imageset:
+                await self.imageset_service.delete_imageset(imageset.id)
```

이런 식으로 N 개의 로직이 재사용되면 지울 데이터가 많아져서 관리하기 어렵다.

## 해결

이 문제는 commit, rollback을 service에서 분리해서 해결할 수 있다.

### Decouple commit and rollback from service

가장 쉬운 방법은 가장 바깥 layer에서 commit, rollback을 책임지는 것이다.

```py {12-14}
DATABASE_URL = ...

async_engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    autocommit=False,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal.begin() as session:
        yield session

AsyncSessionDep = Annotated[AsyncSession, Depends(get_db)]
```

`AsyncSessionLocal.begin`을 `with`문과 사용하면 자동으로 commit과 rollback을 실행하고 session이 닫힌다[^sqlalchemy-framing-out].

이제 `get_db`를 사용하면 service layer에서 commit, rollback을 걷어낼 수 있다.

```py
class ImagesetService:
    def __init__(self, session: AsyncSession):
        self.session: AsyncSession = session

    async def create_imageset(self, payload: ImagesetPayload) -> ImagesetResponse:
        imageset = Imageset(name=payload.name)
        self.session.add(imageset)
        # NOTE: commit 대신 flush 사용
        await self.session.flush()

        return ImagesetResponse(id=imageset.id, name=imageset.name)
```

```py
class FlagService:
    def __init__(self, session: AsyncSession):
        self.session: AsyncSession = session

    async def create_flag(self, payload: FlagPayload) -> FlagResponse:
        flag = Flag(name=payload.name, imageset_id=payload.imageset_id)
        self.session.add(flag)
        await self.session.flush()

        return FlagResponse(
            id=flag.id,
            name=flag.name,
            imageset_id=flag.imageset_id,
        )
```

service에서 commit, rollback이 제거돼서 훨씬 깔끔하다.

commit 대신 flush를 사용했는데 이는 메서드를 재사용할 때 DB에서 생성되는 값(id 등)을 얻거나 제약(외래키 등)을 검사하기 위함이다.

```py
class CreateImagesetWithFlagUsecase:
    def __init__(self, session: AsyncSession):
        self.imageset_service: ImagesetService = ImagesetService(session=session)
        self.flag_service: FlagService = FlagService(session=session)

    async def execute(
        self, payload: ImagesetWithFlagPayload
    ) -> ImagesetWithFlagResponse:
        imageset = await self.imageset_service.create_imageset(payload=payload)
        flag = await self.flag_service.create_flag(
            payload=FlagPayload(name=payload.flag.name, imageset_id=imageset.id)
        )

        return ImagesetWithFlagResponse(
            id=imageset.id,
            name=imageset.name,
            flag=flag,
        )
```

두 service의 메서드를 사용하는 것도 단순해졌다. 하나의 transaction에 묶이기 때문에 flag 생성이 실패했을 때 imageset을 직접 지우는 보상 로직이 필요 없다.

마지막으로 router에 session을 주입하자.

```py
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_imageset_with_flag(
    session: AsyncSessionDep, payload: ImagesetWithFlagPayload
) -> ImagesetWithFlagResponse:
    usecase = CreateImagesetWithFlagUsecase(session=session)
    return await usecase.execute(payload=payload)
```

## 참고

- https://goenning.net/blog/session-per-request-pattern-go/
- https://medium.com/@bhagyarana80/10-sqlalchemy-session-recipes-that-avoid-leaks-878a242c78a8
- https://stackoverflow.com/questions/78648595/what-is-the-benefit-of-letting-fastapi-handle-sqlalchemys-session-vs-the-provid
- https://fastapi.tiangolo.com/tutorial/sql-databases/#create-a-session-dependency
- https://krylosov-aa.github.io/context-async-sqlalchemy/

[^sqlalchemy-framing-out]: https://docs.sqlalchemy.org/en/21/orm/session_basics.html#using-a-sessionmaker
