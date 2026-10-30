import { PublicSupportHeader } from "../support/PublicSupportHeader";
import { WebNoticesClient } from "./WebNoticesClient";
export const metadata = { title: "공지사항 | Courts Korea" };
export default function NoticesPage() { return <><PublicSupportHeader /><main className="min-h-[calc(100vh-73px)] bg-black px-5 py-12 text-white"><WebNoticesClient /></main></>; }
