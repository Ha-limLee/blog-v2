---
title: Maybe monad in TS
date: '2024-05-29'
tags: ['typescript', 'fp']
draft: false
summary: TS에서 Maybe monad를 구현해 보자
images: []
layout: PostSimple
authors: ['default']
---

⚠️ TS v5.4.5 기준으로 작성

전체 코드

- [TS playground](https://www.typescriptlang.org/play/?noUncheckedIndexedAccess=true&noUnusedParameters=true&target=6&jsx=0&exactOptionalPropertyTypes=true&noFallthroughCasesInSwitch=true&noUnusedLocals=false#code/CYUwxgNghgTiAEAzArgOzAFwJYHtXywGcA5HDY5CCIgCwB4AVAPgAoAPALngYEou2CheAFE2kZKEYAaeKkoR4AH3hpQiLKhDAmAbgBQesHkIZ4GKAHMAygE8AtgCMcCgLzxbj5ywBEiKADccGAZLbx59DBsABwQAMQCg6XhiJng3BngAMngAb3gAbXNreycIAF0Afi5ieABffT1ImPgASTtLECsQDBbgNPh4wJg6OUcQGBlvNo6unuBvXUbohAAZKAcQCFne-sHE0Y2J+G81ja3u3oWGptX1zZaMEDt+nL14AmAuA-H9d9QoOwgLgmGAaCz6eoGAD0UPgRjsUQgIAERio4GweD0oEgsAQRlQJng0DOswAQshEIhxlwAErgILAOjTCydC7AGR0owwRmnTbbdnwXkQB5PJiLbHQOBw4ymLDtFn8whcACCMBgUBsTPlrLm4vAkrxMqJd3OcyV8FV6s1Qv5iz0MOlBNl2v5XGZOp2ylUIHUmmAhiNcpmbP6QYVbMI+QADGV9A78YTiXy2VwbSGvag1BotAGncaSSG3EnTb1IzGGq93g6AO5YDA0HDIUwAWQ1GwMVdhAAEMIQALTImKYAdqoIcN7wB0ARgAdNxlvAAOTe31aRdwqCoVBkeAbFSELTwKBCTcETPIszLGcTh0AJjnAHkHAArdGCeBRHCEQhYBwQGxLiu2bAIu17vAmpjFrMUb9FB3TkpS4z5GGHrAGU+RwXMsYdpOsIQfmyYYFOqYmiKzwZlmfoTvhmFTrBJpkhSVIwMhLohhUFTJFAxCVDOGEMexnHENx2HUUamG3mkE7vEQpDkPItAsCh-I8Fk2SyWQFBUIpmG9Dw0nvPAnGYQhzGscGWEVHxuloQZ7xcEBfoNJ28A9v2g7oiOMBjvOzSLnIVDrmAm7bqYe7IAefTHke+AaKAAg3GBjqEv8gIwUWAkYKZSHKWy6E2WUM6pSAznJaYxV0S4BkafJ2mEDQSlsXMqmZOpJCaQp9UsDZ+mGYZnEOm5A5sEOGBeT5T6vpg76ft+v7-oB56riBSV9e8JlMTlTW9PlmU7UVAIgHZ8BfPIpX4cVklVX1SntbV1BdblzVqYIclaQ9DU9cdxmZdlLFPTtVn8QWlkHYCx2nVQqkccc3jnUaxUAMxSX1G2If9219DDwk8UDNlGUJIlWcVBOwxCBiVrh+5ghaaoajO7RRDFfQMAuFjILA-rgeJmUkWcZFKCoS3Af05nhlhBkzuoECPDAt1vZ1NC9YZUvQBgrZRCwjUWXpaRMMdwOETtx3vFLWAy+M8sdXVSsm-ADNQJr3V7cAqkuKkaNmQDaF4y7ZQ8FIBk8NG2G1BT1HQN+yRkDQNOU+8USgv4UCPGVMDIJgQQsKpORh31UTIH+WBgPAJgp8X8A4Ig2e5MdcAYMgMD4Jo1bR-WYLZ78hlhwZBdFyXjPZ9UMdx3X3SN-g7eEF37x54ZffUCXiBqxrQ9t7HqAWLXa3wPXE9mLH08GXPCeF4v8AshgD4wMIEAHowrDJxAyBAtwfDcNva17038BPy-M91AnD3cCkchAACkIoYEYPAZEjxMxCFIKgd66wkR0DQAAa23NWVAYpP4JyTinBAf9X4MAAYnLAydU4QXTpnOWxCuC8DwYZKeM5iH9GIQAk+H4z4VzLtgEuVc6AAFUYFsDgcABBeBkF-hAGg1AmCcDYLFCweh8AhHvwgSYYRqR46GW-s3EArdNEYBUVAZ+IBwjHxwqffu8BGZ0BpKwRAqAuCmPMQwt2qQaQaMgXQRB0jUGONSMoOSG8t66O5nmOAhBKCmDcM4lgLDiGWJ3lgRA8AWDRNiWkFwbgAoKEUMoLJMscluEcloVS+j15ghnFXTuY8G4-2MbU6uxSMApO7r3HhS8V6OwcawY6zjXGqMYe7eAxi-FSPkCg2RQTBahLBIHPqPitH+OmTI-pwTqmbyYe8KpCSklmJfh02eXTbGX2vrfA8a8MgRN3uPH+hzzGcKAThG48Bmy+IyG4TkDI6AgkWULBRSjUhuF0fkAACmeeA6CQA2CrtwMow8kHrNQQwSFZRFiz1KigdAGJYqEE+VojIsCQDwPgL87k-yMCgk3jIDBWCcEDL6nALknxuBLPgO-VlDJ3xEqgcwJh+FiFCDcJNdErCjkgEIJk+k3ITn3MafgEVM4QD+HGDYLWyS9a-ylfAAAhLk2Q8gXpsMNWU4WfoOnALhKAj5bZZEQu8lEIQpLyWUsZACulQLGW4N0eQyhCBE44BdVwJ1Iaj75wIVQmUNCMBZ2DaG+A4aXU52OiwxNoqPzOsjZ0-O3TS7mH4UgbydgAmyOYG4l+HiuATLWVQGZD8tkLJ2XctJGS2G5LySawpurzGlKFpRCpir94tosC0+pO8qnNLqckl5+bbF8IrsAHANc7lVJbvamwGwWC5wVVwheFcHBxToAAaVEeIoQXqLAyBJWIslEjo4oobRshliimUsGOrCmwXBz1usfd+hFKahCcU0OqmAJ14Cns5X1do27X4TMFSEkedKg67LKrIWBwGw05qyLkAoTMNBQaRR-ZQ+S6gvDtjOajGac0wbWvkb9JG4MbBnBcm+d8QAsHyQHY6kIp0PIMa3Vs8HuNYZzfus5599H9M-TvIZGTM1cH5XQYDTBPEUvoysqB9biSBNwch9uraGn7yIPyxJh8ZyZuVjvTiInWOIFLeWlgBzLPWZs2tYeRnx11Mk6csSUTpXZLcPZkAM4V3Z0lsezMPhjzzBkDO6uiNbxTh4B5mc0XgA+AAF5iG8AlyBE6py3kRmlyW+itZ5DizIXLJdagabi-AAA1PAWr6X2NXK44jKMUZLETl0TWOsNAt3tj6jRXmgpSKPHIoOn0IsQsOqlk51FXHvYedNsvFOq9tbi11u7O2oWls4DLSt52IM9IO01nbd4Z2jaux1Z7LaOsfbWT9vR5Z72uXHTY90S5nGWDlNdqVSJKVDrAhpTTBb8GjsnZfUiHbqF1v202+rR2WsAD6a29YHcW4547zmeqXbkzvQyLB0c9Qe79TaLFMeY14vkcnftiaHU++8XjO8kc-avhx653gwhdxtQN2EtZ6wjbCyugy43+bTb5vcabgtAf9EOxFznmWfDe3y2LmHzm1uq7ij4GymvDt49h3prjPVOcVbtruggmMZD43q9jknhlHsY2e-Tgqn3Ocdf+4DvrY2EZg8LbSreUPWMq++2r7wGuZDG+W3D1bmMys7wy-r7whvY+4-j2b27JZXaW8E8TneNvvb25dnUTx12CKmj+mLVCHumdgxAF777Pvef89eT3CUuIMOXyFGRWIpaugwHA64jT4a7BEFkf36bixKbHhsOgJAaBMC4HwJl0QAJERcbTQHvMxYyKy+FPLtwUBqxQDrBfboM+niD+O8P8Dk7DIOmo0lMOPdiqECiFAMACBlQWybnLnVU-nwkIHQSwCZjcA8FKB8DAIgI7wnG7ylFAPAKiG-xkS4F0TgCgBXVQAWnyDgKiBIzAx+AMnyFPTdDp0wLHhwLwHwMIOILVVIJ3khSP35BIxvzsE4QF3hn3ymyeCPwFgojmz9BRkMkIPQKRDr35FJgYN9nOyxk4gYNKgdEIPgEAFjBwARkHAAF0fgEAABmwAF1XAAcQcABSm+AasUER4QAABr4BAAJUfgEAAoWm8bsXsYaUacaGALgAAYRCh3GPB-AsEnhwCXAINQLKHXA2GCgigQEvyICPHuRwL7DoIAkTXGEiCSgkJmVCIgLKBeEhDDiAA)

# 문제

TypeScript를 다루다 보면 nullish value를 자주 만나게 된다

특히 [noUncheckedIndexedAccess](./indexed-access-type) 옵션을 켜면 더 많은 nullish value를 볼 수 있다

예를 들어 아래와 같은 데이터가 있다고 하자

```ts
const tagSymbol = Symbol('favorTag');
type Favor<T, N> = T & { [tagSymbol]?: N };

type ImageSetId = Favor<number, 'ImageSetId'>;
type LabelSetId = Favor<number, 'LabelSetId'>;

type LabelItem = {
  id: number;
  name: string;
};

// 복잡한 데이터
declare const labelSetBuffer: Record<ImageSetId, Record<LabelSetId, LabelItem>>;
// imageSetIds와 labelSetIds의 값을 가지고 labelSetBuffer에서 LabelItem을 꺼낼 수 있다
declare const imageSetIds: Array<ImageSetId>;
declare const labelSetIds: Array<LabelSetId>;
```

이런 데이터 구조가 있다면 이렇게 사용할 것이다

```ts
const imageSetId = imageSetIds[0];
const labelSetId = labelSetIds[0];

const labelSet = labelSetBuffer[imageSetId][labelSetId];
// ...labelSet을 사용한 로직들
```

그러나 이렇게 사용하면 nullish 참조 오류가 나기 쉽다

1. `imageSetIds`와 `labelSetIds`는 빈 배열일 수 있기 때문에 `imageSetId`와 `labelSetId`는 `undefined`일 수 있다
2. `imageSetId` 속성은 `labelSetBuffer`에 없을 수 있기 때문에 `labelSetBuffer[imageSetId][labelSetId]`는 nullish 참조 오류가 날 수 있다
3. `imageSetId` 속성이 있다고 해도 `labelSetId` 속성이 없을 수 있기 때문에 `labelSetBuffer[imageSetId][labelSetId]`는 `undefined`일 수 있다

이런 오류를 방지하기 위해서 `noUncheckedIndexedAccess` 옵션을 켠다

```typescript
// const imageSetId: ImageSetId | undefined
const imageSetId = imageSetIds[0];
// const labelSetId: LabelSetId | undefined
const labelSetId = labelSetIds[0];

// @ts-expect-error:
// 1. Type 'undefined' cannot be used as an index type.
// 2. Object is possibly 'undefined'.
const labelSet = labelSetBuffer[imageSetId][labelSetId];
```

`noUncheckedIndexedAccess` 옵션을 켜면 타입 오류가 많이 난다

타입 오류를 해결하는 가장 쉬운 방법은 nullish coalescing operator와 optional chaining을 쓰는 거다

```ts
// const labelSet: LabelItem | undefined
const labelSet = labelSetBuffer[imageSetId ?? NaN]?.[labelSetId ?? NaN];
```

id가 NaN일 리는 없으니 대부분의 경우 이렇게 해도 문제가 없다

그러나 실수로 객체에 NaN 속성이 들어갈 수도 있기 때문에 완전히 안전한 방식은 아니다

더 안전하게 하려면 삼항연산자로 nullish value를 걸러야 한다

```ts
// non-nullish type guard
declare function isNotNullish<T>(x: T): x is Exclude<T, null | undefined>;

const labelSet =
  isNotNullish(imageSetId) && isNotNullish(labelSetId)
    ? labelSetBuffer[imageSetId]?.[labelSetId]
    : undefined;
```

삼항연산자로 해결하는 방식은 nullish value가 많이질수록 가독성이 떨어진다

더 좋은 방법은 없을까?

# Maybe monad

결국 우리가 원하는 건 `T | undefined | null`인 값이 있을 때 값이 `T`인 경우에 어떤 동작을 하고 `undefined | null`인 경우에는 안 하는 것이다

우리는 이미 비슷한 동작을 하는 자료구조를 알고 있다

바로 JS의 배열이다

JS 배열은 임의의 값에 대해서 연산(map)을 실행하는 컨테이너로 볼 수 있다

![array box](/static/images/maybe-monad/array-box.svg)

실제로 nullish value를 걸러내는 작업은 map과 filter를 이용하면 가능하다

```ts
const labelSet: LabelItem | undefined = [imageSetId]
  .filter(isNotNullish)
  .flatMap((imageSetId) =>
    [labelSetId].filter(isNotNullish).map((labelSetId) => labelSetBuffer[imageSetId]?.[labelSetId])
  )[0];
```

그러나 가독성이 별로 좋지 않다

`filter(isNotNullish)`를 알아서 해주는 컨테이너가 있으면 좋지 않을까?

non-nullish value에 대해서만 map을 적용해주는 컨테이너 말이다

그런 자료구조는 이미 있다

바로 Maybe monad다

Maybe monad는 JS의 배열과 비슷한데 길이가 1이고 map을 원소가 `undefined | null`이 아닐 때 실행하는 컨테이너라고 볼 수 있다

![maybe box](/static/images/maybe-monad/maybe-box.svg)

# Maybe 구현

간단하게 Maybe를 구현해 보자

Maybe를 구현하는 방식은 다양한데 여기서는 `Just`와 `Nothing`을 이용해 구현하려고 한다

Just는 non-nullish value만 받는 컨테이너고 Nothing은 말 그대로 아무것도 안 받는 컨테이너다

배열의 map은 항상 배열을 반환하지만 Maybe의 map은 연산 결과가 nullish value면 Nothing, non-nullish value면 Just를 반환한다

```ts
class Nothing {
  private constructor() {}
  public static of() {
    return new Nothing();
  }

  public map(): Nothing {
    return this;
  }
  public flatMap(): Nothing {
    return this;
  }
  // 컨테이너에서 내용물을 꺼내는 메서드
  public getOrElse<T>(value: T): T {
    return value;
  }
}

class Just<T extends NonNullable<unknown>> {
  private value: T;
  private constructor(value: T) {
    this.value = value;
  }
  public static of<U extends NonNullable<unknown>>(value: U): Just<U> {
    return new Just(value);
  }

  public map<R>(fn: (value: T) => R): Just<NonNullable<R>> | Nothing {
    const result = fn(this.value);
    if (result === null || result === undefined) return Nothing.of();
    return Just.of(result);
  }
  public flatMap<R>(
    fn: (value: T) => Just<NonNullable<R>> | Nothing
  ): Just<NonNullable<R>> | Nothing {
    return fn(this.value);
  }
  public getOrElse(): T {
    return this.value;
  }
}

class Maybe {
  public static fromNullable<T>(value: T): Just<NonNullable<T>> | Nothing {
    if (value === null || value === undefined) return Nothing.of();
    return Just.of(value);
  }
}
```

이런 식으로 쓸 수 있다

```ts
const labelSet: LabelItem | undefined = Maybe.fromNullable(imageSetId)
  .flatMap((imageSetId) =>
    Maybe.fromNullable(labelSetId).map((labelSetId) => labelSetBuffer[imageSetId]?.[labelSetId])
  )
  .getOrElse(undefined);
```

이제 filter와 타입 가드를 반복해서 사용하지 않아도 된다!

반복은 줄었지만 배열을 썼을 때처럼 flatMap으로 인해 depth가 깊어지는 걸 볼 수 있다

이런 depth를 줄이려면 bind를 쓰면 된다

# Bind

bind는 컨테이너의 값을 뽑아서 변수에 대입하는 동작을 말한다

우리는 이미 bind를 알고 있다

바로 `await`다

```ts
declare const getLabelItemFromServer: () => Promise<LabelItem>;

async function bindExample() {
  const labelItem: LabelItem = await getLabelItemFromServer();
  // ...
}
```

위 코드는 `Promise`라는 컨테이너에서 값만 뽑아서 `labelItem`이라는 변수에 binding하고 있다

Promise는 실패할 수 있기 때문에 연산 결과는 `LabelItem`이 아니다

그러나 실패했을 경우를 async 블록이 알아서 처리하기 때문에 우리는 성공했다 치고 `LabelItem`을 쓸 수 있는 것이다

async 블록이 실패 케이스를 알아서 처리하듯이 Maybe monad가 Nothing 케이스를 알아서 처리하도록 하면 non-nullish value만 가지고 코드를 짤 수 있지 않을까?

한 번 해보자

```ts
type Must<T = Record<string, unknown>> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

function isMust<T extends Record<string, unknown>>(record: T): record is Must<T> {
  const values = Object.values(record);
  return values.every((value) => value !== null && value !== undefined);
}

class Maybe<Props extends Record<string, unknown>> {
  private props: Props;
  private constructor(props: Props) {
    this.props = props;
  }
  public static fromNullable<T>(value: T): Just<NonNullable<T>> | Nothing {
    // ...
  }
  public static do() {
    return new Maybe({});
  }
  public bind<K extends string, T extends NonNullable<unknown>>(
    key: K extends keyof Props ? never : K,
    maybe: Just<T> | Nothing
  ) {
    const nextProps: Props & { [p in K]: T | null } = {
      ...this.props,
      [key]: maybe.getOrElse(null),
    };
    return new Maybe(nextProps);
  }
  public return<R>(fn: (props: Must<Props>) => R): Just<NonNullable<R>> | Nothing {
    return isMust(this.props) ? Maybe.fromNullable(fn(this.props)) : Nothing.of();
  }
}
```

Promise의 async-await처럼 Maybe의 do-bind를 쓸 수 있다

```ts
const labelItem: LabelItem | undefined = Maybe.do()
  .bind('imageSetId', Maybe.fromNullable(imageSetId))
  .bind('labelSetId', Maybe.fromNullable(labelSetId))
  .return(({ imageSetId, labelSetId }) => labelSetBuffer[imageSetId]?.[labelSetId])
  .getOrElse(undefined);
```

# 결론

## Maybe monad는 TS에 필요한가?

그렇지 않다

### null-safe하게 TS를 쓸 수 있다

TS는 union type을 지원하기 때문에 `Just<T> | Nothing` 대신 `T | null`로 대상이 null일 수 있다는 걸 타입 차원에서 알릴 수 있다

또한 `strictNullCheck`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` 옵션을 활성화하면 실수로 nullish value를 사용하는 걸 방지할 수 있다

### 러닝커브

혼자 개발하는 프로젝트라면 문제 없겠지만 다른 사람과 작업하는 프로젝트라면 러닝커브를 무시할 수 없다

Maybe monad를 익히는데 필요한 비용보다 효용이 크다면 할만하겠지만 [대안](#대안)이 있기 때문에 효용이 그렇게 크지 않다

## 대안

symbol을 이용한다

```ts
const skip = Symbol('skip');

declare const skippable: {
  readonly [skip]: never;
  [K: ImageSetId]: {
    readonly [skip]: never;
    [P: LabelSetId]: LabelItem;
  };
};

const labelItem: LabelItem | undefined = skippable[imageSetId ?? skip]?.[labelSetId ?? skip];

// @ts-expect-error: Cannot assign to '[skip]' because it is a read-only property.
skippable[skip] = {};
```

이렇게 하면 의도하지 않은 속성을 참조할 일이 없다

# 참고

[Mostly adequate guide#maybe](https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch08#schroedingers-maybe)

[Functional-Light JavaScript#maybe](https://github.com/getify/Functional-Light-JS/blob/master/manuscript/apB.md/#maybe)

[fp-ts do-bind](https://www.typescriptlang.org/play/?noUncheckedIndexedAccess=true#code/JYWwDg9gTgLgBAbzhMNgQHZwIYGc4DyANHAGYCuGAxmpjvgGJYC+ZUEIcA5KWALQxcXANwAoUVUy54MbAHMAygE8QAIwgAbOAF44ytZoAUAIlLYAbtAAq84wEoxMJWACmcBhegAeKyQByAHw6cFZwAGSIcADasooq6hoAugD8AFxwfnDMYqJOrnAAkiDyLgouMAUAJsEellBeGORqLlAkxkUlZRWVxgGOzm4AMtiqLhpdVTWe9Y3NrXDGw6Pj5VW9OQD0G3CS4BouAB47mvs06BiilS5UGthQbpIY0nC3y10AQuSkpC3pAErXaCVLyiOCFYpyUqrSpEUFwAGSKDApZjCYwyLASrpWajKDCOAYbAgFzpaRQYAYORZAKiPqXa63e7HJ7wUCdaHpDqQtFwAA+BPIGg0YiuNzuDyk8FeqI5cBRK26fLglCupApLkqOUez3uuEFMFJMHJlJqGAAdGBgK5DHCCGaACIQWFgu2qCmVQxcA5cEiGOw6IJ20jsEB+QWvfaGNnc6F2OzOwhmt0YD1cJQ+uB+gOJ4McMNCkaR6UKqpxhNB24wACy2DAhkMSAOJCUWX92iCCDhYPuMHIUCwQZD+YjLkMxY+Xx+UCiBxSZqiSjnhOJDjhzHjtrNkJgBCgAFENLhR1n29wuBu7KIgA)

[TypeScript, similar to Required, but converting all object properties to non-nullable](https://stackoverflow.com/questions/58941356/typescript-similar-to-required-but-converting-all-object-properties-to-non-nul)

[TS strictNullCheck](https://www.typescriptlang.org/tsconfig/#strictNullChecks)

[TS noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess)

[TS exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes)
