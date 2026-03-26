---
title: Double dispatch
date: '2024-01-14'
tags: ['typescript', 'clean-code']
draft: false
summary:
images: []
layout: PostSimple
authors: ['default']
---

**Double dispatch**

1. Double dispatch란?
2. [OOP식 Double dispatch](double-dispatch-in-oop)
3. [Dispatch table로 Double dispatch](double-dispatch-using-dispatch-table)





# Problem

게임을 만든다고 하자

요구사항은 다음과 같다

1. 전사, 성직자 클래스가 있다
2. 각 클래스는 다른 클래스를 공격할 수 있다
3. 전사가 성직자 클래스를 공격하면 1.5배의 피해를 입힌다

이제 개발을 해야한다

가장 빠르게 구현할 수 있는 방법은 조건문을 이용해 공격 대상이 성직자면 1.5배의 대미지로 공격하는 것이다

```tsx
type Props = {
  hp: number
  damage: number
}

abstract class Character {
  constructor(public props: Props) {}
  hit(other: Character): void {
    other.props.hp -= this.props.damage
  }
}

class Priest extends Character {
  constructor(props: Props) {
    super(props)
  }
}

class Knight extends Character {
  constructor(props: Props) {
    super(props)
  }
  hit(other: Character) {
    switch (true) {
      case other instanceof Priest:
        other.props.hp -= 1.5 * this.props.damage
        break
      default:
        super.hit(other)
    }
  }
}

// test
const knight = new Knight({ hp: 300, damage: 50 })
const INIT_PRIEST_HP = 250
const priest = new Priest({ hp: INIT_PRIEST_HP, damage: 30 })
knight.hit(priest)

assert.equal(priest.props.hp, INIT_PRIEST_HP - 1.5 * knight.props.damage)
```

아주 간단하다

그런데 이런 고민이 생긴다

새로운 클래스가 추가될 때마다 Knight의 hit 함수는 길어진다

```diff
class Knight extends Character {
  ...
  hit(other: Character) {
    switch (true) {
      case other instanceof Priest:
        other.props.hp -= 1.5 * this.props.damage;
        break;
+     case other instanceof Thief:
+			  ...
+       break;
+     case other instanceof Archer:
+			  ...
+				break;
      default:
        super.hit(other);
    }
  }
}
```

덩어리가 커지면 기능을 파악하기 어렵고 실수할 확률도 커진다

개선할 수는 없을까?

# Overloading

오버로딩을 지원하는 언어라면 더 좋은 방법이 있다

```tsx
class Knight extends Character {
  ...
  // 어떤 함수를 실행할지는 언어가 알아서 결정해준다
  hit(other: Priest) {
    other.props.hp -= 1.5 * this.props.damage;
  }
  hit(other: Thief) {
    ...
  }
  hit(other: Archer) {
    ...
  }
}
```

이런 방식은 TS에서는 불가능하다

TS에서 오버로딩은 타입 오버로딩 뿐이기 때문에 구현을 분리할 수는 없다

만약 구현 오버로딩을 지원한다고 해도 런타임에서는 제대로 작동하지 않을 것이다

```tsx
const knight: Knight = new Knight(...);
const priest: Priest = new Priest(...);
// 인자로 넘어오는 객체의 타입을 컴파일 타임에 알 수 있다
// 따라서 컴파일 타임에 확장되어서 Knight의 hit(other: Priest): void가 실행된다
knight.hit(priest);

const maybePriest: Character = new Priest(...);
// 실제 객체는 Priest지만 타입 정보는 Character다
// 따라서 hit(other: Character)를 찾아서 바인딩하게 된다
// Knight에는 그런 시그니처를 가지고 있는 함수가 없기 때문에
// super인 Character의 hit(other: Character): void를 실행한다
knight.hit(maybePriest);
```

Java 같은 경우 위 코드처럼 동작한다

이런 오버로딩은 반쪽짜리다

# Double dispatch

지금 겪고 있는 문제는 언어가 Double dispatch를 지원하지 않기 때문에 발생하는 것이다

Double dispatch란 두 객체의 조합을 바탕으로 함수 또는 메서드를 찾아 실행하는 걸 말한다

TS는 JS와 마찬가지로 Single dispatch만 지원한다

```jsx
class Knight extends Character {
    ...
    hit(other: Character){ ... }
}

class DragonKnight extends Knight {
    ...
    hit(other: Character){ ... }
}

// test
const knight: Knight = new DragonKnight(...);
// prototype chain에서 hit 메서드를 찾고
// 가장 먼저 발견된 메서드를 실행한다
// 인스턴스(this)에 따라서 실행되는 메서드가 결정되기 때문에
// Single dispatch다
knight.hit(other);
```

만약 Double dispatch가 된다면 this뿐만 아니라 hit 메서드의 인자인 other도 포함해 실행할 메서드가 결정돼야 한다

그러나 앞서 살펴봤듯이 TS는 Double dispatch를 지원하지 않아서 Double dispatch가 되는 것처럼 만들어야 한다

Double dispatch를 흉내내는 방법은 두 가지가 있다

- OOP 방식
- Dispatch table

다음에는 Double dispatch를 흉내내는 방법에 대해서 알아보자

# References

[Single_and_multiple_dispatch](https://en.wikipedia.org/wiki/Dynamic_dispatch#Single_and_multiple_dispatch)

[Difference between Visitor pattern & Double Dispatch](https://stackoverflow.com/a/9818184)
