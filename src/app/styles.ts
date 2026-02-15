export const courtitem_courtname = "font-semibold text-white text-xl w-full md:w-auto flex-1 min-w-0 truncate";
export const courtitem_courtownertype =
  "rounded text-xs font-medium text-white pt-1 pb-1 pl-1.5 pr-1.5 bg-[#2C2C2C] flex-shrink-0 whitespace-nowrap";
export const courtitem_courtopentime = "text-sm font-bold text-white";
export const courtitem_courtopentime_text = "text-sm font-normal text-white";
export const courtitem_courtaddress = "font-light text-sm text-[#B0B0B0] mr-2";
export const courtitem_courtmaplink = "text-sm font-light text-[#B0B0B0] underline";
export const th =
  "border border-[#3C3C3C] bg-[#2C2C2C] px-1 py-1 text-center font-normal text-white text-xs overflow-hidden";
export const td =
  "border border-[#3C3C3C] px-1 py-1 text-center text-white font-normal text-xs bg-[#2C2C2C] overflow-hidden";
export const tdIcon =
  "border border-[#3C3C3C] bg-[#2C2C2C] px-1 py-1 text-center text-xs";

export const fmt = (n?: number | null) => (n && n > 0 ? `${n}개` : "-");

// 시간 문자열에서 초(ss) 부분을 제거하여 hh:mm 형식으로 변환
export const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return "";
  // hh:mm:ss 형식에서 마지막 :ss 부분 제거
  return timeString.split(":").slice(0, 2).join(":");
};
