---
title: 객체에 대한 쓰기 작업 제한
date: '2023-07-03'
tags: ['clean-code']
draft: false
summary: Proxy를 이용한 객체 변경 제한
images: []
layout: PostSimple
authors: ['default']
---

# Introduction

_"It is better to have 100 functions operate on one data structure than 10 functions on 10 data structures."_

_—Alan Perlis_

코드를 읽기 어렵게 만드는 요소 중 하나는 잦은 변경(Mutation)이다

읽는 사람은 코드 흐름을 따라가는 동시에 변수의 상태를 기억해야 한다

이런 문제를 해결하기 위해서 `const`나 `Object.freeze`를 이용해 변경을 금지할 수도 있지만 때론 변경이 필요할 때가 있다

```js
const result = {}
try {
  result.data = callApi()
} catch (e) {
  result.data = handleError()
}
```

이런 식으로 오류를 처리할 때 선언문과 할당이 분리된다

코드를 쓴 사람은 `result.data`가 언제 어떻게 변경되고 어떤 시점에 사용되는지 안다

그러나 코드를 읽는 사람은 전혀 알 수 없다

만약 코드를 작성한 사람이 `result.data`가 한 번만 변경된다는 메시지를 줄 수 있다면 코드를 읽는 사람은 상태 변경을 걱정할 필요가 없다

# Restrict Mutation Using Proxy

프록시를 사용하면 객체에 대한 작업을 재정의 할 수 있다

객체의 쓰기 작업(set)을 재정의해 상태 변경을 줄일 수 있다

```js
const result = new Proxy(
  {},
  {
    set(obj, prop, value) {
      const FLAG = '__SET_DISABLED'
      if (FLAG in obj) throw new Error('value already set')
      obj[FLAG] = true
      obj[prop] = value
    },
  }
)

try {
  result.data = callApi()
} catch (e) {
  result.data = handleError()
}
```

첫 번째 인자로 받은 객체의 쓰기 동작을 재정의했다

`result`의 속성을 한 번만 변경할 수 있으며 두 번 변경을 하면 오류가 발생한다

![](/static/images/restrict-write/error.value-already-set.png)

함수로 만들면 코드를 읽는 사람에게 분명한 메시지를 줄 수 있다

```js
const setOnce = (target) => {
  let isSetBlocked = false
  return new Proxy(target, {
    set(obj, prop, value) {
      if (isSetBlocked) throw new Error('value already set')
      isSetBlocked = true
      obj[prop] = value
    },
  })
}
```

```js
// test
const apple = setOnce({})

apple.value = 3
apple.value = 100 // ❌ Uncaught Error: value already set
apple.grade = 'gold' // ❌ Uncaught Error: value already set
```

Intellisense 도움을 받으려면 prop을 미리 선언하는 게 좋다

조건을 추가해보자

```js
const setPropOnce = (target) => {
  const disabledKeys = {}
  return new Proxy(target, {
    set(obj, prop, value) {
      if (!(prop in obj)) throw new Error(`${prop} is not defined`)
      if (prop in disabledKeys) throw new Error(`${prop} is already set`)
      disabledKeys[prop] = true
      obj[prop] = value
    },
  })
}
```

```js
// test
const fruits = setPropOnce({ apple: 0, banana: 0 })

fruits.apple = 100
fruits.apple = 3 // ❌ Uncaught Error: apple is already set
fruits.banana = 200
fruits.banana = 1000 // ❌ Uncaught Error: banana is already set
fruits.pineapple = 300 // ❌ Uncaught Error: pineapple is not defined
```

# References

[Proxy, MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)

[Proxy, The Modern JavaScript Tutorial](https://javascript.info/proxy)
