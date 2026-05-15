"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type IntakeRow = {
  id: string;
  status: string;
  source: string;
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
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";

  useEffect(() => {
    if (!session || !orgId) return;
    const params: Record<string, string> = { org: orgId, limit: "100" };
    if (status) params.status = status;
    api.listIntakes(params, session.access_token)
      .then((rows: IntakeRow[]) => setIntakes(rows))
      .catch(() => setIntakes([]))
      .finally(() => setLoading(false));
  }, [session, orgId, status]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Intakes</h1>
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
                {["Client", "Status", "Source", "Support Needs", "Created"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
