---
title: 왜 children은 리렌더링되지 않을까?
date: '2024-08-24'
tags: ['react']
draft: false
summary: 부모 컴포넌트와 소유 컴포넌트의 차이
images: []
layout: PostSimple
authors: ['default']
---

# 목차



**참고 자료**

- [실습 코드](https://github.com/Ha-limLee/react-render)
- [배포된 페이지](https://ha-limlee.github.io/react-render/)

# 부모가 렌더링되면 자식도 렌더링 된다

다음 코드를 보자.

```tsx
export default function ParentHasChild(): React.JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div onClick={() => setCount(count + 1)}>
      <p>parent: {count}</p>

      <Child />
    </div>
  )
}
```

count가 바뀌면 `<ParentHasChild />`가 다시 렌더링되며 자식인 `<Child />` 또한 렌더링된다.


<video
  src="/static/videos/why-children-not-re-rendered/parent-child-re-render.mp4"
  controls
  width="422"
/>

반대로 `<Child />`의 상태가 바뀌어도 `<ParentHasChild />`는 렌더링되지 않는다.

<video
  src="/static/videos/why-children-not-re-rendered/child-render-parent-no-render.mp4"
  controls
/>

# children prop도 자식이니까

이런 원리를 따른다면 children prop으로 `<Child />`를 받아도 똑같이 동작할 것이다.

```tsx
type Props = {
  children: ReactNode
}

function Parent({ children }: Props): React.JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div
      onClick={() => {
        setCount(count + 1)
      }}
    >
      <p>parent: {count}</p>

      <div>{children}</div>
    </div>
  )
}

export default function ChildrenProp(): React.JSX.Element {
  return (
    <div>
      <Parent>
        <Child />
      </Parent>
    </div>
  )
}
```

<video
  src="/static/videos/why-children-not-re-rendered/children-prop-click-parent.mp4"
  controls
/>

그러나 예상과는 달리 children prop으로 `<Child />`를 받으면 부모 컴포넌트가 리렌더링 되어도 `<Child />`는 리렌더링 되지 않는다!

왜 이런 일이 일어나는 걸까?

# 소유 컴포넌트

그 이유는 렌더링의 핵심은 부모 컴포넌트가 아닌 소유 컴포넌트(owner component)이기 때문이다.

> In React, an element's 'owner' refers to the thing that rendered it. Sometimes an element's parent is also its owner, but usually they're different. This distinction is important because props come from owners.

[출처 - react-devtools/CHANGELOG.md](https://github.com/facebook/react/blob/b57d282369b3b3232d8fed537f5aaf0156430d63/packages/react-devtools/CHANGELOG.md?plain=1#L1220)

부모 컴포넌트가 아닌 소유 컴포넌트가 element를 렌더링하는 것이다!

`<Parent />`에서 prop으로 받은 `<Child />`를 출력해보자.

```diff
export default function Parent({ children }: Props): React.JSX.Element {

+  console.log(children);
+
   return (
     <div>
```

![log children prop](/static/images/why-children-not-re-rendered/log-children.png)

출력된 Child element 객체를 보면 `owner` 속성을 볼 수 있다. `owner` 속성을 통해 `<Child />`의 소유자는 `<ChildrenProp />`임을 알 수 있다.

즉, `<Child />`의 부모인 `<Parent />`는 `<Child />`의 소유자가 아니기 때문에 `<Parent />`가 리렌더링되어도 `<Child />`는 리렌더링되지 않았던 것이다.

소유 컴포넌트는 React dev tools에서도 확인할 수 있다.

- component tree

  ![dev tools component tree](/static/images/react-rerender/dev-tools-component-tree.png)

- owner tree

  ![dev tools owner tree](/static/images/react-rerender/dev-tools-owner-tree.png)

React dev tools에서 컴포넌트를 더블클릭하면 목록 상단에서 owner tree를 볼 수 있다.

이미지에서 보이는 것처럼 component tree는 `ChildrenProp -> Parent -> Child`로 나타나지만, owner tree는 `ChildrenProp -> Child`로 나온다.

# 결론

어떤 컴포넌트의 부모 컴포넌트가 아닌 소유 컴포넌트가 렌더링될 때 그 컴포넌트는 렌더링된다는 걸 알아보았다. 이 사실을 바탕으로 React 동작을 살펴보면 부모 - 자식 관계로 생각할 때보다 쉽게 이해할 수 있다.

# References

[The mystery of React Element, children, parents and re-renders](https://www.developerway.com/posts/react-elements-children-parents)

[React) children prop에 대한 고찰(feat. 렌더링 최적화)](https://velog.io/@2ast/React-children-prop%EC%97%90-%EB%8C%80%ED%95%9C-%EA%B3%A0%EC%B0%B0feat.-%EB%A0%8C%EB%8D%94%EB%A7%81-%EC%B5%9C%EC%A0%81%ED%99%94)

[Parents & Owners in React: Rendering Performance](https://julesblom.com/writing/parents-owners-performance)

[Thinking In React](https://ko.legacy.reactjs.org/docs/thinking-in-react.html#step-4-identify-where-your-state-should-live)

[React Element’s “Parent” vs “Rendered By”](https://medium.com/welldone-software/react-elements-parent-vs-rendered-by-4f879849cd58)
