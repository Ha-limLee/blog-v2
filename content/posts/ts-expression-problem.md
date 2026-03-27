---
title: TS로 보는 expression problem
date: "2023-12-10"
tags: []
draft: true
summary:
images: []
layout: PostSimple
authors: ["default"]
---

# 도입

게임을 만든다고 하자

처음 요구사항은 다음과 같다

- 직업은 Knight와 Priest가 있다
- 각 캐릭터는 다른 캐릭터를 공격할 수 있다

이 요구사항에 따르면 다음과 같이 코드를 작성할 것이다

```ts
type Props = Readonly<{
  hp: number;
  damage: number;
}>;

abstract class Character {
  protected constructor(public readonly props: Props) {}

  abstract from(props: Partial<Props>): Character;

  abstract attack(target: Character): Character;
}

class Knight extends Character {
  constructor(props: Props) {
    super(props);
  }

  from(props: Partial<Props>): Knight {
    return new Knight({ ...this.props, ...props });
  }

  attack(target: Character): Character {
    const nextHp = target.props.hp - this.props.damage;
    return target.from({ hp: nextHp });
  }
}

class Priest extends Character {
  constructor(props: Props) {
    super(props);
  }

  from(props: Partial<Props>): Priest {
    return new Priest({ ...this.props, ...props });
  }

  attack(target: Character): Character {
    const nextHp = target.props.hp - this.props.damage;
    return target.from({ hp: nextHp });
  }
}
```

그런데 시간이 흘러 새로운 요구사항이 추가된다

- 다른 캐릭터의 공격을 막을 수 있다

```diff
class Knight extends Character {
  ...

  attack(target: Character): Character {
+   const factor = target instanceof Priest ? 1.5 : 1;
+   const nextHp = target.props.hp - factor * this.props.damage;
    return target.from({ hp: nextHp });
  }
}
```

# References

[표현 문제란?](https://see-ro-e.tistory.com/334)
