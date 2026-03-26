---
title: Dependency Conflict with User Site
date: '2025-10-29'
tags: ['python']
draft: false
summary:
images: []
layout: PostSimple
authors: ['default']
---



# Dependency Conflict with User Site

## Dependency conflict

시스템 전역에 설치된 python이 있고, 이 python을 이용해 시스템을 개발한다고 하자. 그러면 pip를 이용해 package를 설치할 것이다.

```
pip install pydantic==1.10.24
```

시간이 흘러 다른 사람이 같은 시스템에서 개발을 하게 됐다. 이번에는 pydantic v2가 필요했고, [user 옵션](https://pip.pypa.io/en/stable/cli/pip_install/#cmdoption-user)을 주고 설치했다.

```
pip install --user pydantic==2.12.3
```

이렇게 했더니 pydantic v1을 쓰던 기존 시스템이 제대로 동작하지 않았다. 왜 이런 일이 생긴 걸까?

## System site vs User site

python의 site module을 사용하면 site-packages 경로를 찾을 수 있다.

```
python -m site
```

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211556803.png)

여기에서 `C:\\Users\\Lee\\AppData\\Roaming\\Python\\Python313\\site-packages`는 user site이고, `C:\\Users\\Lee\\AppData\\Local\\Programs\\Python\\Python313\\Lib\\site-packages`는 system site이다.

해당 경로에 가보면 pydantic이 설치된 걸 볼 수 있다.

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211559485.png)

user site에는 pydantic v2가 설치되어 있으며,

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211600232.png)

system site에는 pydantic v1이 설치되어 있다.

즉, pydantic v1, v2 둘 다 설치는 됐는데 v2로 override 된 상황인 것이다.

이 문제는 python에서 module을 찾는 방식 때문에 발생한 것이다. python은 module을 찾을 때 sys.path에 있는 경로를 탐색한다[^sys-path]. 이때 user site를 system site보다 먼저 탐색하는데, user site에서 pydantic을 찾았으니 더 이상 탐색하지 않는다. 따라서 system site에 있는 pydantic v1은 찾을 수 없는 것이다.

## Solutions

여기에선 예상치 못하게 user site에 package가 설치돼 발생하는 의존성 충돌을 방지하는 방법을 탐색한다.

### Virtual environments

이런 문제를 해결하는 가장 좋은 방법은 가상환경(venv)를 사용하는 것이다. venv를 사용하면 sys.path에 system site와 user site 둘 다 포함되지 않고 venv site만 있기 때문에 의존성 충돌을 피할 수 있다.

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211600914.png)

<sup>venv가 활성화(activate)된 상태</sup>

참고) venv를 활성화하지 않고 venv의 python을 직접 실행해도 된다.
![](/static/images/dependency-conflict-with-user-site/IMG-20251029211601530.png)

### -s option

python을 실행할 때 [-s option](https://docs.python.org/3.14/using/cmdline.html#cmdoption-s)을 주고 실행하면 user site를 제외할 수 있다.

```
python -s -m site
```

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211602181.png)

-s option을 주면 sys.path에 user site가 없다.

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211602793.png)

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211603412.png)

-s option을 주고 코드를 실행하면 처음에 설치했던 pydantic v1이 import된 걸 확인할 수 있다.

### Set ENABLE_USER_SITE to false

⚠ 주의) python v3.11부터 이 방법을 사용하려면 [환경변수를 수정해야 함](#unfrozen-module)

만약 user site에 무언가가 설치되는 상황을 막아야 한다면[^block-user-site] site.py에 있는 ENABLE_USER_SITE 값을 False로 설정할 수 있다.

```shell
# site.py 경로 출력
python -c "import site; print(site.__file__)"
```

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211604017.png)

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211604647.png)

<sup>site.py</sup>

ENABLE_USER_SITE를 False로 바꾸면 sys.path에서 user site가 제외된다.

#### Unfrozen module

python v3.11부터 site는 frozen module이기 때문에 site.py를 수정해도 런타임에 반영되지 않는다.

```shell
# check site is frozen
python -c "import sys; print(sys.modules['site'])"
```

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211605252.png)

해동하려면 cli option `-X frozen_modules=off`를 주고 python을 실행해야 한다[^cli-x-option].

```shell
python -X frozen_modules=off -c "import sys; print(sys.modules['site'])"
```

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211605864.png)

### Using sitecustomize

user site가 설정된 후 sitecustomize.py가 있으면 이것도 실행된다[^sitecustomize]. 따라서 sitecustomize.py에서 user site를 조작할 수도 있다.

⚠ 주의) sitecustomize.py가 여러 개 있으면 가장 먼저 발견된 것만 실행한다[^multi-sitecustomize].

sitecustomize.py는 site-package 경로 중 한 곳에 있으면 된다.
예) `%localappdata%\Programs\Python\Python{python version}\Lib\site-packages\`

```shell
# system site-packages 경로 출력
python -c "import site; print(site.getsitepackages())"
```

sitecustomize.py에는 sys.path에서 user site의 우선순위를 낮추는 코드를 작성한다.

참고) [user site를 제거하지 않는 이유](#why-not-remove-user-site)

```py
import site
import sys

def lower_usersite_priority():
    usersite = site.getusersitepackages()
    usersite_index = sys.path.index(usersite)
    sys.path.append(sys.path.pop(usersite_index))

try:
    lower_usersite_priority()
except Exception:
    pass

```

<sup>sitecustomize.py</sup>

이렇게 하면 user site의 우선순위가 뒤로 밀리는 걸 볼 수 있다.

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211606537.png)

<sup>sitecustomize.py 적용 전</sup>

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211607158.png)

<sup>sitecustomize.py 적용 후</sup>

#### Why Not Remove User Site

sitecustomize.py에서 user site를 제거할 수도 있다.

```py
try:
    usersite = site.getusersitepackages()
    sys.path.remove(usersite)
except Exception:
    pass
```

그러나 site module을 직접 실행하면, site.py의 addusersitepackages에서 user site를 sys.path에 다시 추가한다.

```py
def addusersitepackages(known_paths):
    ...
    user_site = getusersitepackages()

    if ENABLE_USER_SITE and os.path.isdir(user_site):
        addsitedir(user_site, known_paths)
    return known_paths
```

<sup>site.py 일부분</sup>

![](/static/images/dependency-conflict-with-user-site/IMG-20251029211607858.png)

<sup>런타임과 site 직접 실행 차이</sup>

따라서 이런 혼동을 피하기 위해 sys.path에서 user site는 제거하지 않는 게 좋다.

[^sys-path]: https://docs.python.org/3/library/sys.html#sys.path
[^cli-x-option]: https://docs.python.org/3.11/using/cmdline.html#cmdoption-X
[^block-user-site]: 예를 들어 python을 포함한 app을 배포했을 때가 있다. 이 경우 user site를 막지 않으면 의도하지 않은 module을 app이 참조할 수 있기 때문이다.
[^sitecustomize]: https://docs.python.org/3.13/library/site.html#module-sitecustomize
[^multi-sitecustomize]: https://stackoverflow.com/a/14415391
