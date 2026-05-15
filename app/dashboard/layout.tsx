"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Users, ClipboardList, GitMerge, MapPin, Building2, LogOut } from "lucide-react";

const NAV = [
  { href: "/dashboard/", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/clients/", label: "Clients", icon: Users },
  { href: "/dashboard/intakes/", label: "Intakes", icon: ClipboardList },
  { href: "/dashboard/referrals/", label: "Referrals", icon: GitMerge },
  { href: "/dashboard/resources/", label: "Resources", icon: MapPin },
  { href: "/dashboard/settings/", label: "Settings", icon: Building2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.push("/login/");
  }, [session, loading, router]);

  if (loading || !session) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="font-bold text-indigo-600 text-lg">Brightwayz</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <button onClick={signOut} className="flex items-center gap-2 px-6 py-4 text-sm text-gray-400 hover:text-gray-600 border-t border-gray-100">
          <LogOut size={15} /> Sign out
        </button>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
