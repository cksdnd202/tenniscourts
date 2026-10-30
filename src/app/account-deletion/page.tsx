import Image from "next/image";
import Link from "next/link";
import AccountDeletionRequestForm from "./AccountDeletionRequestForm";

export const metadata = {
  title: "계정 및 데이터 삭제 | Courts Korea",
};

export default function AccountDeletionPage() {
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
          <h1 className="text-3xl font-bold">계정 및 데이터 삭제</h1>
          <p className="mt-4 text-sm leading-7 text-[#B0B0B0]">
            Courts Korea 계정과 계정에 연결된 데이터를 삭제하려면 아래 방법 중 하나를 이용해 주세요.
          </p>

          <div className="mt-8 space-y-8 rounded-lg border border-[#2C2C2C] bg-[#191B1E] p-6 text-sm leading-7 text-[#B0B0B0]">
            <section>
              <h2 className="text-lg font-semibold text-white">앱에서 바로 삭제</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>Courts Korea 앱을 열고 로그인합니다.</li>
                <li>마이페이지에서 프로필 보기를 선택합니다.</li>
                <li>회원탈퇴를 누르고 안내에 따라 삭제를 확정합니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">로그인 없이 삭제 요청</h2>
              <p className="mt-3">
                앱을 삭제했거나 로그인할 수 없다면 아래 양식을 작성해 주세요. 등록된 계정 정보를 확인한 뒤 답변받을 이메일로 처리 절차를 안내합니다.
              </p>
              <AccountDeletionRequestForm />
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">삭제되는 데이터</h2>
              <p className="mt-3">
                계정 정보, 프로필, 찜한 테니스장, 최근 본 테니스장, 예약 오픈 알림 신청과 계정에 연결된 푸시 토큰이 삭제됩니다. 관계 법령에 따라 보관 의무가 있는 정보는 해당 기간 동안 분리 보관한 뒤 삭제할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">분석 데이터</h2>
              <p className="mt-3">
                이미 집계되거나 개인 식별값과 분리된 통계는 서비스 개선을 위한 비식별 통계로 남을 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">처리 절차</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>삭제 요청 이메일을 접수합니다.</li>
                <li>가입 정보와 답변받을 이메일을 이용해 계정 소유 여부를 확인합니다.</li>
                <li>확인이 끝나면 계정과 관련 데이터를 삭제하고 처리 결과를 이메일로 안내합니다.</li>
              </ol>
            </section>

            <p className="border-t border-[#33363B] pt-5">
              자세한 내용은 <Link href="/privacy" className="font-semibold text-white underline">개인정보처리방침</Link>에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
