# 예약 알림 운영 연결

## 구현된 흐름

- 로그인 사용자는 자신의 구독과 기기만 저장한다. 기존 RLS를 유지한다.
- `/api/notifications/test`에 로그인 토큰과 `ruleId`를 보내면 해당 규칙을 구독한 본인의 활성 기기로 테스트 푸시를 보낸다.
- `/api/cron/notification-dispatch`는 예약 시각을 계산하고 1일 전/10분 전 알림을 전송한다.
- 발송 기록의 고유 키와 `pending → processing` 조건부 변경으로 작업자 간 중복 전송을 방지한다.
- 테스트 푸시는 실제 예약 오픈 시각이나 구독을 변경하지 않는다.
- Expo 접수 성공은 기기 수신 보장이 아니다. 15분 후 발송 영수증을 조회하며 미등록 기기는 비활성화한다.
- 응답을 잃어버린 발송은 자동 재전송하지 않는다. `provider_response_unknown:manual_review` 또는 오래 남은 `processing` 행은 운영자가 확인한다.
- 실행 지연은 최대 5분까지 허용한다. 신규 구독 시 이미 지난 알림, 예약 오픈 후 알림은 보내지 않는다.
- 한 번에 최대 10건을 처리하는 초기 테스트 규모다. 이용자 증가 전에는 처리량과 DB 원자적 큐 워커를 확장해야 한다.

## 서버 배포

Vercel 환경변수:

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: 기존 값 유지
- `CRON_SECRET`: 충분히 긴 임의의 서버 비밀값. 앱에 넣지 않는다.
- `NOTIFICATION_DISPATCH_ENABLED=true`: 자동 발송 활성화
- `EXPO_ACCESS_TOKEN`: Expo Push Security를 활성화한 경우 서버에만 설정

기존 `vercel.json`의 서울시 동기화 작업은 유지했다. 무료 Hobby 플랜에 분 단위 cron을 넣으면 배포가 실패하므로 추가하지 않았다.

Vercel Pro이면 `/api/cron/notification-dispatch`를 `* * * * *`로 추가할 수 있다.
Hobby이면 Supabase Cron + pg_net 또는 별도 분 단위 HTTPS 스케줄러를 연결한다. 호출 방법:

```
POST https://courtskorea.com/api/cron/notification-dispatch
Authorization: Bearer <CRON_SECRET>
```

정기 실행은 서버 배포 및 환경변수 확인 후 활성화한다. 개발 컴퓨터나 개발 서버에 의존하지 않는다.
DB 구조 추가는 필요 없다. Supabase Cron 사용 시 확장 기능과 비밀값 설정이 별도로 필요하다.

## 기기 검증

1. 앱 버전 5 설치, 로그인, 알림 연결.
2. 예약 규칙의 `10분 전` 또는 `1일 전` 선택.
3. 화면을 나갔다 돌아와 선택 유지 확인.
4. `이 예약 알림 테스트하기`를 누르고 앱을 백그라운드로 이동.
5. 수신 알림을 누르면 시설명과 선택한 규칙 표시.
6. `예약 사이트로 이동` 확인. 앱 종료 상태에서도 동일하게 확인.
7. 실제 예약 오픈 건의 정기 발송 기록과 Expo receipt까지 확인.

자동 검사: `node scripts/test-notifications.mjs`, 서버와 모바일 TypeScript 검사.

## 현재 적용 상태

- Vercel 운영 서버 배포 완료: `https://courtskorea.com`.
- `CRON_SECRET`과 `NOTIFICATION_DISPATCH_ENABLED` 운영 설정 완료.
- 운영 발송 API 수동 호출 성공: 활성 구독 1건 조회, 해당 시점 발송 대상 0건.
- Android 빌드 5: `https://expo.dev/accounts/brgrer/projects/courts-korea/builds/8860e42e-cfd8-41c4-9ead-e6f5cd2f9d99`.
- 사용자가 Supabase SQL 실행 완료. 2026-10-04 00:35와 00:36 KST에 자동 호출이 연속 도착했고 모두 HTTP 200으로 정상 처리됨.
- 자동 실행 결과: 활성 구독 1건, 발송 대상 0건. 실제 푸시 발송 검증은 아직 남아 있음.
- `supabase/sql/setup-notification-cron.local.sql`로 1분 정기 호출을 등록했다.
- 자동 발송 전체 흐름 테스트 큐 적용 및 운영 배포 완료: `dpl_FUH8UEDoRYeJKie68wrnqSLeduDy`.
- 2026-10-04 12:01:33 KST 예약 테스트를 Cron이 12:02:09에 처리했고 Expo 접수 1건 성공.
- 2026-10-04 실제 Android 기기에서 알림 수신, 알림 클릭 후 앱 진입, 예약 사이트 이동까지 확인 완료.
- 예약 알림의 전체 운영 경로(Supabase Cron → Vercel → Expo → Android)가 검증됨.
  인증값이 포함된 로컬 전용 파일이므로 Git 및 배포에서 제외했다.
- 실제 기기에서 테스트 푸시 수신 및 앱 종료 상태 클릭은 APK 설치 후 확인해야 한다.
