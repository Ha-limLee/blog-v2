---
title: Exhaustiveness Check
date: 2026-07-07
draft: false
tags:
  - python
---

**환경**

- python==3.13
- mypy==2.1.0

## 문제

### unhandled case

다음과 같이 도형이 정의되어 있다고 하자.

```py
@dataclass
class Rect:
    x: int
    y: int
    width: int
    height: int

@dataclass
class Circle:
    x: int
    y: int
    radius: int

Shape = Rect | Circle
```

도형을 그리고 직렬화하는 함수는 다음과 같다.

```py
def draw(shape: Shape):
    match shape:
        case Rect():
            return draw_rect(shape)
        case Circle():
            return draw_circle(shape)

def serialize(shape: Shape):
    match shape:
        case Rect():
            return serialize_rect(shape)
        case Circle():
            return serialize_circle(shape)
```

이 함수들을 사용하여 도형을 그리고 클라이언트에 보내는 동작이 잘 되고 있었다. 그러다 시간이 흘러 새로운 요구사항이 추가됐다. 바로 선을 그리는 것이다.

```py
class Point(NamedTuple):
    x: int
    y: int

@dataclass
class Line:
    points: list[Point]
```

```diff
-Shape = Rect | Circle
+Shape = Rect | Circle | Line
```

개발자는 `draw()`에 새로운 케이스를 추가했다.

```diff
 def draw(shape: Shape):
     match shape:
         case Rect():
             return draw_rect(shape)
         case Circle():
             return draw_circle(shape)
+        case Line():
+            return draw_line(shape)
```

그러나 `serialize()`에 새로운 케이스를 추가하는 걸 잊은 바람에 클라이언트는 선을 그려도 저장할 수 없었다.

## 해결

### exhaustiveness check

이런 문제는 정적으로 모든 케이스가 다 처리됐는지 검사해주는 기능이 있는 툴을 사용하면 해결된다. 이런 기능을 "exhaustiveness check"라고 한다.

python의 경우 mypy, pyright 등의 타입 체커 등이 exhaustiveness check를 할 수 있다. mypy는 `--enable-error-code exhaustive-match`를[^mypy-exhaustive-match], pyright은 `reportMatchNotExhaustive`를 활성화하면[^pyright-exhaustive-match] 이런 오류가 발생한다.

```sh
main.py:38: error: Match statement has unhandled case for values of type "Line"  [exhaustive-match]
main.py:38: note: If match statement is intended to be non-exhaustive, add `case _: pass`
Found 1 error in 1 file (checked 1 source file)
```

![](/static/images/exhaustiveness-check/mypy-exhaustive-match.png)

[mypy playground](https://mypy-play.net/?mypy=2.1.0&python=3.13&enable-error-code=exhaustive-match&gist=e271990e9ded8f3734b08b7a456e12f3)

## 원리

exhaustiveness check는 match 구문의 default case(`case _:`)에서 변수의 타입이 최종적으로 bottom type(python의 경우 `Never`)으로 좁혀졌는지 확인하는 것이다[^unreachable]. `serialize()`에서 오류가 난 건 shape의 마지막 타입이 `Never`가 아니었기 때문이다.

![](/static/images/exhaustiveness-check/not-never-type.png)

<sup>마지막 타입이 `Never`가 아닌 `Line`이다.</sup>

반면 `draw()`에서는 shape가 `Never`가 됐기 때문에 오류가 발생하지 않는다.

![](/static/images/exhaustiveness-check/never-type.png)

## 마치며

### exhaustiveness check와 테스트 코드

exhaustiveness check는 테스트 코드로 대체하기 어렵다. 왜냐하면 모든 케이스에 대해서 테스트 코드를 작성한다는 건 개발자가 모든 케이스를 알고 있다는 것인데, 기능이 많아질수록 그러기는 힘들기 때문이다.

### exhaustiveness check와 sum type

exhaustiveness check는 sum type이 있는 언어엔 대부분 있다. 예를 들어 rust에선 sum type을 `enum` 키워드로 구현할 수 있으며, 컴파일 타임에 exhaustiveness를 검사한다.

```rust
enum Shape {
    Rect,
    Circle,
    Line,
}

fn serialize(shape: Shape) {
    match shape {
        Shape::Rect => {},
        Shape::Circle => {},
    }
}
```

이 rust 코드를 빌드하면 다음과 같은 오류가 난다.

```sh
error[E0004]: non-exhaustive patterns: `Shape::Line` not covered
```

[rust playground](https://play.rust-lang.org/?version=stable&mode=debug&edition=2024&code=enum+Shape+%7B%0A++++Rect%2C%0A++++Circle%2C%0A++++Line%2C%0A%7D%0A%0Afn+serialize%28shape%3A+Shape%29+%7B%0A++++match+shape+%7B%0A++++++++Shape%3A%3ARect+%3D%3E+%7B%7D%2C%0A++++++++Shape%3A%3ACircle+%3D%3E+%7B%7D%2C%0A++++%7D%0A%7D%0A)

[^mypy-exhaustive-match]: https://mypy.readthedocs.io/en/stable/error_code_list2.html#check-that-match-statements-match-exhaustively-exhaustive-match

[^pyright-exhaustive-match]: https://microsoft.github.io/pyright/#/configuration?id=type-check-rule-overrides

[^unreachable]: https://typing.python.org/en/latest/guides/unreachable.html
