---
title: Type variance in TypeScript
date: '2024-03-24'
tags: [typescript]
draft: false
summary: TS의 변성과 타입 안전성
images: []
layout: PostSimple
authors: ['default']
---



⚠ TypeScript v5.4.2 --strict 환경에서 작성

# 도입

타입 변성(Type variance)은 subtyping을 지원하는 언어에서 타입 간 대체 규칙을 말한다

예를 들어 보자

```ts
class Animal {
  eat() {}
}

class Cat extends Animal {
  walk() {}
}

const cat: Cat = new Cat();

const animal: Animal = cat;
```

Cat을 Animal에 대입할 수 있는 건 자명하다

Cat은 Animal의 subtype이기 때문이다

```ts
declare const cats: Array<Cat>;

const animals: Array<Animal> = cats;
```

배열은 어떨까?

`Array<Cat>`은 `Array<Animal>`에 대입할 수 있을까?

Cat을 Animal에 대입할 수 있으니 그럴 것이다

그렇다면 함수도 똑같이 동작할까?

```ts
type OnAnimal<T extends Animal> = (x: T) => void;

declare const onCat: OnAnimal<Cat>;

// @ts-expect-error
const onAnimal: OnAnimal<Animal> = onCat;
```

타입 오류가 났다!

왜 그럴까?

바로 타입 변성(Variance) 때문이다

# 타입 변성

타입 변성은 4가지 종류가 있다

- 공변(Covariant)
- 반변(Contravariant)
- 이변(Bivariant)
- 무변(Invariant 또는 Nonvariant)

하나씩 알아보자

## 공변

Animal의 subtype인 Cat을 기호로 나타내자

`Cat ≤ Animal`

양변에 `Array<T>`를 적용해도 이 관계는 유지된다

`Array<Cat> ≤ Array<Animal>`

이런 관계를 **공변한다**고 한다

왜 공변해야 할까? 만약 공변하지 않는다고 해보자

```ts
const animals: Array<Animal> = [new Animal()];
// 만약 공변하지 않으면 여기서 타입 오류가 나지 않는다
const cats: Array<Cat> = animals;
const first = cats[0];
if (first) {
  // 타입 상에선 walk를 부를 수 있다
  // 그러나 런타임에 first는 Animal이므로 walk가 없다
  first.walk();
}
```

따라서 `Array<T>`의 경우 공변해야 하는 걸로 보인다

그럼 공변하면 문제가 없을까?

```ts
class Animal {
  eat() {}
}

class Cat extends Animal {
  walk() {}
}

// Cat ≤ Animal
// Array<Cat> ≤ Array<Animal>
const cats: Array<Cat> = [];
const animals1: Array<Animal> = cats;

animals1.push(new Animal());
const lastCat = cats.pop();

if (lastCat) {
  // lastCat은 Cat 타입인데 런타임에서는 Animal이다!
  // Animal은 walk 메서드가 없으니 런타임 오류가 발생한다
  lastCat.walk();
}
```

위 코드는 타입 오류가 없지만 런타임에 오류가 발생한다

이처럼 변경(mutation)이 일어나는 경우 공변하면 타입 안전하지 않다

그러나 TS는 완벽한 타입 시스템보단 실용성을 추구하기 때문에 이런 코드를 허용한다

<details>
  <summary>참고</summary>

- [TypeScript-Design-Goals](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals)
- [Assigning to a wider union type breaks type safety](https://github.com/microsoft/TypeScript/issues/55451#issuecomment-1686782616)

</details>

만약 `Array<T>`에 대해서 [무변](#무변)한다면 배열을 인자로 받는 함수를 쉽게 쓸 수 없을 것이다

```ts
class Animal {
  eat() {}
}

class Cat extends Animal {
  walk() {}
}

function foo(xs: Array<Animal>) {}

const cats: Array<Cat> = [];
// 만약 Array<T>에 대해서 공변하지 않으면 여기서 타입 오류가 난다
// 따라서 Array<Cat>을 받는 함수를 만들거나 기존 함수를 generic으로 바꿔야 한다
foo(cats);
```

Array만 공변하는 건 아니다

예를 들어 객체는 속성에 대해서 공변한다

```ts
type Fruit = {
  price: number;
};

type NewFruit = {
  price: number | string;
};

const fruit0: Fruit = {
  price: 1_000,
};

// Fruit.price ≤ NewFruit.price
// Fruit ≤ NewFruit
const newFruit: NewFruit = fruit0;
// @ts-expect-error
const fruit1: Fruit = newFruit;
```

## 반변

반변은 공변의 반대다

`OnAnimal`을 생각해보자

```ts
class Animal {
  eat() {}
}

class Cat extends Animal {
  walk() {}
}

type OnAnimal<T extends Animal> = (x: T) => void;

const onCat0: OnAnimal<Cat> = (x) => {};

// @ts-expect-error
const onAnimal: OnAnimal<Animal> = onCat0;

// OnAnimal<T>에 대해서 반변
const onCat1: OnAnimal<Cat> = onAnimal;
```

`Cat ≤ Animal`

`OnAnimal<Cat> ≥ OnAnimal<Animal>`

즉, 반변은 subtype과 supertype의 관계가 역전되는 상황을 말한다

반변성은 왜 필요할까?

만약 `OnAnimal<T>`에 대해서 Cat과 Animal이 반변하지 않으면 이런 코드도 작성할 수 있을 것이다

```ts
type OnAnimal<T> = (x: T) => void;

const onCat: OnAnimal<Cat> = (x) => x.walk();
// 만약 반변하지 않으면 여기서 타입 오류가 나지 않는다
const onAnimal: OnAnimal<Animal> = onCat;
// Animal에서 walk 메서드를 찾을 수 없으니 런타임 오류가 난다
onAnimal(new Animal());
```

`OnAnimal<T>`이 반변하면 이런 문제를 방지할 수 있다

물론 반변한다고 문제가 없는 건 아니다

```ts
const onAnimal: OnAnimal<Animal[]> = (x) => x.push(new Animal());
const onCat: OnAnimal<Cat[]> = onAnimal;

const cats: Cat[] = [];
onCat(cats);

const lastCat = cats.pop();
if (lastCat) {
  // lastCat의 타입은 Cat이지만 런타임에서는 Animal이다
  // Animal에는 walk 메서드가 없으니 런타임 에러
  lastCat.walk();
}
```

공변에서 봤듯이 객체를 변경하면 타입 안전을 보장할 수 없게 된다

이외에도 객체는 객체 키에 대해서 반변한다

```ts
type Small = 'apple' | 'banana';
type Big = 'pineapple' | Small;
// Small ≤ Big
const x: Big = 'apple' as Small;

type SmallRec = Record<Small, number>;
type BigRec = Record<Big, number>;
// SmallRec ≥ BigRec
const xx: SmallRec = {} as BigRec;
// @ts-expect-error
const yy: BigRec = {} as SmallRec;
```

## 이변

이변성은 공변성과 반변성 모두를 가지는 경우다

기호로는 이렇게 나타낸다

`OnAnimal<Cat> ≡ OnAnimal<Animal>`

이변성은 매우 특이한 경우에만 타당하다

```ts
type AlwaysZero<T> = () => 0;

const x: AlwaysZero<Cat> = () => 0;
const y: AlwaysZero<Animal> = x;
const z: AlwaysZero<Cat> = y;
```

이처럼 타입 매개변수가 있지만 쓰이지 않는 경우 이변해도 문제가 없다

그러나 이변은 대부분 안전하지 않다

예를 들어 TS에서는 [strictFunctionTypes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types) 옵션을 끄면 이변성을 볼 수 있다 [TS playground](https://www.typescriptlang.org/play?strictFunctionTypes=false#code/N4KABGDGA2CGDO8wEEB2BLAtraZgF8Rwo5EwBhWAFzAFMAPK21AEyTSxz2IgHccA1vAAUASgLFCxKgE8ADrTAB5VB2zQAPABUAfGAC8YYfQBcYLaIN6AbgHt0LANxEIkW6ng13anAAYzKj6aQXqGxpb6egTOxG4eXqiUVP7KqhjqGkmhYN7pfjEQAPSFYIADC4Ch42CAJGOAGp2AADVggBkNgAOTYIBSo4ApTYAnTbHunjmJ1ACMAWmcmlkGRvQRevQAdPzQQmIFUH0JQSOpQRohU+5JQ2vFYIAP7aWAIePVNQCExLnjQ8KotLwoedBios74QA)

```ts
class Animal {}

class Cat extends Animal {
  walks() {}
}

type OnAnimal<T> = (x: T) => void;

const onAnimal0: OnAnimal<Animal> = (x) => {};

const onCat0: OnAnimal<Cat> = onAnimal0;

// 타입 오류가 나지 않는다
const onCat1: OnAnimal<Cat> = (x) => x.walks();

const onAnimal1: OnAnimal<Animal> = onCat1;

// 런타임 오류!
onAnimal1(new Animal());
```

이와 같이 함수가 이변성을 가지면 안전하지 않다

따라서 TS 개발진은 strictFunctionTypes 옵션을 통해 함수가 이변하지 않도록 했다

추가로 class method의 매개변수 타입 또한 이변한다

```ts
// Persian ≤ Cat ≤ Animal

class Animal {
  eat() {}
}

class Cat extends Animal {
  walk() {}
}

class Persian extends Cat {
  constructor(private color: string) {
    super();
  }
}

interface Iface {
  foo(arg: Cat): void;
}

// Arg<Persian> ≤ Arg<Cat>
const x: Iface = {
  foo(arg: Persian) {},
};

// Arg<Cat> ≥ Arg<Animal>
const y: Iface = {
  foo(arg: Animal) {},
};
```

class method에 대해서 이변을 막으려면 strictFunctionTypes 옵션이 켜진 상태에서 arrow method를 사용하면 된다

```ts {2}
interface Iface {
  foo: (arg: Cat) => void;
}

const x: Iface = {
  // 공변하지 않음
  // @ts-expect-error
  foo(arg: Persian) {},
};
```

[TS Playground](https://www.typescriptlang.org/play?#code/N4Ag9GIEYJYG4EMBOMEDsAuID2aQGMAbBAZxJAFsBTDAC2wBMAoEcSABSqRNTwB4QAYQRYBAQTQwKCQixByipchKkyQwOayoiAFAEp1AXznHWC4mSEiQVAB4YqaBssnTC6zSADuMgNb6jEzlzJRBObl4be0dnKywNVlZ8XBIMJABXfAxsJB0ABxREBwJsQhyALhBUlDQAcwMExNYSdLyufQBuT1MQHrkYTC4AMwR8KhAASRGxjyah7GwdZFrK4Qw9SrhsGAYu1j7WCBAxJFq+cJ50AD4QcVO+NauFFKxbSqnR8YBeWcT5xeWlQuvAahgANCY9vJDpATmdHiAbnC+Co3E8ki8QABPd7Tb6-Vj-JanSqomSgiH7LrGJigI7JTBIBCIFDoLC4AgWcjIJDYLyUGj0ZgwsJcS78OK3Y6uGTBJJc6WqdyNLS6UFBMzy0JrKIOJwuJUE7x+ALAHoHTmhYHoXUxcg6lUlNDVTLZXIFeAicbJMpISrVAb1I3NVrtPRQ-Ya6EgAYOJB4yYJx3-SrElZxAxfG5bHZQi1HZHWtA3JH3R7PZ2vXGfEA-ZMLNNAsUgoyU3pQuQFssiEvHe5kwjop2pbHVmZ1zxEwGKtwUyFMYxAA)

## 무변

무변성은 공변하지도 않고 반변하지도 않는 경우를 말한다

대표적인 예시는 타입 매개변수로 인자를 받는 동시에 반환하는 경우가 있다

```ts
class Animal {
  eat() {}
}

class Cat extends Animal {
  walk() {}
}

// T가 매개변수의 타입이면서 반환값의 타입
type OnAnimal<T> = (x: T) => T;

const onAnimal: OnAnimal<Animal> = (x) => x;
// @ts-expect-error
const onCat: OnAnimal<Cat> = onAnimal;
// @ts-expect-error
const onAnimal1: OnAnimal<Animal> = onCat;
```

무변은 공변, 반변에서 일어나는 문제가 없다

무변성만 있는 타입 시스템을 만들면 문제가 없겠지만 그러면 다형성을 적용하기 어렵다

# 결론

TS 타입 시스템에서 변성과 타입 안전하지 않은 경우를 알아보았다

TS는 타입 안전하지 않다

그렇다고 TS가 가치 없는 건 아니다

적어도 TS는 똑똑한 주석 역할을 한다

주석으로도 객체에 어떤 속성이 있는지를 적을 수 있지만 강제는 아니다

반면 TS는 어떤 속성이 있는지 추론해주며 그럴 수 없는 경우는 속성을 명시하도록 강제한다([no implicit any](https://www.typescriptlang.org/tsconfig#noImplicitAny))

무엇보다 VSCode의 IntelliSense를 통해 자동완성을 할 수 있는 건 TS 덕분이다

<br />

그럼에도 불구하고 타입 시스템이 안전하지 않다는 사실에 마음이 복잡하다

'이 유추된 타입이 과연 정확할까?'같은 생각이 든다

[변성에 대한 엄격한 규칙](https://github.com/microsoft/TypeScript/issues/18770)이 TS에 추가되면 상당수 해결되겠지만 그 전까지는 개발자가 타입 안전하도록 코드를 짜야 한다

- 객체를 불변으로 다루기

  앞서 살펴봤듯이 객체를 가변으로 다루면 런타임 오류가 발생할 수 있다

- 테스트 코드 작성

  타입이 런타임과 일치한다는 걸 보장한다

  특히 타입 단언을 하면 그 부분에 대해서 꼭 테스트 코드를 작성한다

# References

[Covariance and contravariance](<https://en.wikipedia.org/wiki/Covariance_and_contravariance_(computer_science)>)

[Optional Variance Annotations for Type Parameters](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7-beta/#optional-variance-annotations-for-type-parameters)

[Difference between Variance, Covariance, Contravariance, Bivariance and Invariance in TypeScript](https://stackoverflow.com/questions/66410115/difference-between-variance-covariance-contravariance-bivariance-and-invarian)

[TypeScript Deep Dive. Variance](https://basarat.gitbook.io/typescript/type-system/type-compatibility#variance)

[Why doesn't TypeScript complain when assigning a class to an interface that accepts more params than the class?](https://stackoverflow.com/questions/71417022/why-doesnt-typescript-complain-when-assigning-a-class-to-an-interface-that-acce)
