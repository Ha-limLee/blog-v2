---
title: 'OOP식 Double dispatch'
date: '2024-01-29'
tags: ['typescript', 'clean-code']
draft: false
summary:
images: []
layout: PostSimple
authors: ['default']
---

**Double dispatch**

1. [Double dispatch란?](double-dispatch)
2. OOP식 Double dispatch
3. [Dispatch table로 Double dispatch](double-dispatch-using-dispatch-table)





# Double dispatch in OOP

OOP에서 double dispatch는 간단하다

single dispatch를 두 번 하면 된다

이전 예시를 visitor pattern을 이용해 구현해보자

```diff
type Props = {
  hp: number;
  damage: number;
};

abstract class Character {
  constructor(public props: Props) {}
  hit(other: Character): void {
    other.props.hp -= this.props.damage;
  }
+  _hitByPriest(subject: Priest): void {
+    this.props.hp -= subject.props.damage;
+  }
+  _hitByKnight(subject: Knight): void {
+    this.props.hp -= subject.props.damage;
+  }
}

class Priest extends Character {
  constructor(props: Props) {
    super(props);
  }
+  _hitByKnight(subject: Knight): void {
+    this.props.hp -= 1.5 * subject.props.damage;
+  }
}

class Knight extends Character {
  constructor(props: Props) {
    super(props);
  }
  hit(other: Character): void {
-    switch (true) {
-      case other instanceof Priest:
-        other.props.hp -= 1.5 * this.props.damage;
-        break;
-      default:
-        super.hit(other);
-    }
+    other._hitByKnight(this);
  }
}

// test
const knight = new Knight({ hp: 300, damage: 50 });
const INIT_PRIEST_HP = 250;

const priest = new Priest({ hp: INIT_PRIEST_HP, damage: 30 });
knight.hit(priest);

assert.equal(priest.props.hp, INIT_PRIEST_HP - 1.5 * knight.props.damage);
```

# dispatch를 두 번

핵심은 이 부분이다

```ts
class Knight extends Character {
  ...
  hit(other: Character): void {
    other._hitByKnight(this);
  }
  ...
}
```

Character 인스턴스가 `hit` 메서드를 dispatch 한다(single dispatch).

hit 메서드 안에서 공격하려는 대상의 `_hitBy*` 메서드를 dispatch 한다(double dispatch).

테스트 코드의 경우 Knight 인스턴스가 hit 메서드를 dispatch하고

hit 메서드에서 상대의 \_hitByKnight 메서드를 dispatch 했다

즉, 두 Character 변수가 런타임 인스턴스에 따라서 동작하게 된 것이다

```ts
// 둘 다 type이 Character여도 문제 없다
// 만약 런타임에 character1이 Knight 인스턴스이고 character2가 Priest 인스턴스라면
// character2는 character1로부터 1.5배의 피해를 입을 것이다
character1.hit(character2)
```

전체 코드는 [여기](https://gist.github.com/Ha-limLee/95fe569e39636167532eca3abb232833)

# 결론

## 장점

- **종류를 추가하기 쉽다**

새로운 직업을 추가해도 기존 코드는 수정할 필요가 없다

```diff
type Props = {
  ...
};

abstract class Character {
  ...
}

class Priest extends Character {
  ...
}

class Knight extends Character {
  ...
}

+ class Rogue extends Character {
+   constructor(props: Props) {
+     super(props);
+   }
+ }

// test
...
```

## 단점

- **기능을 추가하기 어렵다**

종류를 추가하는 작업에 비해서 기능을 추가하는 건 어렵다

새로운 기능 heal이 추가된다고 하자

- Priest는 heal을 할 수 있다
- Priest가 Priest에게 heal을 받으면 효과가 반감된다

그럼 코드는 이런 식으로 변경될 것이다

```diff
type Props = {
  ...
};

abstract class Character {
  ...
+  _healByPriest(healRate: number): void {
+    this.props.hp += healRate * this.props.hp;
+  }
}

class Priest extends Character {
  ...
+  heal(other: Character, healRate: number): void {
+    other._healByPriest(healRate);
+  }
+  _healByPriest(healRate: number): void {
+    this.props.hp += (healRate / 2) * this.props.hp;
+  }
}

class Knight extends Character {
  ...
}

// test
...
+ const priest2 = new Priest({ hp: INIT_PRIEST_HP, damage: 30 });
+ const HEAL_RATE = 0.2;
+ priest.heal(priest2, HEAL_RATE);
+
+ assert.equal(
+   priest2.props.hp,
+   INIT_PRIEST_HP + INIT_PRIEST_HP * (HEAL_RATE / 2)
+ );

```

기능을 하나 추가하려면 기존 코드를 수정해야 한다(OCP를 위반한다)

# References

[Visitor in TypeScript](https://refactoring.guru/design-patterns/visitor/typescript/example)
