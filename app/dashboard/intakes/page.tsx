"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type IntakeRow = {
  id: string;
  status: string;
  source: string;
  zip_code: string | null;
  support_types: string[] | null;
  support_urgent: string | null;
  created_at: string;
  completed_at: string | null;
  client: { id: string; first_name: string; last_name: string } | null;
};

const STATUSES: [string, string][] = [
  ["", "All statuses"],
  ["completed", "Completed"],
  ["in_progress", "In progress"],
];

export default function IntakesPage() {
  const { session } = useAuth();
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";

  useEffect(() => {
    if (!session || !orgId) return;
    const params: Record<string, string> = { org: orgId, limit: "100" };
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    api.listIntakes(params, session.access_token)
      .then((rows: IntakeRow[]) => setIntakes(rows))
      .catch(() => setIntakes([]))
      .finally(() => setLoading(false));
  }, [session, orgId, status, search, dateFrom, dateTo]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Intakes</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="relative md:col-span-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search name or ZIP…"
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
          {loading ? "Loading…" : `${intakes.length} result${intakes.length === 1 ? "" : "s"}`}
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
        ) : intakes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No intakes found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Client", "ZIP", "Status", "Source", "Support Needs", "Created"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
                <th className="w-10" aria-label="View"></th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((i) => (
                <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    {i.client ? (
                      <Link
                        href={`/dashboard/clients/detail/?id=${i.client.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {i.client.first_name} {i.client.last_name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{i.zip_code || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        i.status === "completed"
                          ? "bg-green-50 text-green-600"
                          : "bg-yellow-50 text-yellow-600"
                      }`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{i.source || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.support_types && i.support_types.length > 0 ? (
                      <span className="text-xs">
                        {i.support_types.slice(0, 3).join(", ")}
                        {i.support_types.length > 3 ? ` +${i.support_types.length - 3}` : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                    {i.support_urgent ? (
                      <span className="ml-2 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        urgent
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(i.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/dashboard/intakes/detail/?id=${i.id}`}
                      aria-label="View intake details"
                      className="inline-flex items-center text-gray-400 hover:text-indigo-600"
                    >
                      <ChevronRight size={16} />
                    </Link>
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
