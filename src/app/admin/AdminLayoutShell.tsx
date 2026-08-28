"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminAuthGate } from "./AdminAuthGate";

const adminMenus = [
  { href: "/admin/courtslist", label: "테니스장 목록" },
  { href: "/admin/esharetest", label: "공유누리 API 테스트" },
  { href: "/admin/instagramgenerator", label: "인스타 생성기" },
];

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminAuthGate>
      <main className="min-h-screen bg-black text-white">
        <header className="border-b border-[#2c2c2c] px-5 py-4 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" aria-label="메인페이지로 이동" className="inline-flex items-center">
              <Image
                src="/courtskroea_logo_svg.svg"
                alt="Courts Korea"
                width={200}
                height={40}
                className="h-7 w-auto object-contain"
                priority
              />
            </Link>
            <nav className="flex gap-2">
              {adminMenus.map((menu) => {
                const isActive = pathname === menu.href || pathname.startsWith(`${menu.href}/`);
                return (
                  <Link
                    key={menu.href}
                    href={menu.href}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-[#4ade80] text-black"
                        : "border border-[#3c3c3c] bg-[#151515] text-[#d8d8d8] hover:bg-[#242424] hover:text-white"
                    }`}
                  >
                    {menu.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">{children}</div>
      </main>
    </AdminAuthGate>
  );
}
