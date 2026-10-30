# Courts Korea Google Play 데이터 보안 작성안

기준일: 2026-10-21

이 문서는 현재 Android 앱 코드, Supabase 저장 구조, Expo 푸시 알림 및 Firebase Analytics 설정을 기준으로 Play Console의 `정책 및 프로그램 > 앱 콘텐츠 > 데이터 보안`에 입력할 내용을 정리한다. 출시 직전에 실제 운영 SDK와 Google Analytics/Firebase Console 설정을 다시 확인한다.

## 공개 URL

- 개인정보처리방침: `https://courtskorea.com/privacy`
- 계정 및 데이터 삭제: `https://courtskorea.com/account-deletion`

두 URL은 로그인 없이 열려야 하며, 앱의 `마이페이지 > 약관 > 개인정보처리방침`에서도 개인정보처리방침에 접근할 수 있어야 한다.

## 데이터 수집 및 보안 질문

| Play Console 질문 | 입력안 | 확인 근거 |
| --- | --- | --- |
| 앱에서 필수 사용자 데이터 유형을 수집하거나 공유하는가 | 예 | 로그인, 프로필, 알림, Firebase Analytics 및 앱 제어 웹뷰에서 데이터를 서버로 전송함 |
| 전송 중인 모든 사용자 데이터를 암호화하는가 | 예 | 앱 통신은 HTTPS/TLS를 사용함. 출시 전에 HTTP 주소와 개발 서버 주소가 남아 있지 않은지 재검사 |
| 사용자가 데이터 삭제를 요청할 수 있는가 | 예 | 앱 프로필 정보 화면의 회원탈퇴 및 공개 삭제 안내 URL 제공 |

## 선언할 데이터 유형

### 위치

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 대략적인 위치 | 예 | 아니요 | 선택사항 | 앱 기능, 맞춤설정, 분석 | 이용자가 고른 내 지역, Firebase가 마스킹된 IP 주소에서 파생하는 대략적 지역, 현재 위치 버튼 사용 시 Android의 대략적 위치 권한으로 확인한 위치 |
| 정확한 위치 | 예 | 아니요 | 선택사항 | 앱 기능 | 이용자가 지도에서 현재 위치 버튼을 누르고 정확한 위치 권한을 허용한 경우에만 현재 위치로 지도를 이동하는 데 사용. 백그라운드에서 확인하지 않고 Courts Korea 서버·Supabase에 저장하지 않음. 카카오맵 표시 과정의 일시적 처리를 포함해 선언 |

### 개인정보

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 이름 | 예 | 아니요 | 필수 | 앱 기능, 계정 관리 | 카카오 닉네임 또는 사용자가 변경한 닉네임 |
| 이메일 주소 | 예 | 아니요 | 필수 | 앱 기능, 계정 관리 | 카카오 로그인 계정 이메일 |
| 사용자 ID | 예 | 아니요 | 필수 | 앱 기능, 계정 관리, 분석 | 카카오/Supabase 회원 식별값. Firebase에는 이메일 대신 내부 UUID를 User-ID로 전송 |

### 메시지

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 기타 인앱 메시지 | 예 | 아니요 | 선택사항 | 앱 기능 | 이용자가 작성한 고객문의 제목·내용과 관리자 답변 |

### 사진 및 동영상

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 사진 | 예 | 아니요 | 선택사항 | 앱 기능, 계정 관리 | 카카오 프로필 이미지 URL 및 프로필 표시 |

### 앱 활동

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 앱 상호작용 | 예 | 아니요 | 필수 | 분석 | 앱 실행, 세션, 화면 조회, 버튼 선택, 정렬·필터 이용, 검색 결과 수. 검색어 원문은 Firebase에 보내지 않음 |
| 앱 내 검색 기록 | 예 | 아니요 | 선택사항 | 앱 기능 | 검색 결과 조회를 위해 검색어가 Supabase로 전송됨. 별도 검색 기록 테이블에는 저장하지 않으며 Firebase에는 길이와 결과 수만 전송 |
| 기타 작업 | 예 | 아니요 | 선택사항 | 앱 기능, 맞춤설정 | 찜, 최근 본 테니스장, 예약 오픈 알림 신청 및 설정 |

### 기기 또는 기타 ID

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 기기 또는 기타 ID | 예 | 아니요 | 일부 필수 | 앱 기능, 분석 | Firebase 앱 인스턴스 ID, Expo 푸시 토큰, 앱 버전, 내부 회원 UUID. Android 광고 ID와 SSAID 수집은 앱 설정에서 비활성화 |

### 앱 정보 및 성능

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 진단 | 예 | 아니요 | 선택사항 | 앱 기능 | 고객문의 접수 시 문제 확인을 위해 함께 저장되는 앱 버전, 운영체제 및 기기 모델 |

## 현재 선언하지 않는 항목

- 연락처, 이메일·SMS·MMS 메시지, 오디오 파일, 캘린더 정보
- 금융 정보, 건강 및 피트니스 정보
- 설치된 앱 목록
- 웹 탐색 기록
- 비정상 종료 로그 및 기타 앱 성능 데이터: 현재 Firebase Crashlytics와 Performance Monitoring을 설치하지 않았으므로 선택하지 않는다. 향후 설치하면 방침과 데이터 보안 양쪽을 함께 갱신한다.

## `공유`를 아니요로 입력하기 위한 운영 조건

Google Play의 서비스 제공업체 예외를 전제로 Supabase, Google Firebase Analytics, Expo, Vercel을 `공유`가 아닌 위탁 처리로 작성한다. 다음 조건을 출시 전에 모두 확인한다.

- Google Analytics의 Google Signals를 사용하지 않는다.
- Google Ads 계정 연결, 잠재고객 내보내기 및 광고 개인화 기능을 사용하지 않는다.
- Firebase/Google Analytics의 Google 제품 및 서비스 대상 데이터 공유 설정을 검토하고 불필요한 공유를 끈다.
- PostHog는 웹사이트에서만 사용하고 앱 웹뷰에서는 초기화하지 않는다.
- 수집 데이터를 제3자의 독립적인 광고·마케팅 목적으로 제공하지 않는다.

위 조건 중 하나라도 달라지면 해당 데이터 유형의 `공유` 여부와 `광고 또는 마케팅` 목적을 다시 검토한다.

## Firebase Analytics 운영 설정

- `apps/mobile/firebase.json`에서 자동 수집을 기본 비활성화한다.
- Android 광고 ID, SSAID, 광고 저장 및 광고 개인화 신호를 비활성화한다.
- `android.blockedPermissions`와 Android 매니페스트 병합 규칙으로 `AD_ID`, `ACCESS_ADSERVICES_AD_ID`, `ACCESS_ADSERVICES_ATTRIBUTION` 권한을 제거한다.
- 중복 방지를 위해 Firebase 자동 화면 보고를 끄고 앱에서 정의한 화면 이름만 보낸다.
- EAS `development`와 `preview` 프로필은 Analytics 전송을 끈다.
- EAS `production` 프로필만 Analytics 전송을 켜며 모든 이벤트에 `environment=production`을 포함한다.
- 개발 중 DebugView가 꼭 필요할 때만 로컬 환경에 `EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED=true`와 `EXPO_PUBLIC_ANALYTICS_ENV=development`를 명시한다. 이 설정으로 생성한 빌드는 외부 배포하지 않는다.

## 출시 직전 Console 확인

1. Firebase/Google Analytics에서 데이터 보유 기간을 정하고 개인정보처리방침 표현과 일치시킨다.
2. Google Signals, Google Ads 연결, 광고 개인화 및 데이터 공유 설정을 확인한다.
3. Play Console 데이터 보안의 미리보기가 이 문서와 일치하는지 확인한다.
4. 개인정보처리방침과 계정 삭제 URL을 실제 배포 도메인에서 로그인 없이 연다.
5. 내부 테스트가 아닌 비공개·공개 테스트 또는 프로덕션 트랙을 열기 전에 데이터 보안 양식을 제출한다.
6. SDK를 추가하거나 수집 이벤트의 데이터 내용을 바꿀 때 이 문서와 개인정보처리방침을 함께 갱신한다.
7. 현재 위치 기능은 선택사항, 앱 기능 목적, 일시적 처리로 표시하고 대략적 위치와 정확한 위치를 모두 확인한다.

## 참고한 공식 문서

- Google Play 데이터 보안: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play 사용자 데이터 정책: https://support.google.com/googleplay/android-developer/answer/18258653
- Google Play 계정 삭제 요구사항: https://support.google.com/googleplay/android-developer/answer/13327111
- Firebase Analytics 데이터 공개 안내: https://support.google.com/analytics/answer/11582702
- Firebase Analytics 수집 제어: https://firebase.google.com/docs/analytics/android/configure-data-collection

이 문서는 Play Console 입력을 돕는 구현 기준 문서이며 법률 자문을 대신하지 않는다. 실제 사업자 정보, 국외 이전, 보유 기간 및 관계 법령상 의무는 출시 전에 별도 검토한다.
