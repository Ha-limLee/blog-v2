---
title: Dispatch table로 Double dispatch
date: '2024-02-14'
tags: ['typescript', 'clean-code']
draft: false
summary:
images: []
layout: PostSimple
authors: ['default']
---

**Double dispatch**

1. [Double dispatch란?](double-dispatch)
2. [OOP식 Double dispatch](double-dispatch-in-oop)
3. Dispatch table로 Double dispatch





# Dispatch table

Dispatch table은 함수 또는 메서드를 가지고 있는 테이블을 말한다

```ts
const dispatchTable = {
  getNumber: () => 3,
  getString: () => 'hello',
}

// test
const fn = dispatchTable.getNumber
const result = fn()
equal(result, 3)
```

OOP를 지원하는 대부분의 언어는 암시적으로 테이블을 생성하고 거기에 메서드를 보관하는데

이걸 명시적으로 만들면 Double dispatch를 흉내낼 수 있다

# 목표

이번엔 클래스가 아닌 함수로 double dispatch를 구현해보자

double dispatch를 흉내내는 함수 hit는 다음 조건을 만족한다

- 함수 hit는 두 개의 인자를 받는다
- hit는 두 인자의 타입에 따라 다른 동작을 한다

```ts
// knight가 priest를 공격
// priest는 knight로부터 1.5배의 피해를 받음
const result0 = hit(knight, priest)
// priest가 knight를 공격
// knight는 priest로부터 1배의 피해를 받음
const result1 = hit(priest, knight)
```

# 단순한 방법

요구사항을 만족하는 가장 빠른 방법은 조건문을 넣는 것이다

```ts
const hit = <A, B>(a: A, b: B): B => {
  if (isKnight(a)) {
    // isKnight(a) && isPriest(b)로 표현할 수도 있으나
    // 나중에 다른 종류가 추가됐을 때를 고려해 중첩 if문 사용
    if (isPriest(b)) {
      return {
        ...b,
        // Priest는 Knight로부터 1.5배의 피해를 받는다
        hp: b.hp - 1.5 * a.damage,
      }
    }
  }
  // default case
  return {
    ...b,
    hp: b.hp - a.damage,
  }
}
```

그러나 이 방법은 조건이 많아지면 읽기 어렵다는 문제가 있다

# 전략

코드가 복잡하거나 그렇게 될 가능성이 있다면 분리를 하면 된다

```ts
const dispatchTable = {
  // hit의 구현을 가지고 있음
  ...
}

const hit = <A, B>(a: A, b: B): B => {
  // 동작을 구현하지 않고 가져오기만 함
  const fn = dispatchTable[a][b];
  return fn(a, b);
}
```

이렇게 구현하면 임의의 두 객체(a, b)에 대해서 적절한 함수가 실행된다

마치 함수가 오버로딩된 것처럼 말이다

# 구현

이제 본격적으로 구현해보자

캐릭터를 다음과 같은 타입으로 표현할 수 있다

```ts
type Common = {
  hp: number
  damage: number
}

type Knight = {
  kind: 'Knight'
} & Common

type Priest = {
  kind: 'Priest'
} & Common

type Character = Knight | Priest
```

Knight와 Priest를 구분하기 위해서 구분 속성 `kind`를 넣어서 Character를 discriminated union으로 표현했다

그럼 캐릭터 A가 B를 공격하는 함수는 다음과 같이 표현할 수 있다

```ts
type Hit<A extends Character, B extends Character> = (a: A, b: B) => B
```

이제 dispatch table을 만들어야 한다

table의 타입은 어떻게 될까?

table에서 값을 가져올 때 `table[a.kind][b.kind]`처럼 사용하므로 다음과 같이 타입을 만들 수 있다

```ts
type Table = {
  [A in Character as A['kind']]?: {
    [B in Character as B['kind']]?: Hit<A, B>
  }
}
```

이제 구현만 하면 된다

현재 요구사항은 "Knight가 Priest를 공격할 때 1.5배의 피해를 입힌다"이므로 (Knight, Priest)만 생각하면 된다

```ts
const table: Table = {
  Knight: {
    Priest: (a, b) => ({ ...b, hp: b.hp - 1.5 * a.damage }),
  },
}
```

(Knight, Priest)가 아닌 경우 사용할 함수도 만든다

```ts
const hitDefault = <A extends Character, B extends Character>(a: A, b: B): B => ({
  ...b,
  hp: b.hp - a.damage,
})
```

이제 hit 함수를 구현하자

```ts
const hit = <A extends Character, B extends Character>(a: A, b: B): B => {
  const fn = (table[a.kind]?.[b.kind] ?? hitDefault) as unknown as Hit<A, B>
  return fn(a, b)
}
```

전체 코드는 [여기](https://gist.github.com/Ha-limLee/06a2a624b568906e39a93f46430ce964)에서 볼 수 있다

<details>
<summary> fn 타입을 단언한 이유</summary>

아래 코드처럼 타입 단언을 하지 않으면 오류가 발생한다

자세한 내용은 [Correlated union](correlated-union) 참고

![type error](/static/images/double-dispatch-using-dispatch-table/type-error.png)

</details>
 
<br/>

# 결론

## 장점

- 종류를 추가하기 쉽다

새로운 직업이 추가되면 타입을 새로 만들면 된다

```diff
type Priest = {
  kind: "Priest";
} & Common;

+ type Rogue = {
+   kind: 'Rogue';
+ } & Common;
+
+ type Character = Knight | Priest | Rogue;

type Hit<A extends Character, B extends Character> = (a: A, b: B) => B;
```

- 기능을 추가하기 쉽다

새로운 기능 heal이 추가된다고 하자

<ul style={{ listStyleType: 'none' }}>
  <li>Priest는 heal을 할 수 있다</li>
  <li>Priest가 Priest에게 heal을 받으면 효과가 반감된다</li>
</ul>

요구사항을 따라 새로운 함수 heal을 구현하면 된다

```ts
type CanHeal = {
  healRate: number
} & Character

type Heal<A extends CanHeal, B extends Character> = (a: A, b: B) => B

type HealTable = {
  [A in CanHeal as Character['kind']]?: {
    [B in Character as Character['kind']]?: Heal<A, B>
  }
}

const healTable: HealTable = {
  Priest: {
    Priest: (a, b) => ({ ...b, hp: b.hp + (a.healRate / 2) * b.hp }),
  },
}

const healDefault = <A extends CanHeal, B extends Character>(a: A, b: B): B => ({
  ...b,
  hp: b.hp + a.healRate * b.hp,
})

const heal = <A extends CanHeal, B extends Character>(a: A, b: B): B => {
  const fn = (healTable[a.kind]?.[b.kind] ?? healDefault) as unknown as Heal<CanHeal, B>
  return fn(a, b)
}

// test
const priest0: CanHeal = {
  kind: 'Priest',
  hp: 100,
  damage: 10,
  healRate: 0.2,
}

const priest1: Priest = {
  kind: 'Priest',
  hp: 100,
  damage: 10,
}

const afterHeal = heal(priest0, priest1)

deepStrictEqual(afterHeal, {
  ...priest1,
  hp: priest1.hp + (priest0.healRate / 2) * priest1.hp,
})
```

## 단점

- 종류를 추가할 때 OCP를 위반한다

- 보일러플레이트

  기능을 추가할 때마다 비슷한 코드가 반복된다

- 타입 건전성(Type soundness) 해침

  타입 단언을 했기 때문에 타입이 불건전해졌다

## OOP 방식과 비교

이전 글에서 다뤘던 OOP 방식(연속 single dispatch)과 비교해보자

| | OOP | Dispatch table |
| - | --- | -------------- |
| 종류 추가 | Good | Good |
| 기능 추가 | Bad | Good |
| OCP | Bad(기능 추가할 때) | Bad(종류 추가할 때) |
| 타입 건전성 | Good | Bad |

개인적으로는 Dispatch table 방식을 사용할 것 같다

OOP 방식을 사용하려면 처음부터 설계를 잘 해야 하지만 Dispatch table 방식은 그런 부담이 덜 한 것 같다

# References

- [Dispatch table](https://en.wikipedia.org/wiki/Dispatch_table)
- [Virtual methodtable](https://en.wikipedia.org/wiki/Virtual_method_table)
