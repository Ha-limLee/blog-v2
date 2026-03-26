---
title: Correlated union
date: '2024-03-02'
tags: ['typescript']
draft: false
summary: type-safe하게 dispatch table 사용하는 법
images: []
layout: PostSimple
authors: ['default']
---
# 문제

[이전 글](double-dispatch-using-dispatch-table)에서 Dispatch table을 구현할 때 타입 단언을 했다

```ts
const hit = <A extends Character, B extends Character>(a: A, b: B): B => {
  const fn = (table[a.kind]?.[b.kind] ?? hitDefault) as unknown as Hit<A, B>;
  return fn(a, b);
};
```

타입 단언을 한 이유는 TS가 fn이 a, b와 엮여있다는 걸 모르기 때문이다

문제를 쉽게 파악하기 위해서 single dispatch인 경우를 생각해보자

```ts
type Common = {
  hp: number;
  damage: number;
};

type Knight = {
  kind: 'Knight';
} & Common;

type Priest = {
  kind: 'Priest';
} & Common;

type Character = Knight | Priest;

const roarDefault = <T>(character: T) => character;

type Roar<T extends Character> = (x: T) => T;

type Table = {
  [T in Character as T['kind']]?: Roar<T>;
};

declare const table: Table;

const roar = <T extends Character>(character: T) => {
  const fn = table[character.kind];
  return fn ? fn(character) : roarDefault(character);
};
```

hit에서 타입 오류가 난 것처럼 roar에서 타입 오류가 발생한다

![type error on single dispatch](/static/images/correlated-union/single-dispatch-type-error.png)

실제로 위 코드는 런타임에 문제가 없다

그럼에도 TS는 오류를 준다

왜 이렇게 되는 걸까?

# Correlated union

문제를 분석해보자

character의 타입은 `Knight | Priest`로 union이다

fn 또한 union이다

![typeof fn](/static/images/correlated-union/single-dispatch-typeof-fn.png)

우리는 table에서 character.kind 속성을 찾았으니 fn은 character와 연관이 되어있다는 걸 안다

```ts
// 현재 table의 타입
// type Table = {
//   Knight?: Roar<Knight>;
//   Priest?: Roar<Priest>;
// };
declare const table: Table;

const roar = <T extends Character>(character: T) => {
  // fn의 타입은 Roar<Knight> | Roar<Priest> | undefined이지만
  // character가 Knight면 fn은 Roar<Knight>
  // Priest면 fn은 Roar<Priest>이다
  // 따라서 어떤 경우든 fn을 부를 수 있다
  const fn = table[character.kind];
  return fn ? fn(character) : roarDefault(character);
};
```

그러나 TS는 fn과 character가 연관 되었다는 걸 모른다

이런 문제를 Correlated union problem이라고 부른다

TS는 fn과 character의 관계를 알지 못하고 그냥 fn을 union으로 둔다

```ts
const roar = <T extends Character>(character: T) => {
  const fn = table[character.kind];
  // 여기에서 fn의 타입은 Roar<Knight> | Roar<Priest>
  return fn ? fn(character) : roarDefault(character);
};
```

TS는 parameter의 타입이 union type이면 intersection type으로 바꾼다

<details>
<summary>왜 union을 intersection으로 바꾸는가?</summary>

타입 안전성을 보전하기 위해서다

```ts showLineNumbers
type Knight = {
  kind: 'Knight';
  sword: string;
};

type Priest = {
  kind: 'Priest';
  wand: string;
};

type GetEquipment<T> = (character: T) => string;

const fn: GetEquipment<Knight> | GetEquipment<Priest> =
  Math.random() >= 0.5
    ? (character: Knight) => character.sword
    : (character: Priest) => character.wand;

const character: Knight = {
  kind: 'Knight',
  sword: 'great sword',
};

// 만약 여기서 타입 오류가 안 난다면 그대로 JS로 컴파일 될 것이고
// knight는 wand가 없기 때문에 50% 확률로 런타임 오류가 발생한다
// 따라서 parameter로 가능한 한 넓은 객체를 받아야 한다
// union의 intersection이면 모든 prop이 있다는 게 보장되므로 런타임 오류를 방지할 수 있다
// 그런데 Knight & Priest는 kind가 'Knight'이면서 'Priest'인 객체인데
// 이런 객체는 존재할 수 없으므로 never가 된다
fn(character);
```

</details>

fn의 parameter 타입은 `Knight & Priest`가 된다

Knight와 Priest는 discriminated union이므로 `Knight & Priest`는 `never`다

따라서 fn의 parameter 타입은 `never`이며 never에 character를 대입하려고 했기 때문에 타입 오류가 발생한 것이다

# 해결 방법

correlated union 문제는 **Distributive object type**을 사용하면 해결할 수 있다

⚠ 이 방법은 TS 4.6 이상부터 사용 가능하다

## Distributive object type

Distributive object type에 대해서 설명하기 전에 만들어보자

먼저 type map을 만들어야 한다

```diff
type KnightProp = {
- kind: 'Knight';
  sword: string;
} & Common;

type PriestProp = {
- kind: 'Priest';
  wand: string;
} & Common;

+ type CharacterMap = {
+   _knight: KnightProp;
+   _priest: PriestProp;
+ };
```

Character의 sub type에 있던 kind를 제거했다

kind는 Character를 만들 때 넣어줄 것이다

```ts
type CharacterMap = {
  _knight: KnightProps;
  _priest: PriestProps;
};

// distributive object type
type Character<K extends keyof CharacterMap = keyof CharacterMap> = {
  [P in K]: {
    kind: P;
  } & CharacterMap[P];
}[K];
```

여기서 `Character`가 distributive object type이다

mapped type에 바로 indexed access type을 적용한 형태이다

얼핏보면 `type Character = Knight | Priest`와 다른 점이 없는 것처럼 보인다

그러나 이제는 type parameter `K`에 따라서 sub type이 생성된다

```ts
type Knight = Character<'_knight'>;
type Priest = Character<'_priest'>;
```

즉, distributive object type의 강력한 점은 *타입이 아직 정해지지 않았다*는 것이다

이제 dispatch table 타입을 만들자

```ts
type Roar<K extends keyof CharacterMap> = (x: Character<K>) => Character<K>;

type Table<K extends keyof CharacterMap = keyof CharacterMap> = {
  [P in K]?: Roar<P>;
};
```

여기도 변화가 생겼다

type parameter `K`에 따라서 Table 안에 있는 Roar의 타입이 정해진다

이전에는 이런 연관성이 없었다는 점을 잊지 말자

마지막으로 roar 함수를 만들자

```ts
const roar = <K extends keyof CharacterMap>(character: Character<K>) => {
  const fn = table[character.kind];
  return fn ? fn(character) : roarDefault(character);
};
```

바뀐 점은 두 가지다

- type parameter가 `T extends Character`에서 `K extends keyof CharacterMap`으로 변경
- parameter character의 타입이 `T`에서 `Character<K>`로 변경

드디어 타입 오류가 안 난다!

![single dispatch, no type error](/static/images/correlated-union/single-dispatch-no-type-error.png)

왜 타입 오류가 안 나올까?

두 가지 이유가 있다

- 타입이 아직 구체화 되지 않았다
- 타입들이 같은 type parameter로 연관되어 있다

즉, 우리는 직접 Correlated union을 구현한 것이다!

같은 방식을 double dispatch에 적용하면 타입 단언 없이 코드를 작성할 수 있다

코드는 [여기](https://gist.github.com/Ha-limLee/3312467ba9e43359ff6809e6013da0a9#file-correlated-union-ts)에서 볼 수 있다

# 결론

## 장점

- 타입 건전함

  타입 단언이 없기 때문에 런타임 오류를 걱정하지 않아도 된다

## 단점

- 직관성이 떨어진다

- 처음부터 계획해야 한다

  확장을 염두하고 처음부터 distributive object type을 만들어야 한다

  그렇지 않으면 나중에 코드를 다 고쳐야 한다

이미 union이 존재한다면 타입 단언을 하고 테스트 코드를 작성하는 식으로 넘어가고 나중에 코드를 수정할 것 같다

다행히 correlated union을 만드는 작업은 타입만 수정하면 돼서 런타임 걱정은 안 해도 된다

# References

- [Wishlist: support for correlated union types](https://github.com/microsoft/TypeScript/issues/30581)
- [Fix multiple issues with indexed access types applied to mapped types](https://github.com/microsoft/TypeScript/pull/47109)
- [Why can't I call a union of functions with a union of parameters?](https://stackoverflow.com/a/71340801)
- [Why does typescript expect 'never' as function argument when retrieving the function type via generics?](https://stackoverflow.com/questions/55572797/why-does-typescript-expect-never-as-function-argument-when-retrieving-the-func)
- [Indexed Access Inference Improvements](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html#indexed-access-inference-improvements)
- [TypeScript, objects and type discrimination](https://stackoverflow.com/a/70373647)
