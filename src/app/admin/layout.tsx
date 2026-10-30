import type { Metadata } from "next";
import { AdminLayoutShell } from "./AdminLayoutShell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-document-surface min-h-screen">
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </div>
  );
}
