import AppChrome from "@/components/app/AppChrome";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}