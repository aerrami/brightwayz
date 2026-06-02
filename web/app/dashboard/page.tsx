"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";
  const loading = !!session && !!orgId && !loaded;

  useEffect(() => {
    if (!session || !orgId) return;
    api.getDashboard(orgId, session.access_token)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, [session, orgId]);

  const stats = (data?.stats as Record<string, number>) ?? {};
  const recentClients = (data?.recentClients as Record<string, unknown>[]) ?? [];
  const recentReferrals = (data?.recentReferrals as Record<string, unknown>[]) ?? [];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Clients", value: stats.totalClients ?? 0 },
              { label: "Open Referrals", value: stats.openReferrals ?? 0 },
              { label: "Completed Intakes", value: stats.completedIntakes ?? 0 },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Recent Clients</h2>
              {recentClients.length === 0
                ? <p className="text-sm text-gray-400">No clients yet.</p>
                : recentClients.map(c => (
                    <div key={c.id as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{c.first_name as string} {c.last_name as string}</span>
                      <span className="text-xs text-gray-400">{new Date(c.created_at as string).toLocaleDateString()}</span>
                    </div>
                  ))
              }
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Recent Referrals</h2>
              {recentReferrals.length === 0
                ? <p className="text-sm text-gray-400">No referrals yet.</p>
                : recentReferrals.map(r => (
                    <div key={r.id as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{r.client_id as string}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-yellow-50 text-yellow-600" : r.status === "accepted" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}>
                        {r.status as string}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
