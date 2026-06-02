"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function NewClientPage() {
  const { session } = useAuth();
  const router = useRouter();
  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";
  const [form, setForm] = useState({ firstName: "", lastName: "", dob: "", gender: "", phone: "", email: "", language: "", zipCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.createClient({ ...form, orgId }, session!.access_token);
      router.push(`/dashboard/clients/${res.client.id}/`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error"); setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/clients/" className="text-sm text-indigo-600 hover:underline mb-4 block">← Clients</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Client</h1>

      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First name *</label>
            <input className="input" required value={form.firstName} onChange={e => set("firstName", e.target.value)} />
          </div>
          <div>
            <label className="label">Last name *</label>
            <input className="input" required value={form.lastName} onChange={e => set("lastName", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date of birth</label>
            <input className="input" type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={e => set("gender", e.target.value)}>
              <option value="">— Select —</option>
              {["Male", "Female", "Non-binary", "Other", "Prefer not to say"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Language</label>
            <input className="input" placeholder="e.g. English" value={form.language} onChange={e => set("language", e.target.value)} />
          </div>
          <div>
            <label className="label">ZIP code</label>
            <input className="input" value={form.zipCode} onChange={e => set("zipCode", e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/clients/" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? "Saving…" : "Create Client"}</button>
        </div>
      </form>
    </div>
  );
}
