---
draft: true
---
UUID의 좋은 점은 client에서도 ID를 생성할 수 있다는 것이다. auto increment의 경우 ID가 필요하면 DB에 요청을 해서 ID를 가져와야 한다.

```py
nodes = [Node(value=value) for value in values]
session.add_all(nodes)
# node id를 발행하기 위해 DB에 요청
await session.flush()

edges = [Edge(source_id=source_id, target_id=node.id) for node in nodes]
```

반면 UUID를 쓰면 중간에 DB에 요청을 하지 않아도 된다.

```py
nodes = [Node(id=uuid.uuid7(), value=value) for value in values]
edges = [Edge(source_id=source_id, target_id=node.id) for node in nodes]
```