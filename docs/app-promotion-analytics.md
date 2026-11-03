# 앱 유도 분석

## 전송 환경

신규 이벤트는 NODE_ENV=production이며 courtskorea.com 또는 www.courtskorea.com인 웹에서만 전송한다. 로컬, 개발, 미리보기 도메인, 앱 WebView와 app=1에서는 제외한다. 기존 웹 PostHog 초기화·페이지뷰·클릭 전송과 GTM 스크립트도 개발 환경에서 제외했다. 개발에서 팝업을 매번 표시하는 동작은 유지한다.

PostHog는 기존 NEXT_PUBLIC_POSTHOG_KEY/HOST 프로젝트를 사용한다. GA4는 G-P5WNNV82W4로 명시적으로 보낸다. Google tag는 기존 로더를 재사용하거나 필요한 경우 로드하며 send_page_view=false로 중복 페이지뷰를 만들지 않는다. 기존 GTM에서 같은 app_* 이벤트를 별도 GA 이벤트로 재전송하는 태그를 추가하지 않는다.

## 이벤트

| 이벤트 | source | 의미 |
| --- | --- | --- |
| app_promo_viewed | detail_card / header_download / launch_popup | 표면이 50% 이상 실제 화면에 보였을 때. 같은 컴포넌트·경로에서 한 번 |
| app_promo_clicked | detail_card | 전체 상세 배너 클릭. action=app_open_attempt(Android) 또는 store_open(기타) |
| app_promo_clicked | header_download | 헤더 클릭. action=store_open 또는 qr_toggle |
| app_promo_clicked | launch_popup | 모바일 다운로드 클릭. action=store_open |
| app_promo_dismissed | launch_popup | reason=close / escape / backdrop / web_continue / download |
| app_qr_viewed | launch_popup / header_qr | 실제 QR 화면 노출. 팝업 슬라이드 완료 및 동작 줄이기 설정도 처리 |
| app_qr_opened | launch_popup / header_qr / unknown | QR 추적 링크를 실제 브라우저로 연 것. QR 촬영·설치 완료를 뜻하지 않음 |

공통 속성: source, promo_source(동일 출처, GA4 맞춤 보고서용), campaign=app_launch, page_path, facility_path(상세페이지에서만), analytics_environment=production, device_type, os. QR 접속에는 origin_path(원래 표시한 경로)를 추가한다. URL query 전체·사용자 이름·이메일·기기 간 식별 토큰은 전달하지 않는다.

## QR 흐름

QR은 현재 웹 origin의 /app-download?source=launch_popup|header_qr&path=검증된경로를 담는다. 이 페이지는 noindex이며 출시 팝업을 표시하지 않는다. app_qr_opened를 두 분석 도구에 전송한 후 Play로 이동한다. GA acknowledgement 또는 최대 1.2초 타임아웃 후 이동하며, 차단·실패 시에도 다운로드를 막지 않는다. JS가 동작하지 않으면 페이지의 수동 다운로드 링크를 사용할 수 있다.

목적지는 고정된 앱의 Google Play URL로 제한한다. 출처는 서버에서 허용 목록으로 정규화하고 경로는 기존 getAppDestination으로 검증한다. 스토어 Install Referrer에는 utm_source=courtskorea_web, utm_medium=qr, utm_campaign=app_launch, utm_content=출처를 전달한다. 기존 상세 배너의 court_path 시설 복원 referrer는 그대로 유지한다.

QR 접속은 다른 기기에서 발생하므로 PC 사용자와 휴대폰 사용자를 같은 사람으로 연결하지 않는다. 출처별 집계로 분석한다. 링크 공유·자동 미리보기·광고 차단·동의 설정 등으로 실제 스캔과 집계가 다를 수 있다. 정확한 앱 실행 성공·설치 완료는 별도 앱 이벤트 없이는 확정하지 않는다.

## 분석 설정

PostHog Events에서 이벤트를 확인한 후 source로 분리한 Trends를 만들고 total events와 unique users를 구분한다. 상세 배너는 viewed→clicked 퍼널을, 팝업은 viewed→dismissed(reason별) 또는 clicked를 사용한다. QR은 viewed와 opened를 출처별로 비교하되 기기 간 사용자 퍼널로 해석하지 않는다.

GA4 관리 > 데이터 표시 > 맞춤 정의에서 promo_source, action, reason, origin_path, facility_path, device_type, os, analytics_environment를 이벤트 범위 맞춤 측정기준으로 등록하면 탐색에서 속성별 분석할 수 있다. 기본 이벤트 수 수집에는 맞춤 정의 등록이 필요하지 않다. 2026-11-03 GA4 속성 519423760(웹 측정 ID G-P5WNNV82W4)에 이벤트 범위 맞춤 측정기준 `앱 유도 출처` → `promo_source`를 등록하고 목록에서 저장을 확인했다. 나머지 매개변수의 맞춤 정의와 대시보드는 아직 추가하지 않았다.

## 검증

- node scripts/test-app-promotion-analytics.cjs: 개발·미리보기·WebView 제외, PostHog/GA4 이중 전달, 고정 측정 ID, 로더 중복 방지, 전송 타임아웃, QR source/경로/스토어 referrer 검증.
- 변경 컴포넌트 lint, TypeScript, 웹 production build.
- 프로덕션 배포 후 실제 PostHog/GA4 수신 확인 필요. 개발 환경에서는 이벤트가 보이지 않는 것이 정상이다.
