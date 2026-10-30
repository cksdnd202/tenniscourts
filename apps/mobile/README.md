# Courts Korea Android 앱 개발

## 휴대폰에서 바로 미리보기

개발용 APK는 최초 한 번만 설치합니다. 설치 후에는 저장할 때마다 새 APK를 만들지 않고 Metro를 통해 변경된 JavaScript와 UI를 바로 확인할 수 있습니다.

프로젝트 최상위 폴더에서 아래 명령을 실행합니다.

```bash
npm run dev:mobile
```

이 명령은 다음 작업을 함께 처리합니다.

- Next.js 웹 개발 서버를 같은 Wi-Fi에서 접근 가능하도록 실행
- 컴퓨터의 LAN 주소를 자동으로 탐지
- 앱의 `EXPO_PUBLIC_WEB_URL`을 로컬 웹 서버 주소로 설정
- Expo 개발 서버 실행

휴대폰과 컴퓨터는 같은 Wi-Fi에 연결되어 있어야 합니다. 개발용 Courts Korea 앱을 열고 실행 중인 개발 서버를 선택하면 됩니다.

자동으로 잘못된 네트워크 주소를 선택하거나 주소를 찾지 못하면 직접 지정할 수 있습니다.

```bash
COURTS_KOREA_LAN_IP=192.168.0.10 npm run dev:mobile
```

서버는 미리보기할 때만 실행하면 됩니다. 종료는 터미널에서 `Ctrl+C`를 누릅니다.

## APK를 다시 만들어야 하는 경우

React/TypeScript 화면, 문구, 스타일, 일반적인 화면 이동 변경은 다시 빌드할 필요가 없습니다. 다음처럼 Android 네이티브 구성 자체가 바뀐 경우에만 개발용 APK를 다시 만듭니다.

- 네이티브 라이브러리 추가 또는 버전 변경
- Android 권한이나 `app.json` 플러그인 변경
- 앱 아이콘 또는 시작 화면의 네이티브 리소스 변경
- Firebase 설정 변경

개발용 Android APK 생성 명령은 다음과 같습니다.

```bash
cd apps/mobile
npx eas-cli build --profile development --platform android
```

## Firebase Analytics 환경 분리

- `development`, `preview`: 이벤트 전송 안 함
- `production`: 이벤트 전송
- 개발 기기에서 DebugView 확인이 필요한 경우에만 Metro 실행 환경에 아래 값을 임시로 설정

```bash
EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED=true EXPO_PUBLIC_ANALYTICS_ENV=development npm run dev
```

광고 ID와 광고 개인화 수집은 `firebase.json`에서 비활성화되어 있다. Play Console 입력안은 저장소 루트의 `docs/google-play-data-safety.md`를 따른다.
