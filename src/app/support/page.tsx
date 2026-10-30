import { PublicSupportHeader } from "./PublicSupportHeader";
import { WebSupportForm } from "./WebSupportForm";
export const metadata = { title: "고객문의 | Courts Korea" };
export default function SupportPage() { return <><PublicSupportHeader /><main className="min-h-[calc(100vh-73px)] bg-black px-5 py-12 text-white"><WebSupportForm /></main></>; }
