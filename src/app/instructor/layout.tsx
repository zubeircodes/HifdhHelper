import { DesktopChrome } from "@/components/shells";
import { InstructorRail } from "@/components/shells/instructor-rail";
import { InstructorMobileHeader } from "@/components/shells/instructor-mobile-header";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DesktopChrome rail={<InstructorRail />}>
      <InstructorMobileHeader />
      {children}
    </DesktopChrome>
  );
}
