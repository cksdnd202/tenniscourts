import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "개인정보처리방침 | Courts Korea",
};

export default function PrivacyPage() {
  return (
    <>
      <header className="border-b border-[#2C2C2C] bg-black">
        <div className="mx-auto flex max-w-5xl items-center px-5 py-5">
          <Link href="/" aria-label="Courts Korea 메인으로 이동">
            <Image
              src="/courtskroea_logo_svg.svg"
              alt="Courts Korea"
              width={200}
              height={40}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
        </div>
      </header>

      <main className="min-h-screen bg-black px-5 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold">개인정보처리방침</h1>
          <p className="mt-3 text-sm text-[#8A8F98]">시행일: 2026년 7월 12일</p>

          <div className="mt-8 space-y-10 rounded-lg border border-[#2C2C2C] bg-[#191B1E] p-6 text-sm leading-7 text-[#B0B0B0]">
          <section>
            <p>
              Courts Korea(이하 “서비스”)는 이용자의 개인정보를 중요하게 생각하며, 개인정보보호법 등 관련 법령을 준수하기 위해 다음과 같이 개인정보처리방침을 공개합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">1. 개인정보의 처리 목적</h2>
            <p className="mt-3">
              서비스는 다음의 목적을 위해 개인정보를 처리합니다. 처리한 개인정보는 아래 목적 외의 용도로 이용하지 않으며, 이용 목적이 변경되는 경우 관련 법령에 따라 필요한 조치를 이행합니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>카카오 로그인을 통한 회원 식별 및 로그인 상태 유지</li>
              <li>마이페이지, 내 프로필, 찜한 테니스장, 최근 본 테니스장 기능 제공</li>
              <li>서비스 이용 기록 확인, 오류 대응, 부정 이용 방지</li>
              <li>서비스 이용 통계 분석 및 기능 개선</li>
              <li>이용자 문의 및 요청사항 처리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. 수집하는 개인정보 항목</h2>
            <div className="mt-3 overflow-hidden rounded-md border border-[#33363B]">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#222529] text-white">
                  <tr>
                    <th className="border-b border-[#33363B] px-4 py-3 font-semibold">구분</th>
                    <th className="border-b border-[#33363B] px-4 py-3 font-semibold">수집 항목</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-[#33363B] px-4 py-3 text-white">카카오 로그인</td>
                    <td className="border-b border-[#33363B] px-4 py-3">카카오 계정 식별값, 이메일, 닉네임, 프로필 이미지</td>
                  </tr>
                  <tr>
                    <td className="border-b border-[#33363B] px-4 py-3 text-white">서비스 이용 정보</td>
                    <td className="border-b border-[#33363B] px-4 py-3">찜한 테니스장, 최근 본 테니스장, 이용자가 수정한 닉네임, 가입일, 로그인 방식</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white">자동 생성 정보</td>
                    <td className="px-4 py-3">접속 기록, 브라우저 및 기기 정보, IP 주소, 쿠키, 서비스 이용 통계 정보</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. 개인정보의 수집 방법</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>이용자가 카카오 로그인을 진행할 때 카카오로부터 동의받은 정보를 제공받습니다.</li>
              <li>이용자가 마이페이지에서 닉네임을 수정하거나 찜하기, 최근 본 테니스장 기능을 이용할 때 생성됩니다.</li>
              <li>서비스 이용 과정에서 접속 기록, 쿠키, 이용 통계 정보가 자동으로 생성될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. 개인정보의 보유 및 이용 기간</h2>
            <p className="mt-3">
              서비스는 개인정보의 처리 목적이 달성되거나 이용자가 회원 탈퇴를 요청한 경우 지체 없이 해당 개인정보를 파기합니다. 다만, 관련 법령에 따라 보관이 필요한 경우에는 해당 법령에서 정한 기간 동안 보관할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. 개인정보의 제3자 제공</h2>
            <p className="mt-3">
              서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법령에 따라 제공 의무가 발생한 경우에는 예외적으로 제공할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. 개인정보 처리 업무의 위탁 및 외부 서비스 이용</h2>
            <p className="mt-3">
              서비스 제공을 위해 다음 외부 서비스를 이용할 수 있습니다.
            </p>
            <div className="mt-3 overflow-hidden rounded-md border border-[#33363B]">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#222529] text-white">
                  <tr>
                    <th className="border-b border-[#33363B] px-4 py-3 font-semibold">업체/서비스</th>
                    <th className="border-b border-[#33363B] px-4 py-3 font-semibold">이용 목적</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-[#33363B] px-4 py-3 text-white">Kakao</td>
                    <td className="border-b border-[#33363B] px-4 py-3">카카오 로그인 인증 및 이용자 식별</td>
                  </tr>
                  <tr>
                    <td className="border-b border-[#33363B] px-4 py-3 text-white">Supabase</td>
                    <td className="border-b border-[#33363B] px-4 py-3">회원 인증, 계정 정보 및 서비스 이용 데이터 저장</td>
                  </tr>
                  <tr>
                    <td className="border-b border-[#33363B] px-4 py-3 text-white">Vercel</td>
                    <td className="border-b border-[#33363B] px-4 py-3">웹사이트 배포 및 호스팅</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-white">Google Analytics</td>
                    <td className="px-4 py-3">서비스 방문 및 이용 통계 분석</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. 개인정보의 파기 절차 및 방법</h2>
            <p className="mt-3">
              서비스는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 해당 개인정보를 지체 없이 파기합니다. 전자적 파일 형태의 개인정보는 복구 또는 재생되지 않도록 삭제합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. 이용자의 권리와 행사 방법</h2>
            <p className="mt-3">
              이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 서비스 내 마이페이지에서 닉네임 수정, 로그아웃, 회원 탈퇴를 할 수 있으며, 추가 요청은 개인정보 보호책임자에게 문의할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. 쿠키 및 분석 도구의 사용</h2>
            <p className="mt-3">
              서비스는 로그인 상태 유지, 서비스 이용 편의 제공, 방문 통계 분석을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있으며, 이 경우 일부 기능 이용이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. 개인정보 보호책임자</h2>
            <p className="mt-3">
              서비스는 개인정보 처리와 관련한 문의, 불만 처리, 피해 구제 요청을 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="mt-3 rounded-md border border-[#33363B] p-4">
              <p>개인정보 보호책임자: 강찬웅</p>
              <p>이메일: cksdnd200@gmail.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. 개인정보처리방침의 변경</h2>
            <p className="mt-3">
              이 개인정보처리방침은 시행일로부터 적용됩니다. 서비스는 개인정보처리방침을 변경하는 경우 웹사이트를 통해 변경 내용을 공지합니다.
            </p>
          </section>
          </div>
        </div>
      </main>
    </>
  );
}
