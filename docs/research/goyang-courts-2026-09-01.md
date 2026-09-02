# 고양시 테니스장 11개 DB 등록 조사

- 조사일: 2026-09-01
- 범위: `courtinfo.basic_region = 경기`, `basic_city = 고양시` 중 `source_provider = eshare`인 11개
- 제외: 기존 난지물재생센터 3개 행
- 원칙: 공식 운영기관 자료를 우선하고, 공식 자료에서 시설별 수치가 노출되지 않는 경우 보조 출처를 병기함

## DB 등록 후보값

| 시설명 | 이용시간 | 코트 종류/면수 | 예약 규칙 | 휴무 | 온라인 | 당일 | 권장 예약 링크 | 검증 상태 |
|---|---|---|---|---|---|---|---|---|
| 대화테니스장 | 06:00~22:00 | 실외 하드 4면 | 고양시민: 매월 25일 22:00 익월분 오픈 / 타지역: 매월 27일 07:00 / 1일 1회, 최대 2시간 | 별도 정기휴무 확인 안 됨 | YES | NO | https://www.gytennis.or.kr/daily/1 | 예약 규칙 공식, 면수·표면 보조 |
| 성라테니스장 | 06:00~22:00 | 실외 인조잔디 3면 | 위 협회 공통 규칙 | 별도 정기휴무 확인 안 됨 | YES | NO | https://www.gytennis.or.kr/daily/3 | 예약 규칙 공식, 면수·표면 보조 |
| 중산테니스장 | 06:00~22:00 | 실외 하드 3면 | 위 협회 공통 규칙 | 별도 정기휴무 확인 안 됨 | YES | NO | https://www.gytennis.or.kr/daily/6 | 예약 규칙 공식, 면수·표면 보조 |
| 충장테니스장 | 06:00~22:00 | 실외 하드 4면 | 위 협회 공통 규칙 | 별도 정기휴무 확인 안 됨 | YES | NO | https://www.gytennis.or.kr/daily/7 | 예약 규칙 공식, 면수·표면 보조 |
| 토당테니스장 | 06:00~22:00 | 실외 하드 6면 | 위 협회 공통 규칙 | 별도 정기휴무 확인 안 됨 | YES | NO | https://www.gytennis.or.kr/daily/9 | 예약 규칙 공식, 면수·표면 보조 |
| 화정테니스장 | 06:00~22:00 | 실외 하드 3면 | 위 협회 공통 규칙 | 별도 정기휴무 확인 안 됨 | YES | NO | https://www.gytennis.or.kr/daily/10 | 예약 규칙 공식, 면수·표면 보조 |
| 성저테니스장 | 운영시간 공식 페이지에서 재확인 필요 | 실외 하드 4면 | 익월분 매월 25일 10:00 오픈, 개인당 1일 1회 1코트, 신청 당일 24시까지 결제 | 별도 정기휴무 확인 안 됨 | YES | NO | https://yeyak.gys.or.kr/fmcs/41 | 고양시 공식 홍보자료 기반 |
| 백석 테니스장 | 운영시간 재확인 필요 | 실외 클레이 3면 | 현재 DB 링크는 고양도시관리공사 통합예약. 시설 대관 공고에서 오픈 시각 재확인 필요 | 재확인 필요 | YES | 미확인 | https://yeyak.gys.or.kr/fmcs/1?companyCode=GYS10 | 면수·표면 공식 문서 확인, 예약규칙 미확정 |
| 고양백석체육센터 테니스 | 강좌별 상이(현재 06:00대~17:50 이상 강좌 확인) | 백석생활체육시설과 동일 시설일 가능성이 높음: 클레이 3면 | 코트 대관이 아니라 월 강습 프로그램 중심. 테니스는 홈페이지 수시 대기등록 → 관리자 배정 → 결제 | 매월 1·3주 일요일, 법정공휴일, 1/1, 설·추석 | YES(수강 대기등록) | NO | https://yeyak.gys.or.kr/fmcs/1?companyCode=GYS03 | 공식. `백석 테니스장`과 중복 가능성 높음 |
| 국토안전관리원 수도권지역본부 테니스장1 | 09:00~18:00 (09~12, 12~15, 15~18) | 전체 2면 중 자원 1면, 표면 미확인 | 공유누리 선착순 예약으로 추정. 무료, 전국민 이용 가능 | 평일·주말·공휴일 운영 | YES | 미확인 | https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=GG15J1256530 | 알리오플러스 공식 기관 자료 확인 |
| 국토안전관리원 수도권지역본부 테니스장2 | 09:00~18:00 (09~12, 12~15, 15~18) | 전체 2면 중 자원 1면, 표면 미확인 | 공유누리 선착순 예약으로 추정. 무료, 전국민 이용 가능 | 평일·주말·공휴일 운영 | YES | 미확인 | https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=GG15J1857191 | 알리오플러스 공식 기관 자료 확인 |

## 고양시테니스협회 운영 6개 공통 DB 값

```text
basic_time_of_use_weekday_from = 06:00
basic_time_of_use_weekday_to = 22:00
basic_time_of_use_weekend_from = 06:00
basic_time_of_use_weekend_to = 22:00
time_of_use_same = true
booking_online_reserve_possible = true
booking_today_booking_possible = false
booking_booking_provide = public_site
booking_rule_type = monthly
```

예약 규칙은 `court_booking_rules`에 2개로 분리하는 것이 적합하다.

1. 고양시민: 매월 25일 22:00, 익월 예약
2. 타지역 거주자: 매월 27일 07:00, 익월 예약

추가 설명 후보:

```text
온라인 예약만 가능하며 전화예약은 불가. 1일 1회, 최대 2시간.
고양시민 우선예약. 타지역 이용자는 사용료 50% 가산.
```

## 주의 및 후속 확인

1. `고양백석체육센터 테니스`와 `백석 테니스장`은 주소와 코트 구성상 동일 생활체육시설을 강습/대관 명칭으로 중복 수집했을 가능성이 높다. 공개 전 병합 여부를 확인해야 한다.
2. 공유누리 상세 API는 조사 시점에 `401 INVALID AUTHORIZED`를 반환했다. API 키 권한 복구 후 국토안전관리원 2개 자원의 신청 시작·마감일과 당일 예약 가능 여부를 다시 확인한다.
3. 협회 공식 안내의 예약 가능 시스템 시간은 05:00~22:00이고, 시설 사용료 표의 이용시간은 06:00~22:00이다. DB `이용시간`에는 06:00~22:00을 사용한다.
4. 협회 6개 시설은 공식 사이트에서 정기휴무를 별도로 고지하지 않는다. `booking_holiday_week`은 빈값으로 두고 `etc_desc`에 대회·정비·기상 상황에 따라 이용 제한 가능이라고 적는 편이 안전하다.
5. 백석·성저의 규칙은 협회 운영 6개와 동일하다고 일괄 복사하지 말아야 한다. 운영 주체와 예약 시스템이 다르다.

## 주요 출처

- 고양특례시테니스협회 예약안내: https://www.gytennis.or.kr/guide
- 고양특례시 공공체육시설 안내: https://www.goyang.go.kr/www/www03/www03_11/www03_11_7.jsp
- 고양도시관리공사 백석체육센터 이용안내: https://yeyak.gys.or.kr/fmcs/6
- 고양도시관리공사 고양스포츠타운 대관안내: https://yeyak.gys.or.kr/fmcs/41
- 국토안전관리원 시설정보(알리오플러스): https://www.alioplus.go.kr/facilities/facltDetail.do?facltSeq=6738&typ=region
- 고양시 공식 성저테니스장 소개(원문 재게시): https://www.welfarehello.com/community/hometownNews/%EC%82%AC%EA%B3%84%EC%A0%88-%ED%85%8C%EB%8B%88%EC%8A%A4%EB%A5%BC-%EC%A6%90%EA%B8%B8-%EC%88%98-%EC%9E%88%EB%8A%94-%EC%84%B1%EC%A0%80%ED%85%8C%EB%8B%88%EC%8A%A4%EC%9E%A5--459dde11-ddc3-4dce-b22a-481d80c7dd65
- 시설 면수·표면 보조자료: https://firemovement.tistory.com/278
