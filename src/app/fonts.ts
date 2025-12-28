import localFont from "next/font/local";

export const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920", // Variable 폰트면 이렇게 범위 지정 가능
});