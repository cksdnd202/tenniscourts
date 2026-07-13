import { AdminAuthGate } from "./AdminAuthGate";
import { AdminCourtManager } from "./AdminCourtManager";

export default function AdminPage() {
  return (
    <AdminAuthGate>
      <AdminCourtManager />
    </AdminAuthGate>
  );
}
