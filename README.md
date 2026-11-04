# 미리봄 (Miribom)

> 아무 일도 일어나지 않은 것이 가장 큰 승리입니다.

일상의 잠재적 위험(아찔했던 순간, 영상으로 본 사고, 부모님 댁 욕실)을 **원천 → 노출 상태 → 피하는 행동**의 구조로 기록하고,
그 교훈을 식당 벽의 식권처럼 **티켓**으로 다음 사람에게 건네는 커뮤니티 앱입니다.

왜 이렇게 만들었는지(경제학·사회학·마케팅 원리)는 [docs/CONCEPT.md](docs/CONCEPT.md), API 는 [docs/API.md](docs/API.md) 를 보세요.

## 실행

```bash
npm install
npm start          # http://localhost:3000  (첫 실행 시 사례 12건이 자동으로 들어갑니다)
npm run dev        # 파일 변경 시 자동 재시작
npm test           # API 통합 테스트 (메모리 DB)
```

Node 22.13 이상이 필요합니다. 데이터베이스는 내장 `node:sqlite` 를 쓰므로 네이티브 빌드가 없습니다.
환경 변수: `PORT` (기본 3000), `DB_PATH` (기본 `data/miribom.db`).

## 구조

```
server/
  index.js          진입점 (DB 열기 → 시드 → 서버)
  app.js            Express 앱 조립, 방문자 식별 미들웨어, 오류 처리
  db.js             스키마 + Repo (모든 SQL 은 여기에만)
  seed.js           초기 사례
  domain/
    risk.js         위험도 = 심각도 × 가능성 (5×5 매트릭스), 용어 정의
    catalog.js      분류·결과 유형
    validate.js     입력 검증
  routes/
    cases.js        사례 목록/상세/작성, 교훈 받기, 티켓 붙이기
    tickets.js      티켓 벽, 티켓 받기
    stats.js        집계
web/
  index.html        단일 페이지 (해시 라우터)
  css/app.css       디자인 토큰, 라이트/다크
  js/
    main.js         라우터, 별명
    api.js          fetch 래퍼 (방문자 헤더 자동 첨부)
    identity.js     브라우저 로컬 방문자 id
    ui.js           DOM 도우미
    views/          feed · caseDetail · newCase · wall · about
test/
  api.test.js       node:test 로 전체 흐름 검증
```

## 핵심 규칙 (서버가 강제)

- 교훈 받기: 한 사람이 한 사례에 한 번.
- 티켓: 붙인 사람은 자동으로 교훈을 받은 것으로 기록. 한 장은 **한 사람만** 가져갈 수 있고, 내가 붙인 티켓은 내가 못 가져가며, 같은 사례의 티켓은 한 장만 가져갈 수 있다. 가져가면 교훈도 함께 기록된다.
- 안전 기금 약정은 **약정**일 뿐 결제가 아니다 (v1).

## v1 의 한계와 로드맵

- 방문자 식별은 브라우저 로컬 id (로그인 없음). → 계정·소셜 로그인.
- 신고·검수 기능 없음. → 신고, 관리자 숨김, 중복 병합.
- 기금은 약정만 기록. → 결제 연동, 기금 집행 내역 공개 페이지.
- 지도 없음. → 장소 유형별/지역별 보기, 지도 기반 "이 근처의 교훈".
- 주간 다이제스트, 이미지·영상 첨부, 다국어.
