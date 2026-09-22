import { Shell } from "../../_components/Shell";
import { ADMIN_NAV } from "../../_lib/nav";

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell panel="admin" navGroups={ADMIN_NAV} userLabel="Accorix Support" userInitials="AC">
      {children}
    </Shell>
  );
}
