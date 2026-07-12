import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "이용약관 | Courts Korea",
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold">이용약관</h1>
          <p className="mt-3 text-sm text-[#8A8F98]">시행일: 2026년 7월 12일</p>

          <div className="mt-8 space-y-10 rounded-lg border border-[#2C2C2C] bg-[#191B1E] p-6 text-sm leading-7 text-[#B0B0B0]">
            <section>
              <p>
                이 약관은 강찬웅이 운영하는 Courts Korea(이하 “서비스”)의 이용과 관련하여 서비스와 이용자 사이의 권리, 의무 및 책임사항을 정하는 것을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">1. 약관의 적용 및 변경</h2>
              <p className="mt-3">
                본 약관은 서비스를 이용하는 모든 이용자에게 적용됩니다. 서비스는 필요한 경우 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 사항은 웹사이트를 통해 공지합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">2. 서비스의 내용</h2>
              <p className="mt-3">
                서비스는 테니스장 정보, 코트 수, 위치, 예약 사이트 링크, 예약 오픈 일정 등 테니스장 이용에 참고할 수 있는 정보를 제공합니다. 또한 로그인한 이용자에게 찜한 테니스장, 최근 본 테니스장, 내 프로필 등의 개인화 기능을 제공합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">3. 예약 및 외부 사이트 이용</h2>
              <p className="mt-3">
                서비스는 테니스장 예약을 직접 대행하거나 확정하지 않습니다. 실제 예약, 결제, 취소, 환불, 이용 조건 확인은 각 테니스장 또는 예약 사이트에서 진행됩니다. 이용자는 예약 전 해당 예약 사이트의 최신 공지와 조건을 직접 확인해야 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">4. 회원가입 및 로그인</h2>
              <p className="mt-3">
                이용자는 카카오 로그인을 통해 서비스에 가입하거나 로그인할 수 있습니다. 서비스는 로그인한 이용자에게 찜하기, 최근 본 테니스장, 닉네임 수정 등 회원 기능을 제공할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">5. 계정 관리 및 회원 탈퇴</h2>
              <p className="mt-3">
                이용자는 마이페이지에서 자신의 프로필 정보를 확인하고 닉네임을 수정할 수 있습니다. 이용자는 언제든지 회원 탈퇴를 요청할 수 있으며, 탈퇴 시 서비스 이용을 위해 저장된 계정 정보와 개인화 데이터는 관련 법령에 따라 필요한 경우를 제외하고 삭제됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">6. 이용자의 의무</h2>
              <p className="mt-3">
                이용자는 서비스를 정상적인 목적에 따라 이용해야 하며, 다음 행위를 해서는 안 됩니다.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>타인의 계정 또는 개인정보를 도용하는 행위</li>
                <li>서비스의 정상적인 운영을 방해하는 행위</li>
                <li>자동화된 방법으로 과도한 요청을 보내거나 데이터를 무단 수집하는 행위</li>
                <li>서비스 또는 제3자의 권리, 명예, 신용을 침해하는 행위</li>
                <li>관련 법령 또는 공서양속에 반하는 행위</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">7. 정보의 정확성 및 책임 제한</h2>
              <p className="mt-3">
                서비스는 정확한 정보를 제공하기 위해 노력하지만, 테니스장 예약 일정, 운영 시간, 예약 가능 여부, 예약 링크 등은 각 운영 주체의 사정에 따라 변경될 수 있습니다. 서비스는 정보의 최신성, 정확성, 완전성을 보장하지 않으며, 이용자는 예약 전 반드시 공식 예약 사이트 또는 운영 기관을 통해 최종 정보를 확인해야 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">8. 서비스의 변경 및 중단</h2>
              <p className="mt-3">
                서비스는 운영상 또는 기술상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 일시 중단할 수 있습니다. 이 경우 가능한 범위에서 사전에 공지합니다. 다만, 긴급한 장애, 보안 문제, 외부 서비스 장애 등 부득이한 경우 사후에 공지할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">9. 지식재산권</h2>
              <p className="mt-3">
                서비스 화면, 구성, 자체 제작 콘텐츠 및 데이터 정리 방식에 대한 권리는 서비스 또는 정당한 권리자에게 있습니다. 이용자는 서비스를 개인적인 이용 목적 범위에서 사용할 수 있으며, 서비스의 콘텐츠를 무단 복제, 배포, 판매, 재가공해서는 안 됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">10. 개인정보 보호</h2>
              <p className="mt-3">
                서비스는 이용자의 개인정보를 관련 법령과 개인정보처리방침에 따라 처리합니다. 개인정보 처리에 관한 자세한 내용은 개인정보처리방침에서 확인할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">11. 문의</h2>
              <p className="mt-3">
                서비스 이용과 관련한 문의는 아래 이메일로 연락할 수 있습니다.
              </p>
              <div className="mt-3 rounded-md border border-[#33363B] p-4">
                <p>운영자: 강찬웅</p>
                <p>이메일: cksdnd200@gmail.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">12. 준거법 및 관할</h2>
              <p className="mt-3">
                본 약관은 대한민국 법령에 따라 해석됩니다. 서비스 이용과 관련하여 분쟁이 발생한 경우, 관련 법령에서 정한 절차와 관할에 따릅니다.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
