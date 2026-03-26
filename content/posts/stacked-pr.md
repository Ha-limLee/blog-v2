---
title: Stacked PR
date: '2025-03-09'
tags: ['git', 'github']
draft: false
summary: 큰 PR을 작은 PR로 나누는 기술
images: []
layout: PostSimple
authors: ['default']
---



# 큰 PR의 문제점

`develop <- feat-test`

![big diff](/static/images/stacked-pr/big-diff.png)

- reviewer 입장에서

  - PR review에 대한 부담감 증가

    - PR review는 blocking task

      PR review를 하는 동안 reviewer는 다른 일을 할 수 없다. 중간에 다른 일을 하고 와서 다시 PR을 보면 흐름이 끊기기 때문이다.

      따라서 PR이 큰 경우 reviewer는 그 PR을 보기 위해서 많은 시간을 내야하고 이는 reviewer에게 부담을 준다.

  - review 퀄리티 저하

    사람의 집중력엔 한계가 있기 때문에 모든 line을 밀도 있게 검토할 수 없다. 따라서 놓친 부분이 생기기 쉽다.

따라서 큰 PR 하나보단 작은 PR 여러 개가 낫다.

# 해결: Stacked PR

Stacked PR(또는 Stacked Diffs, Stacked Changes, Stacked Branches)은 큰 PR 대신 작은 PR 여러 개를 작성하는 방법이다.

- PR 1: layout 구현

  `develop <- feat-test-layout`

  ![small diff](/static/images/stacked-pr/small-diff.png)

- PR 2: service 구현

  `feat-test-layout <- feat-test-service`

  ![small diff](/static/images/stacked-pr/small-diff.png)

  - base branch가 PR 1의 head branch다.

이런 식으로 다음 PR의 base branch가 이전 PR의 head branch가 되도록 하면, reviewer가 작은 line changes만 확인하도록 할 수 있다.

# 가장 오래된 Branch부터 병합

- 가장 오래된 branch부터 병합하면 다음 PR의 changes가 변하지 않는다.
- 가장 오래된 branch부터 병합하지 않으면 changes가 크게 잡힌다.

  layout 구현: `develop <- feat-test-layout`

  service 구현: `feat-test-layout <- feat-test-service`

  이 두 PR 중 service 구현 PR부터 병합하면 layout 구현 PR의 changes는 두 PR의 합이 된다.

  - PR: layout 구현

    | 병합 전                                                 | 병합 후                                             |
    | ------------------------------------------------------- | --------------------------------------------------- |
    | ![small diff](/static/images/stacked-pr/small-diff.png) | ![big diff](/static/images/stacked-pr/big-diff.png) |

  이러면 Stacked PR을 쓰는 이유가 없다.

- 이전 PR을 병합하고 branch를 지우면, 다음 PR의 base branch는 이전 PR의 base branch가 된다.

  layout 구현: `develop <- feat-test-layout`

  service 구현: `feat-test-layout <- feat-test-service`

  layout 구현 PR을 병합하면 service 구현 PR의 base branch는 `feat-test-layout`에서 `develop`으로 바뀐다.

  - service 구현 PR

    | 병합 전                                 | 병합 후                        |
    | --------------------------------------- | ------------------------------ |
    | `feat-test-layout <- feat-test-service` | `develop <- feat-test-service` |

  - 참고
    - https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches#working-with-branches

# 리뷰 반영

다음과 같은 상황을 가정하자.

- PR이 세 개 있다.
  - PR 1: layout 구현 `develop <- feat-test-layout`
  - PR 2: service 구현 `feat-test-layout <- feat-test-service`
  - PR 3: refactoring `feat-test-service <- feat-test-refactoring`
- reviewer가 PR 1에 review를 남겼고 author는 그 review를 반영했다.

  ![update-refs-before](/static/images/stacked-pr/update-refs-before.svg)

- 수정 사항은 PR 2, PR 3에도 반영되어야 한다.

어떻게 하면 효율적으로 수정 사항을 나머지 브랜치에 반영할 수 있을까?

## Update Refs

이런 경우 Update refs를 사용하면 된다.

1. 가장 최근 branch로 checkout 한다.

   ```bash
   git checkout feat-test-refactoring
   ```

2. review를 반영한 branch를 여기에 rebase 한다. 이때 `--update-refs` 옵션을 준다.

   ```bash
   git rebase --update-refs feat-test-layout
   ```

   rebase를 성공하면 다음과 같이 영향을 받는 branch 목록을 볼 수 있다.

   ```bash
   Successfully rebased and updated refs/heads/feat-test-refactoring.
   Updated the following refs with --update-refs:
        refs/heads/feat-test-service
   ```

   이때 git graph는 다음과 같다.

   ![update-refs-after](/static/images/stacked-pr/update-refs-after.svg)

3. 현재 branch와 영향을 받은 branch들을 remote repo에 push한다.

   ```bash
   # rebase는 commit history를 바꾸기 때문에 --force 또는 --force-with-lease 옵션을 줘야 push 할 수 있다.
   git push --force-with-lease origin feat-test-refactoring feat-test-service
   ```

- 참고
  - https://andrewlock.net/working-with-stacked-branches-in-git-is-easier-with-update-refs/
  - https://stackoverflow.com/questions/73988155/automatically-push-after-git-rebase-update-refs

# 리뷰 반영 확인

## Pull Rebase

PR author가 force push한 branch 중 reviewer가 local에서 확인하던 branch가 있으면 이런 문구를 볼 수 있다.

```bash
$ git checkout feat-test-service
Switched to branch 'feat-test-service'
Your branch and 'origin/feat-test-service' have diverged,
and have 2 and 1 different commits each, respectively.
  (use "git pull" if you want to integrate the remote branch with yours)
```

author가 rebase를 해서 commit hash가 바뀌었기 때문이다.

- remote

  ![diverged-remote](/static/images/stacked-pr/diverged-remote.svg)

- local

  ![diverged-local](/static/images/stacked-pr/diverged-local.svg)

- 참고
  - https://stackoverflow.com/questions/19016698/git-branch-diverged-after-rebase

이런 경우 `pull --rebase`를 쓰면 된다. 추가 commit을 생성하지 않고 remote branch 상태를 local에 반영할 수 있기 때문이다.

# 주의사항

- 다른 사람과 같은 branch에서 작업을 한다면 가급적 rebase를 하지 말자.

  앞서 살펴 보았듯이 rebase를 하면 commit history가 바뀌기 때문에 충돌이 쉽게 발생할 수 있다.
