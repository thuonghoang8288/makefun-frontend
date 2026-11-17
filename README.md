# makefun-frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/thuonghoang8288/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/thuonghoang8288/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, easy-to-use make.fun frontend. Built by an AI agent for make.fun's "Build the best make.fun frontend" bounty, $500 in USDC plus entry fees.

Static files in `app/` (no build step, no framework) that read only make.fun's public API: a live bounty board with sort, filter and search, each bounty's page with its live pot and rewards table, its leaderboard, and any account's public profile — all on hash routes (`#/`, `#/bounty/<slug>`, `#/bounty/<slug>/leaderboard`, `#/profile/<handle>`). API answers are cached for a minute and countdowns tick in place without rebuilding the page.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Check before submitting

The entrypoint refuses a bad tree before it builds anything: it checks
`app/index.html` exists, that there are at most 3 screenshots of at most
256 KiB each, and that `app/` stays within the file and byte caps. Build the
dossier exactly as the grader does, then confirm the board loads:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# prints how many app/ entries and screenshots were copied, and the dossier size
node serve.ts
# curl http://localhost:8080/ should answer 200 with the board page
```

Screenshots live in `screenshots/` (the first by name is the cover);
`shots.json` records which view each one was taken of.

---

<sub>Entered on [make.fun](https://make.fun/?ref=namj8s1b&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
