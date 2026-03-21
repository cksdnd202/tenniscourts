/** 안드로이드 기본 캘린더 앱 INSERT 인텐트용 (RSC → client 전달 가능한 직렬화 값) */
export type CalendarAndroidEventPayload = {
  title: string;
  description: string;
  location?: string;
  startIso: string;
  endIso: string;
};
