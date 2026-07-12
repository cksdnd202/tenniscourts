export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-16 text-white">
      <div className="mx-auto flex max-w-sm flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-[#6FCF97]">Courts Korea</p>
          <h1 className="mt-2 text-2xl font-semibold">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
            카카오 로그인 기능을 연결하기 전 임시 페이지입니다.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[#3C3C3C] bg-[#1A1A1B] text-sm font-medium hover:bg-[#252528]"
        >
          메인으로 돌아가기
        </a>
      </div>
    </main>
  );
}
