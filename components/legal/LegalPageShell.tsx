import CommandSidebar from "@/components/layout/CommandSidebar";
import LandingNav from "@/components/landing/LandingNav";
import EnterpriseFooter from "@/components/layout/EnterpriseFooter";

type Props = {
  children: React.ReactNode;
};

/** Shared shell for governance and contact pages — matches QuantAI reference OS. */
export default function LegalPageShell({ children }: Props) {
  return (
    <main className="qa-ref-os qa-ref-os--phase7 qa-ref-os--decision-system qa-ref-os--intel-authority qa-ref-os--intel-v1 relative min-h-screen overflow-x-hidden">
      <CommandSidebar />
      <div className="qa-ref-shell">
        <LandingNav />
        <div className="qa-ref-workspace qa-ref-legal-page px-4 py-10 sm:px-6 sm:py-14">{children}</div>
        <EnterpriseFooter />
      </div>
    </main>
  );
}
