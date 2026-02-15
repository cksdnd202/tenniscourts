export type Court = {
  /*코트 기본 정보*/
  id: string;
  basic_court_name: string | null;
  // 슬러그 기반 상세 페이지 이동을 위한 필드
  slug?: string | null;
  basic_owner_type: string | null;
  basic_address: string | null;
  basic_map_link: string | null;
  basic_region: string | null;
  basic_city: string | null;
  basic_time_of_use: string | null;

  /*노출 여부*/
  use_or_not: boolean | null;

  /*코트 수 정보*/
  court_count_hard_indoor: number | null;
  court_count_hard_outdoor: number | null;
  court_count_grass_indoor: number | null;
  court_count_grass_outdoor: number | null;
  court_count_clay_indoor: number | null;
  court_count_clay_outdoor: number | null;

  /*예약 정보*/
  booking_site_link: string | null;
  booking_reception_time: string | null;

  booking_rule_type: string | null;
  booking_open_type: string | null;

  booking_eligibility_first: string | null;
  booking_eligibility_second: string | null;

  /*오픈 주차 및 오픈 요일*/
  booking_open_day_of_month: number | null;
  booking_open_day_of_week: number | null;

  /*첫번째 우선권 일자 및 시간*/
  booking_open_day_owner: number | null;
  booking_open_time_owner: string | null;

  /*두번째 우선권 일자 및 시간*/
  booking_open_day_normal: number | null;
  booking_open_time_normal: string | null;

  booking_open_time_local: string | null;
  booking_open_offset: string | null;
  
  booking_online_reserve_possible: boolean | null;
  booking_holiday_week: string | null;
  booking_today_booking_possible: boolean | null;
  booking_booking_provide: string | null;
};
