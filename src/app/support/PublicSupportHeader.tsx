import Image from "next/image";
import Link from "next/link";

export function PublicSupportHeader() {
  return <header className="border-b border-[#2C2C2C] bg-black"><div className="mx-auto flex h-[73px] max-w-5xl items-center justify-between px-5"><Link href="/" aria-label="Courts Korea 메인"><Image src="/courtskroea_logo_svg.svg" alt="Courts Korea" width={200} height={40} className="h-7 w-auto" priority /></Link><nav className="flex gap-5 text-sm font-medium text-[#999]"><Link href="/notices" className="hover:text-white">공지사항</Link><Link href="/support" className="hover:text-white">고객문의</Link></nav></div></header>;
}
