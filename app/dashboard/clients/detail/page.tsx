"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

function ClientDetailContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { session } = useAuth();
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [intakes, setIntakes] = useState<Record<string, unknown>[]>([]);
  const [referrals, setReferrals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !id) return;
    Promise.all([
      api.getClient(id, session.access_token),
      api.getClientIntakes(id, session.access_token),
      api.getClientReferrals(id, session.access_token),
    ]).then(([c, i, r]) => { setClient(c); setIntakes(i); setReferrals(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, session]);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!client) return <div className="p-8 text-gray-500">Client not found.</div>;

  return (
    <div className="p-8">
      <Link href="/dashboard/clients/" className="text-sm text-indigo-600 hover:underline mb-4 block">← Clients</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{client.first_name as string} {client.last_name as string}</h1>
        <Link href={`/dashboard/intake/new/?clientId=${id}`} className="btn-primary text-sm">+ New Intake</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
          {([["Date of Birth", client.date_of_birth], ["Gender", client.gender], ["Phone", client.phone], ["Email", client.email], ["Language", client.language], ["ZIP", client.zip_code]] as [string, unknown][]).map(([label, val]) =>
            val ? (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900">{val as string}</span>
              </div>
            ) : null
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Assessments</h2>
          {intakes.length === 0 ? <p className="text-sm text-gray-400">No assessments yet.</p> : intakes.map(i => (
            <Link key={i.id as string} href={`/dashboard/intake/detail/?id=${i.id as string}`}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:text-indigo-600 text-sm">
              <span className="text-gray-700">{new Date(i.created_at as string).toLocaleDateString()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${i.status === "completed" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>
                {i.status as string}
              </span>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Referrals</h2>
          {referrals.length === 0 ? <p className="text-sm text-gray-400">No referrals yet.</p> : referrals.map(r => (
            <div key={r.id as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
              <span className="text-gray-700 truncate">{(r.destination_org_id as string) ?? "External"}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-yellow-50 text-yellow-600" : r.status === "accepted" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}>
                {r.status as string}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading…</div>}>
      <ClientDetailContent />
    </Suspense>
  );
}
