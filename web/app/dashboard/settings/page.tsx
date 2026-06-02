"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { session } = useAuth();
  const [org, setOrg] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";

  useEffect(() => {
    if (!session || !orgId) return;
    api.getOrg(orgId, session.access_token)
      .then(setOrg).catch(() => {})
      .finally(() => setLoading(false));
  }, [session, orgId]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaved(false);
    try {
      await api.updateOrg(orgId, org, session!.access_token);
      setSaved(true);
    } finally { setSaving(false); }
  }

  const fields = ["name", "display_name", "website", "email", "phone", "address_line1", "address_line2", "city", "state", "postal_code"];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Organisation Settings</h1>
      {loading ? <div className="text-gray-400">Loading…</div> : (
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-2 gap-4">
          {fields.map(k => (
            <div key={k} className={["address_line1", "address_line2", "website"].includes(k) ? "col-span-2" : ""}>
              <label className="label capitalize">{k.replace(/_/g, " ")}</label>
              <input className="input" value={org[k] ?? ""} onChange={e => setOrg(o => ({ ...o, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-end gap-3 pt-2">
            {saved && <span className="text-sm text-green-600">Saved!</span>}
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
