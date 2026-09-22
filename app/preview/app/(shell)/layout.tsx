import { Shell } from "../../_components/Shell";
import { FIRM_NAV } from "../../_lib/nav";

export default function FirmShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell panel="firm" navGroups={FIRM_NAV} userLabel="Elena Whitfield" userInitials="EW">
      {children}
    </Shell>
  );
}
