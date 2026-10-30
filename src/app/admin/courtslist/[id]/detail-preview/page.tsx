import { AdminCourtDetailPreview } from "./AdminCourtDetailPreview";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCourtDetailPreviewPage({ params }: PageProps) {
  const { id } = await params;
  return <div className="admin-legacy"><AdminCourtDetailPreview courtId={id} /></div>;
}
