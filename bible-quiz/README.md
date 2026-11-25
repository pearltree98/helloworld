# 성경 역사 문제풀이 (PWA)

한국사능력검정시험 기출 앱처럼 **자료(지문) → 인물·사건·장소 특정 → 옳은 선지 고르기** 순서로 푸는 성경 5지선다 문제집.
빌드 과정이 없는 정적 사이트(HTML/CSS/JS)라서 Vercel에 그대로 올리고, PWABuilder로 APK를 만들 수 있다.

## 폴더 구조

```
bible-quiz/
├─ index.html              앱 껍데기
├─ css/app.css             다크 테마, 모바일 우선
├─ js/
│  ├─ app.js               화면(홈·문제·결과·오답노트)과 라우팅
│  ├─ data.js              data/ 폴더 읽기
│  ├─ schema.js            문항 형식 검사 (앱과 검사 스크립트가 함께 씀)
│  └─ store.js             풀이 기록 (localStorage)
├─ data/
│  ├─ eras.json            시대 목록 (홈 카드 순서)
│  └─ divided.json         분열왕국 문항
├─ sw.js                   서비스 워커 (오프라인)
├─ manifest.webmanifest    PWA 정보
├─ icons/, screenshots/    아이콘·스토어용 스크린샷
├─ scripts/validate.mjs    문항 검사 스크립트
└─ vercel.json             캐시 헤더
```

## 문항 추가하기 (앱 코드 수정 없음)

시대마다 `data/<시대 id>.json` 파일 하나다. 문항은 그 파일의 배열에 추가하고, 새 시대는 파일을 새로 만든다.

| 시대 | 파일 |
|---|---|
| 족장 | `data/patriarchs.json` |
| 출애굽·광야 | `data/exodus.json` |
| 정복·사사 | `data/conquest.json` |
| 통일왕국 | `data/united.json` |
| 분열왕국 | `data/divided.json` |
| 포로·귀환 | `data/exile.json` |
| 복음서 | `data/gospels.json` |
| 사도행전·초대교회 | `data/acts.json` |

파일이 없는 시대는 홈에서 '준비 중'으로 표시된다. 시대 이름·순서·기간은 `data/eras.json`에서 바꾼다.
한 시대를 여러 파일로 나누려면 `eras.json`의 그 시대에 `"files": ["divided.json", "divided-2.json"]`을 적는다.

### 문항 형식

```json
{
  "id": "divided-001",
  "era": "분열왕국",
  "type": "인물 특정형",
  "prompt": "다음 자료의 인물에 대한 설명으로 옳은 것은?",
  "passage": "지문. 줄바꿈은 \n, 밑줄은 __이렇게__",
  "options": [
    { "text": "선지 문장", "keyword": "르호보암 · 세겜 회의", "explain": "왜 맞고 왜 틀린지, 어느 시대 일인지" },
    "… 모두 5개"
  ],
  "answer": 1,
  "explanation": "문항 전체 해설 (채점 후 빨간 글씨로 표시)",
  "refs": ["왕상 11:29-31", "왕상 12:28-29"]
}
```

- **`answer`는 0부터 센다.** `0` = ①, `1` = ②, … `4` = ⑤.
- `id`는 전체에서 겹치면 안 된다 (`<시대 id>-001` 형식 권장).
- `type`이 같은 문항끼리 홈의 '유형별' 탭에 묶인다. 새 유형 이름을 쓰면 카드가 자동으로 생긴다.
- `passage`는 생략할 수 있다. `keyword`·`explain`·`explanation`이 비어 있으면 표시는 되지만 경고가 뜬다.
- 형식이 틀린 문항은 앱에 나오지 않고, 홈 아래에 '형식 오류로 빠진 문항 N개'가 표시된다.

### 올리기 전에 검사

```bash
node scripts/validate.mjs            # 시대별 문항 수·정답 분포·오류
node scripts/validate.mjs --answers  # 문항마다 정답 선지까지 출력 (0/1 기준 실수 확인용)
```

정답 분포(①~⑤)가 한쪽에 몰리지 않게 맞추는 것이 좋다.

## 로컬에서 보기

```bash
cd bible-quiz
python3 -m http.server 4173    # http://localhost:4173
```

`file://`로 직접 열면 데이터 파일을 읽지 못한다. 꼭 서버로 연다.

## 배포 (Vercel)

- Vercel 프로젝트 `bible-history-quiz` (Root Directory `bible-quiz`, Framework `Other`, Build Command 없음)
- 주소: https://bible-history-quiz.vercel.app

지금은 Vercel의 GitHub 연동이 이 저장소에 설치되어 있지 않아서 **push만으로는 자동 배포되지 않는다.**
Vercel 대시보드에서 다시 배포하거나, GitHub의 Vercel 앱 설정(Repository access)에 이 저장소를 추가하고
프로젝트의 Git 연결과 Production Branch를 지정하면 push할 때마다 자동 배포된다.

서비스 워커가 네트워크를 먼저 확인하므로, 다시 배포한 새 문항은 온라인일 때 바로 보인다.
앱 파일 목록(`sw.js`의 `SHELL`)을 바꿀 때만 `sw.js`의 `VERSION`을 올린다.

## 안드로이드 앱 (APK)

- 배포 주소: https://bible-history-quiz.vercel.app (Vercel 프로젝트 `bible-history-quiz`)
- 안드로이드 프로젝트는 `../bible-quiz-android/`에 있다 (Bubblewrap으로 만든 TWA). 빌드 방법은 그 폴더의 README 참고.
- `.well-known/assetlinks.json`에 서명 키 지문이 들어 있어서, 앱이 주소창 없이 전체 화면으로 열린다.
  서명 키를 바꾸면 이 파일의 지문도 바꿔야 한다.
- 앱은 웹 내용을 불러오므로, 문항을 추가할 때는 웹만 다시 배포하면 된다.

## 풀이 기록

- 브라우저 `localStorage`의 `bible-quiz.v1` 키 하나에 저장된다. 기기 사이에 동기화되지 않는다.
- 시대별·유형별·오답 다시 풀기의 기록은 서로 따로 관리된다 (한능검 앱의 '회차별/시대별'처럼).
- 틀린 문항은 오답노트에 모이고, '오답 다시 풀기'에서 맞히면 빠진다. 시대·유형 초기화를 해도 오답노트는 남는다.
