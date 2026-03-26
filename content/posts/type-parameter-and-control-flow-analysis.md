---
title: Type parameter와 control flow analysis
date: '2024-05-06'
tags: ['typescript']
draft: false
summary: TS의 한계와 극복하는 법
images: []
layout: PostSimple
authors: ['default']
---



⚠ TS v5.4.5 기준으로 작성됨

# 상황

union type에 대해서 공통 속성을 추가하고 싶을 때가 있다

예를 들어 다음과 같은 union type이 있다고 하자

```ts
type Knight = {
  tag: 'Knight';
  sword: 'great-sword';
};

type Priest = {
  tag: 'Priest';
  wand: 'magic-wand';
};

type Character = Knight | Priest;
```

union을 사용하다보면 공통 속성을 추가하고 싶을 때가 있다

```ts
// Character에 공통 속성(hp, damage) 추가
type CharacterWithCommon = Character & { hp: number; damage: number };

function createCharacter(character: Character): CharacterWithCommon {
  switch (character.tag) {
    case 'Knight':
      return {
        ...character,
        hp: 100,
        damage: 100,
      };
    case 'Priest':
      return {
        ...character,
        hp: 50,
        damage: 50,
      };
  }
}
```

이렇게 하면 요구사항을 충족할 수 있으나 한 가지 불편한 점이 있다

```ts
declare const knigt: Knight;
// @ts-expect-error
const result: Knight = createCharacter(knigt);
```

Knight를 input으로 줬으니 반환값은 당연히 Knight에 대입할 수 있는 객체다

그러나 타입 상으론 createCharacter의 반환 타입은 `Knight | Priest`이며 Priest는 Knight에 대입할 수 없기 때문에 타입 오류가 발생한다

따라서 caller가 직접 타입을 좁혀야 한다

```ts
declare const knigt: Knight;
const result = createCharacter(knigt);

if (result.type === 'Knight') {
  const modified: Knight = result;
  // ...
}
```

매개변수 타입에 따라서 반환 타입도 정해졌으면 한다

이럴 때 generic으로 구현하면 된다

매개변수 타입을 T라 하면 반환 타입은 CharacterWithCommon 중에서 T와 매칭되는 타입이 될 것이다

```ts
function createCharacter<T extends Character>(
  character: T
): Extract<CharacterWithCommon, { tag: T['tag'] }> {
  switch (character.tag) {
    case 'Knight':
      // @ts-expect-error
      return {
        ...character,
        hp: 100,
        damage: 100,
      };
    case 'Priest':
      // @ts-expect-error
      return {
        ...character,
        hp: 50,
        damage: 50,
      };
  }
}

declare const knight: Knight;
const result: Knight = createCharacter(knight);
```

이렇게 하면 의도한 대로 작동한다

문제는 함수 내부에서 타입 오류가 발생한다는 거다

왜 타입 오류가 나는 걸까?

# 원인

타입 오류가 나는 원인은 TS 컴파일러가 변수의 타입은 좁힐 수 있지만 타입 매개변수를 좁히지는 못하기 때문이다

다시 코드를 보자

```ts
function createCharacter<T extends Character>(
  character: T
): Extract<CharacterWithCommon, { tag: T['tag'] }> {
  switch (character.tag) {
    case 'Knight':
      // 여기에서 character는 Knight로 좁혀진다
      // -> T는 Knight다
      // -> 반환 타입은 Knight & { hp: number; damage: number }로 추론된다
      // -> 따라서 타입 오류는 나지 않아야 한다
      return {
        ...character,
        hp: 100,
        damage: 100,
      };
    case 'Priest':
      return {
        // ...
      };
  }
}
```

이렇게 논리적으로는 타입 오류가 안 나는 게 맞다

그러나 TS 컴파일러가 T를 Knight로 추론하지 못하기 때문에 반환 타입도 `Knight & { hp: number; damage: number }`로 추론되지 않는다

따라서 타입 오류가 발생하는 것이다

# 해결방법

## Function overloads

함수 구현부에서 오류가 나니까 함수 오버로딩으로 타입을 느슨하게 만들면 타입 오류를 피할 수 있다

```ts
function createCharacter<T extends Character>(
  character: T
): Extract<CharacterWithCommon, { tag: T['tag'] }>;

function createCharacter(character: Character): CharacterWithCommon {
  switch (character.tag) {
    case 'Knight':
      return {
        ...character,
        hp: 100,
        damage: 100,
      };
    case 'Priest':
      return {
        ...character,
        hp: 50,
        damage: 50,
      };
  }
}

declare const knight: Knight;
const result: Knight = createCharacter(knight);
```

물론 함수 오버로딩은 함수 구현부에서 타입 안전을 보장하지 않는다

```ts
function createCharacter<T extends Character>(
  character: T
): Extract<CharacterWithCommon, { tag: T['tag'] }>;

function createCharacter(character: Character): unknown {
  switch (character.tag) {
    case 'Knight':
      // 타입 오류가 발생하지 않는다
      return null;
    case 'Priest':
      return null;
  }
}

declare const knight: Knight;
// 런타임에서 null
const result: Knight = createCharacter(knight);
```

따라서 별로 좋은 방법은 아니다

## Dispatch table

switch의 각 case를 함수로 만들고 dispatch table을 경유하도록 만들면 타입 안전하게 작성할 수 있다

이 경우 distributive object type을 이용해야 한다

참고) [Correlated union](./correlated-union)

```ts
// 기존 타입을 map으로 표현
type CharacterMap = {
  Knight: {
    sword: 'great-sword';
  };
  Priest: {
    wand: 'magic-wand';
  };
};

// 기존 union을 distributive object type으로 표현
type CharacterUnion<T extends keyof CharacterMap = keyof CharacterMap> = {
  [K in T]: {
    tag: K; // <- 판별 속성이 타입 변수로 있어야 한다
  } & CharacterMap[K];
}[T];
type CharacterWithCommonUnion<T extends keyof CharacterMap = keyof CharacterMap> = {
  [K in T]: CharacterUnion<K> & { hp: number; damage: number };
}[T];

type CreateCharacterMap<T extends keyof CharacterMap = keyof CharacterMap> = {
  [K in T]: (character: CharacterUnion<K>) => CharacterWithCommonUnion<K>;
};
// switch문의 각 case를 함수로
const createCharacterMap: CreateCharacterMap = {
  Knight: (character) => ({ ...character, hp: 100, damage: 100 }),
  Priest: (character) => ({ ...character, hp: 50, damage: 50 }),
};

function createCharacter<T extends keyof CharacterMap>(
  character: CharacterUnion<T>
): CharacterWithCommonUnion<T> {
  return createCharacterMap[character.tag](character);
}

declare const knight: Knight;
const result: Knight = createCharacter(knight);
```

이렇게 하면 타입 안전하게 의도한 바를 이룰 수 있다

# 결론

**그냥 union을 쓰자**

generic과 union은 잘 섞이지 않는다

이 둘을 같이 쓰면서 타입 안전하게 만드려면 distributive object type같은 트릭을 써야 한다

그런데 이런 트릭은 가독성이 안 좋다

이런 상황이 생긴다면 union을 쓰고 조건문으로 타입을 좁혀서 사용하도록 하자

전체 코드

- [TS Playground](https://www.typescriptlang.org/play/?jsx=0#code/C4TwDgpgBA0gdgSwOYAthQLxQN4CgpTACGSAXFAETzJoUDc+UAzgO4D2ATgCbkVIcQiwALStOXergC+DXKEhQAChwQQm6LHgLEylZavWSCLInB6UAtiQQBjYSbOSZuOeGgBhFEQ5EbwCByYsIio6AA+SipqwLLyHl4+fgEA6gjAKO5sFhZscEGe3r7+gQBkOFAoYORwAK4WAEYBdFBcRFZIENV1jYHOuHBtamC+0ACqiLk4jABmNXB+CJM2AkIQBYnFABQ2CUUB5Ot7HACUB7tJHKnpmdmTWgTMLGk7UNvnxQB0OsdTDw82RCY0CoIVopEYfwIAmANQ4eXukIeH2RO0KFwANBDERUqlAAIwABgJmOxD1a7U6+KJJOxzkRAKBeiihnBpOhsPhWMRyI+qI2ARppMq5AArMSuZDySRKWLBZC6Q8pIwlYwuBAbAAbbzQGy5dRQADWIWA5GooQYBAA9JaoAABYBMYQQAAekD8To4HE4jF1cH1AiYNQ1JuCNA0UGWgn8hwumyNyGAxwYKoGFiGIygAHEIHAArYAEI1YAAUU9nF+UFm82AizykdWMeKAB4ACpQF3+MxMKCNgIAPk2WL5R3ILZppygxedwA2Td7lzSGSyOTg6PKOlHAG0KDoKABdKBSPsVgisZ4oV7Di5fEg-BH-QHAs1giVWm32x0ut0iAJejivqB2ThE9sR5K9ijlRFhSpcVSQIKUOnIQlYNpC1IQZYF9GiChWWxa07QdJ1XXVH8y3-NkIBhYD725FF3gFACCGg2VGJaNppVFFDEQVAglV4lx4PVLUBAjPV0HjUJTVBGIfTEwC1CDENn3Deto3ojg42kpNpBcVN0xsaAAHkADcAg1NgiC4CsqwWJYVjUtFmzbDscy4bt5wHId1NHcdyCnGcijndSriXW5V3XEgtx3Eh90PPtZAIGyazsqM1nUt5HP2Ht1InecQpuFcQLPYAXgy-kOBvJA7wlDDKGUnCAKAzk4KgMD1MgyFoOQjq-gQyluoAniH0ZCgsJZRrKI5EDaN5drWOYrjsT6ziesPND+P41UhO1US-XE6SpLDNDfX9BTg0O0IglUtLMo0iS0G0lNBiYYYDKgEyzIsrgADk2GAABlIhpmge4ktrCN7Ju8rW3badXPc9TPL+cCsrHRgJ382c8sXArcjXbBCEiqAW23XcDyPBLKzmWy60h+cypHbLbonOYjTYFhmoeYrSpRirvmmiNHzq6SGooqi8lqDUNXW4bMOZYBRexJqoEl6WsT4w8BJabaRJO-awwutBjrkgNFMNlS6fS+7E2TXTnte6Bki9OAkAAWSIMBICs+44iZ8r3bAIJ72U8gaKgfCuAQJhlgQCwEAGOB0CYFA2CDKy4D+qBGgqAIIAlDdhbDIxITEbheH4KNRHYbhi94mWxpDMOC9G+Xa4eBxzAodpbHsUwJBlhU+m0Nw-aOcZaxhlyu0NCAQDYaZR4uAOggNWf58X4oA+PTQsU3GAoHj4m9zOW6A73vc0KkTcWwvxhfex65l1ycfcibLFnLh6fV7nhf52XrBv7rz-h7Gk28QJ7wPnkG+J9yovzgE2GAx4ygE2grUBoTQ2IUi6Og3ol9r63zviPdwltT4e0np-NyM8f4bwCP-KhQD1JbyDrvfeh9oGXm8jQjgcCEF9h+BgY8D9Qorh4Ygy+xs9oQ1SsA3ExDpGMI9swv4IcOHM0wMeTYBM2q3TXF1akmCOIwUPMcOUDdyAMwuPwjRWi6I6JxCtAxiEoBimMTSIeVNqzg2uvOchnZKGAN-gosASN-icPnDwlsfZfJcPyk-OAETjz3nwh+Ii34PR-ixMrbxQTNy80qnuCxxRtKbUEpqHaetDQHVDOaRgyTCJfhIuk70BAKmm3OtUtAV0SHlU0mGR6ds0wvQzAHL2FZ75BKUQ8FRYdS6dwrkIKu4g25DTMQLDuvBu52A7ss8RWtxm3QibDPx3YAlcLoacmRYD7wQLYcfAWBcYADygGUGR588E3zQvs8qsSwo8Pfkc+G9DAmkMDgAtewL-YgMYFclhkCj4wLHhMeBiDnnlFQd0DBy0VYYtwcqfBlN77dKOAHXxgKLkTLBdQy5kyCA3KgXcwpWVwlIt4VYmJOM4miPisqCR+pskgoOESpeiid7KKqYyk46jXg2NmnYvRxJHH9SJK4rEqyJVss0a1Wx5VdG4llIqziKq65azBilBs6lSVf3BWcj2ISWlhPUgk6JQjcbxJZZEkCWShWbw9rk9S+T1WXy1mqMpus5LW3Nry9AbSlLSS6fI26vTQj9KAA)

# 참고

- [Generic narrowing of dependent arguments and return values](https://stackoverflow.com/a/77195286)
