---
title: 내가 만든 satisfies
date: '2024-03-10'
tags: ['typescript']
draft: false
summary: satisfies 연산자를 직접 만들어보자
images: []
layout: PostSimple
authors: ['default']
---

⚠ TS 5.4 기준으로 작성되었다

# 배경

코드를 작성하다보면 몇가지 조건을 만족하는 객체를 만들고 싶을 때가 있다

예를 들어 객체의 값이 string이면서 ‘data-’를 prefix로 가졌으면 하는 상황을 생각해보자

가장 간단한 방법은 type annotation을 주는 것이다

```ts
declare const fruitMap: Record<string, `data-${string}`>;
```

이렇게 annotation을 주면 잘못된 문자열을 입력하는 걸 TS 컴파일러가 알려준다

![type annotation](/static/images/diy-satisfies/type-annotation.png)

그러나 이 타입은 사용자에게 불편하다

구현을 보지 않는 이상 `fruitMap`에 어떤 속성이 있는지를 알 수가 없다

![no property hint](/static/images/diy-satisfies/no-property-hint.png)

따라서 타입을 가능한 한 좁히는 게 좋다

```ts
declare const fruitMap: Record<'apple' | 'banana', `data-${string}`>;
```

이렇게 하면 사용자는 어떤 속성이 있는지 알 수 있다

![type annotation](/static/images/diy-satisfies/property-hint.png)

문제는 새로운 속성이 추가될 때마다 작업을 두 번 해야한다는 것이다

```ts {1,4}
const fruitMap: Record<'apple' | 'banana' | 'pineapple', `data-${string}`> = {
  apple: 'data-apple',
  banana: 'data-banana',
  pineapple: 'data-pineapple',
};
```

불편하다

내가 원하는 건

- 객체 리터럴 타입 추론
- 객체 리터럴 제한

이 두 가지다

이걸 간단하게 하는 방법은 없을까?

# satisfies 연산자

이런 요구사항을 반영한 게 TS 4.9의 [satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) 연산자다

```ts
const fruitMap = {
  apple: 'data-apple',
  banana: 'data-banana',
} satisfies Record<string, `data-${string}`>;
```

satisfies 다음으로 오는 타입이 객체 리터럴의 조건이다

만약 조건을 만족하지 않으면 타입 오류가 발생한다

![satisfies operator](/static/images/diy-satisfies/satisfies-operator.png)

이렇게 satisfies 연산자는 객체 리터럴을 만들 때 매우 유용하다

그러나 지금 작업 중인 프로젝트에서는 prettier 버전 문제로 사용할 수 없었다

# 직접 구현

없으면 직접 만드는 수밖에 없다

함수로 satisfies를 흉내낼 수 있다

```ts
const satisfies =
  <Constraint extends Record<string, unknown>>() =>
  <T extends Constraint>(x: T) =>
    x;
```

satisfies는 함수를 반환하는 함수다

첫 번째 함수는 type parameter를 받는데 타입 제약을 걸 때 쓰인다(`A satisfies B`에서 B에 해당)

첫 번째 함수가 반환한 함수는 identity 함수인데 인자로 받은 값(`x`)이 타입 제약을 만족하는지 체크한다

만약 타입 제약을 만족한다면 추론된 인자의 타입(`T`)을 반환한다

만약 만족하지 않는다면 인자로 받을 수 없다며 타입 오류가 발생할 것이다

잘 작동하는지 보자

```ts
// test
const result = satisfies<Record<string, `data-${string}`>>()({ apple: 'data-apple' });

// 위 코드는 다음과 같다
const result = {
  apple: 'data-apple',
} satisfies Record<string, `data-${string}`>;
```

타입이 객체 리터럴을 생성하는 것처럼 추론이 됐다

![my satisfies result](/static/images/diy-satisfies/my-satisfies-result.png)

또한 타입 제약 `` Record<string, `data-${string}`> ``을 만족하지 않으면 타입 오류가 난다

![my satisfies error](/static/images/diy-satisfies/my-satisfies-error.png)

## 왜 이렇게 구현했는가?

`tl;dr` type parameter를 부분적으로 적용하기 위해서다

이런 식으로 구현 했으면 더 좋았을 것이다

```ts
const satisfies = <Constraint extends Record<string, unknown>, T extends Constraint>(x: T) => x;
```

그리고 이렇게 사용한다

```ts
const result = satisfies<Record<string, `data-${string}`>>({ apple: 'data-apple' });
```

satisfies 연산자를 쓰는 것만큼 가독성이 좋지는 않지만 함수가 함수를 반환하는 형태보다는 낫다

그러나 이렇게 쓰면 타입 오류가 난다

![partial type param error](/static/images/diy-satisfies/partial-type-param-error.png)

TS는 type parameter를 부분 적용할 수 없기 때문이다 [참고](https://github.com/microsoft/TypeScript/issues/26242)

따라서 두 번째 인자에 타입을 넣어줘야 한다

```ts
const prev = {
  apple: 'data-apple',
} as const;

const result = satisfies<Record<string, `data-${string}`>, typeof prev>(prev);
```

이런 방식은 DX가 그리 좋지는 않다

한 쪽은 유저가 직접 지정하고 다른 쪽은 추론되도록 하려면 이 둘을 나눌 수밖에 없다

따라서 함수가 함수를 반환하는 형태가 된 것이다

# 결론

## 장점

- TS 4.9 기능을 쓸 수 없는 경우 유용하다

## 단점

- satisfies 연산자에 비해 가독성이 나쁘다

다소 가독성은 떨어지지만 사용할 가치는 있는 것 같다
