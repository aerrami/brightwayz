"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type ReferralRow = {
  id: string;
  status: string;
  note: string | null;
  invite_email: string | null;
  destination_org_id: string | null;
  created_at: string;
  responded_at: string | null;
  client: { id: string; first_name: string; last_name: string; org_id: string } | null;
};

const STATUSES: [string, string][] = [
  ["", "All statuses"],
  ["pending", "Pending"],
  ["accepted", "Accepted"],
  ["declined", "Declined"],
  ["cancelled", "Cancelled"],
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-600",
  accepted: "bg-green-50 text-green-600",
  declined: "bg-gray-100 text-gray-500",
  cancelled: "bg-gray-50 text-gray-400 line-through",
};

export default function ReferralsPage() {
  const { session } = useAuth();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";

  useEffect(() => {
    if (!session || !orgId) return;
    const params: Record<string, string> = { org: orgId, limit: "100" };
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    api.listReferrals(params, session.access_token)
      .then((rows: ReferralRow[]) => setReferrals(rows))
      .catch(() => setReferrals([]))
      .finally(() => setLoading(false));
  }, [session, orgId, status, search, dateFrom, dateTo]);

  async function cancel(id: string) {
    if (!session) return;
    setCancelling(id);
    try {
      await api.deleteReferral(id, session.access_token);
      setReferrals((rs) =>
        rs.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)),
      );
    } catch {
      // leave row as-is; user can retry
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Referrals</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="relative md:col-span-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search name or invite email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="input"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="input"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {loading ? "Loading…" : `${referrals.length} result${referrals.length === 1 ? "" : "s"}`}
        </p>
        <select
          className="input w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No referrals found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Client", "Destination", "Status", "Created", "Responded"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
                <th className="w-20" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    {r.client ? (
                      <Link
                        href={`/dashboard/clients/detail/?id=${r.client.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {r.client.first_name} {r.client.last_name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">
                    {r.invite_email ? (
                      <span title={r.invite_email}>{r.invite_email}</span>
                    ) : r.destination_org_id ? (
                      <span className="font-mono text-xs" title={r.destination_org_id}>
                        {r.destination_org_id.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        STATUS_STYLES[r.status] ?? "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {r.responded_at ? new Date(r.responded_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {r.status === "pending" ? (
                      <button
                        onClick={() => cancel(r.id)}
                        disabled={cancelling === r.id}
                        className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-40"
                      >
                        {cancelling === r.id ? "…" : "Cancel"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
