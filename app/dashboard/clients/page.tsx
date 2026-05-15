"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Search, Plus } from "lucide-react";

export default function ClientsPage() {
  const { session } = useAuth();
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";

  useEffect(() => {
    if (!session || !orgId) return;
    api.listClients({ org: orgId, search, limit: "50" }, session.access_token)
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [session, orgId, search]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link href="/dashboard/clients/new/" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} /> New Client
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9 w-full max-w-sm" placeholder="Search by name, email, phone…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No clients found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Phone", "Email", "ZIP", "Created"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id as string} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/clients/detail/?id=${c.id as string}`} className="font-medium text-indigo-600 hover:underline">
                      {c.first_name as string} {c.last_name as string}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{(c.phone as string) || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{(c.email as string) || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{(c.zip_code as string) || "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(c.created_at as string).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
