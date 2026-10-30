"use client";

import { FormEvent, useState } from "react";

const REQUEST_EMAIL = "cksdnd200@gmail.com";

export default function AccountDeletionRequestForm() {
  const [accountEmail, setAccountEmail] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const subject = "[Courts Korea] 계정 및 데이터 삭제 요청";
    const body = [
      "Courts Korea 계정 및 관련 데이터 삭제를 요청합니다.",
      "",
      `가입한 카카오 계정 이메일: ${accountEmail.trim()}`,
      `답변받을 이메일: ${replyEmail.trim()}`,
      `닉네임: ${nickname.trim() || "미입력"}`,
      "",
      "삭제 요청 항목:",
      "- 로그인 계정 및 프로필",
      "- 찜한 테니스장 및 최근 조회 기록",
      "- 오픈 알림 신청 내역 및 푸시 토큰",
      "",
      "계정 소유 확인을 위해 회신 부탁드립니다.",
    ].join("\n");

    window.location.href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={submitRequest} className="mt-5 space-y-5">
      <div>
        <label htmlFor="account-email" className="block font-semibold text-white">
          가입한 카카오 계정 이메일 <span className="text-[#FF7676]">*</span>
        </label>
        <input
          id="account-email"
          type="email"
          required
          autoComplete="email"
          value={accountEmail}
          onChange={(event) => setAccountEmail(event.target.value)}
          placeholder="example@email.com"
          className="mt-2 h-12 w-full rounded-md border border-[#3A3D42] bg-black px-4 text-white outline-none transition-colors placeholder:text-[#666B74] focus:border-white"
        />
      </div>

      <div>
        <label htmlFor="reply-email" className="block font-semibold text-white">
          답변받을 이메일 <span className="text-[#FF7676]">*</span>
        </label>
        <input
          id="reply-email"
          type="email"
          required
          autoComplete="email"
          value={replyEmail}
          onChange={(event) => setReplyEmail(event.target.value)}
          placeholder="example@email.com"
          className="mt-2 h-12 w-full rounded-md border border-[#3A3D42] bg-black px-4 text-white outline-none transition-colors placeholder:text-[#666B74] focus:border-white"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block font-semibold text-white">
          닉네임 <span className="font-normal text-[#8A8F98]">(선택)</span>
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Courts Korea 닉네임"
          className="mt-2 h-12 w-full rounded-md border border-[#3A3D42] bg-black px-4 text-white outline-none transition-colors placeholder:text-[#666B74] focus:border-white"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-md bg-black/40 p-4">
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4 accent-white"
        />
        <span>
          계정과 관련 데이터가 삭제되면 복구할 수 없다는 내용을 확인했습니다.
        </span>
      </label>

      <button
        type="submit"
        disabled={!confirmed}
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-white px-5 font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
      >
        이메일로 삭제 요청 보내기
      </button>

      <p className="text-xs leading-6 text-[#8A8F98]">
        버튼을 누르면 입력한 내용이 포함된 이메일 앱이 열립니다. 이메일 앱에서 전송 버튼을 눌러야 요청이 접수됩니다. 이메일 앱을 사용할 수 없다면 {REQUEST_EMAIL}으로 직접 보내 주세요.
      </p>
    </form>
  );
}
