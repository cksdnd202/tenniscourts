export type Court = {
  /*코트 기본 정보*/
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  basic_court_name: string | null;
  // 슬러그 기반 상세 페이지 이동을 위한 필드
  slug?: string | null;
  basic_owner_type: string | null;
  basic_address: string | null;
  basic_map_link: string | null;
  basic_latitude?: number | null;
  basic_longitude?: number | null;
  basic_region: string | null;
  basic_city: string | null;
  time_of_use_same?: boolean | null;
  basic_time_of_use_weekday_from?: string | null;
  basic_time_of_use_weekday_to?: string | null;
  basic_time_of_use_weekend_from?: string | null;
  basic_time_of_use_weekend_to?: string | null;

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
  booking_lottery_desc?: string | null;
  booking_open_type: string | null;

  booking_eligibility_first: string | null;
  booking_eligibility_second: string | null;

  /*오픈 주차 및 오픈 요일*/
  booking_open_day_of_month: number | null;
  booking_open_day_of_week: number | null;
  booking_open_ordinal: number | null;

  /*첫번째 우선권 일자 및 시간*/
  booking_open_day_owner: number | null;
  booking_open_time_owner: string | null;

  /*두번째 우선권 일자 및 시간*/
  booking_open_day_normal: number | null;
  booking_open_time_normal: string | null;
  booking_normal_iscurrentmonth: boolean | null;

  booking_open_time_local: string | null;
  booking_open_offset: string | null;
  
  booking_online_reserve_possible: boolean | null;
  booking_holiday_week: string | null;
  booking_today_booking_possible: boolean | null;
  booking_booking_provide: string | null;
  etc_desc: string | null;

  /*외부 예약 데이터 원본 매칭 정보*/
  source_provider?: string | null;
  source_service_id?: string | null;
  source_service_name?: string | null;
  source_place_name?: string | null;
  source_area_name?: string | null;
  source_time_min?: string | null;
  source_time_max?: string | null;
  source_match_key?: string | null;
  source_synced_at?: string | null;

  /*새 예약 규칙 테이블 - 전환 테스트용*/
  court_booking_rules?: CourtBookingRule[];
  court_booking_rule_fees?: CourtBookingRuleFee[];
  court_blog_links?: CourtBlogLink[];
};

export type CourtBookingRule = {
  id: string;
  court_id: string;
  label: string | null;
  eligibility: string | null;
  rule_type: string | null;
  open_type: string | null;
  open_day_of_month: number | null;
  open_day_of_week: number | null;
  open_ordinal: number | null;
  open_time: string | null;
  open_offset: string | null;
  open_date_adjustment?: string | null;
  interval_weeks?: number | null;
  anchor_date?: string | null;
  lottery_desc: string | null;
  reservation_url?: string | null;
  booking_round_label?: string | null;
  usage_period_label?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CourtBookingRuleFee = {
  id: string;
  booking_rule_id: string;
  is_free: boolean;
  price_basis_hours: 1 | 2 | 3;
  outdoor_weekday_price: number | null;
  outdoor_weekend_price: number | null;
  indoor_weekday_price: number | null;
  indoor_weekend_price: number | null;
  lighting_fee_separate: boolean;
  lighting_fee_amount: number | null;
  lighting_fee_basis_hours: 1 | 2 | 3 | null;
  lighting_start_time: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CourtBlogLink = {
  id?: string;
  court_id: string;
  url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  source: string | null;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};
