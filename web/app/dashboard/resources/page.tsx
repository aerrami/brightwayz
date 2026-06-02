"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

const EMPTY = { name: "", type: "", status: "open", category: "", phone: "", email: "", address: "", city: "", state: "", postal_code: "", hours: "", apply_text: "" };

export default function ResourcesPage() {
  const { session } = useAuth();
  const [resources, setResources] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";

  function load() {
    if (!session || !orgId) return;
    api.listOrgResources(orgId, session.access_token)
      .then(setResources).catch(() => setResources([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [session, orgId]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.createResource({ ...form, orgId, serves: [], requirements: [], tags: [], animals: false }, session!.access_token);
      setForm({ ...EMPTY }); setShowForm(false); load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this resource?")) return;
    await api.deleteResource(id, session!.access_token);
    setResources(r => r.filter(x => x.id !== id));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} /> Add Resource
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-2 gap-4">
          {(["name *", "category", "type", "phone", "email", "address", "city", "state", "postal_code", "hours", "apply_text"] as const).map(k => {
            const key = k.replace(" *", "");
            return (
              <div key={key} className={key === "apply_text" ? "col-span-2" : ""}>
                <label className="label capitalize">{k}</label>
                <input className="input" required={k.includes("*")} value={form[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            );
          })}
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div>
          : resources.length === 0 ? <div className="p-8 text-center text-gray-400">No resources yet.</div>
          : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["Name", "Category", "Phone", "Status", ""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody>
                {resources.map(r => (
                  <tr key={r.id as string} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name as string}</td>
                    <td className="px-4 py-3 text-gray-500">{(r.category as string) || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{(r.phone as string) || "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "open" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}>{r.status as string}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(r.id as string)} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={14} /></button>
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
