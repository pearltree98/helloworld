# 성경 역사 문제풀이 — 안드로이드 앱 (TWA)

`../bible-quiz` 웹앱(https://bible-history-quiz.vercel.app)을 감싸는 Trusted Web Activity 프로젝트.
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)으로 생성했다.

- 패키지 이름: `app.vercel.biblehistoryquiz`
- 앱 내용은 웹에서 불러온다. **문항을 추가해도 APK를 다시 만들 필요가 없다** (웹만 다시 배포).
- APK를 다시 만들어야 하는 경우는 앱 이름·아이콘·주소·버전을 바꿀 때뿐이다.

## 빌드 흐름

1. `bible-quiz-android/` 아래 파일을 바꿔 push하면 GitHub Actions(`.github/workflows/bible-quiz-apk.yml`)가
   서명 안 된 APK를 만들어 `dist/app-release-unsigned.apk`로 커밋한다.
2. 서명 키(`android.keystore`)로 서명한다. 키는 **저장소에 넣지 않는다** (`.gitignore`).

   ```bash
   apksigner sign --ks android.keystore --ks-key-alias android \
     --out bible-quiz.apk dist/app-release-unsigned.apk
   ```

3. 새 버전을 낼 때는 `app/build.gradle`의 `versionCode`(1씩 증가)와 `versionName`을 올린다.

## 서명 키와 전체 화면

- 사이트의 `bible-quiz/.well-known/assetlinks.json`에 서명 키의 SHA-256 지문이 들어 있다.
  지문이 맞아야 앱이 주소창 없이 전체 화면으로 열린다.
- **같은 키로 서명해야 기존 앱 위에 업데이트할 수 있다.** 키를 잃어버리면 앱을 지우고 새 키로 다시 설치해야 하고,
  `assetlinks.json`의 지문도 바꿔야 한다.
- 풀이 기록은 앱이 아니라 Chrome의 사이트 저장소에 있다. 앱을 지울 때 Chrome이 사이트 데이터를 지울지 물으면
  '유지'를 고르면 다시 설치해도 기록이 남는다.
