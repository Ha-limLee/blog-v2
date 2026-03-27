---
title: service layer에서 수동 commit 피하기
date: 2026-03-27
tags:
  - fastapi
  - sqlalchemy
draft: true
---

## 문제

다음과 같이 각 domain별로 service layer가 있고, 각 method에서 commit을 한다고 하자.

```py
class ImagesetService:
    ...
    async def create_imageset(self):
        try:
            ...
            await self.session.commit()
	    except:
            await self.session.rollback()
            raise HTTPException(...)
```

```py
class FlagService:
    ...
    async def create_flag(self):
	    try:
            ...
            await self.session.commit()
	    except:
            await self.session.rollback()
            raise HTTPException(...)
```

이런 패턴은 단순하지만 **transaction 범위를 조정하기 어렵다**는 단점이 있다.

```py
class CreateImagesetWithFlagUsecase:
    ...
    async def execute(self):
        try:
            await self.flag_service.create_flag()
            await self.create_imageset()
        except:
            # rollback all?
            ...
```

flag 생성은 성공해도 imageset 생성에 실패하면, flag 생성이 rollback 되기를 원하는데, 이미 flag 생성을 commit 했으므로 그렇게 할 수 없다. 지금 상황에선 직접 flag를 지워야 한다.

```py
class CreateImagesetWithFlagUsecase:
    ...
    async def execute(self):
        flag: Flag | None = None
        try:
            flag = await self.flag_service.create_flag()
            await self.create_imageset()
        except:
            if flag:
                await self.flag_service.delete_flag(flag.id)
```

## 해결

### Context manager

이 문제는 commit을 context manager에게 맡기면 해결된다.

WARNING: 그냥 session.begin()에 맡기면 "sqlalchemy.exc.InvalidRequestError: A transaction is already begun on this Session." 오류가 발생함.

대신 이런 걸 써야 함.

```py
from contextlib import asynccontextmanager

@asynccontextmanager
async def safe_begin(session):
    if session.in_transaction():
        yield
    else:
        async with session.begin():
            yield
```

usage:

```py
async with safe_begin(session):
    print("asd")
```

---

```diff
 class ImagesetService:
     ...
     async def create_imageset(self):
         try:
-            ...
-            await self.session.commit()
+            async with self.session.begin():
+               ...
  	     except:
-            await self.session.rollback()
             raise HTTPException(...)
```

```diff
 class FlagService:
     ...
     async def create_flag(self):
         try:
-            ...
-            await self.session.commit()
+            async with self.session.begin():
+               ...
  	     except:
-            await self.session.rollback()
             raise HTTPException(...)
```

```diff
 class CreateImagesetWithFlagUsecase:
     ...
     async def execute(self):
-        try:
-            await self.flag_service.create_flag()
-            await self.create_imageset()
-        except:
-            # rollback all?
-            ...
+        async with self.session.begin():
+            await self.flag_service.create_flag()
+            await self.create_imageset()
```

## 참고

https://docs.sqlalchemy.org/en/20/orm/session_basics.html#framing-out-a-begin-commit-rollback-block
https://docs.sqlalchemy.org/en/21/core/connections.html#begin-once
https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#unitofwork-transaction
