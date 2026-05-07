import Link from "next/link";
import {
  LayoutDashboard,
  Bookmark,
  Bell,
  BarChart3,
  Settings,
  CreditCard,
  Sparkles,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Saved Products", href: "/saved", icon: Bookmark },
  { name: "AI Alerts", href: "/alerts", icon: Bell },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Pricing", href: "/pricing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="fixed left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[130px]" />
      <div className="fixed bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-[130px]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-white/10 bg-white/[0.03] backdrop-blur-xl lg:block">
          <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
              <Sparkles size={20} />
            </div>

            <div>
              <h1 className="text-lg font-bold">QuantAI</h1>
              <p className="text-xs text-gray-400">AI shopping intelligence</p>
            </div>
          </div>

          <nav className="space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-4 left-4 right-4 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <p className="text-sm font-semibold text-cyan-200">
              Pro AI Engine
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Unlock real-time price alerts and advanced product intelligence.
            </p>

            <Link
              href="/pricing"
              className="mt-4 block rounded-xl bg-cyan-400 px-4 py-2 text-center text-sm font-bold text-black transition hover:bg-cyan-300"
            >
              Upgrade
            </Link>
          </div>
        </aside>

        <main className="w-full lg:pl-72">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[#050816]/80 px-6 backdrop-blur-xl">
            <div>
              <p className="text-sm text-gray-400">Welcome back</p>
              <h2 className="text-xl font-semibold">QuantAI Console</h2>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/pricing"
                className="hidden rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 md:block"
              >
                Upgrade
              </Link>

              <div className="h-10 w-10 rounded-full border border-white/10 bg-white/10" />
            </div>
          </header>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}