# 라이더 아찔 기록 7일 실험 도구

대상: 배달 라이더. 코드 0줄. 목적은 "직접 부탁하지 않아도 사람들이 세 줄 형식으로 써서 올리는가"를 확인하는 것.
판정 기준은 `docs/EVALUATION.md` 에 있다. 아래 파일을 순서대로 쓴다.

1. `form.md` — 네이버폼(또는 구글폼)에 그대로 옮길 질문 3개와 안내문
2. `owner-message.md` — 방장·운영자에게 보내는 허락 요청
3. `post-day1.md`, `post-day4.md` — 1일째, 4일째 공지문
4. `repost.md` — 들어온 제보를 카드로 만들어 다시 올릴 때 붙이는 문구
5. `tally.md` — 매일 적는 집계표

카드는 `node tools/cards/render.mjs tools/cards/riders.json` 으로 뽑는다. 제보가 들어오면 `riders.json` 의 초안을 실제 제보로 바꾼다.
