"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const CATEGORIES = ["", "Housing", "Food", "Employment", "Healthcare", "Mental Health", "Legal Aid", "Transportation", "Childcare"];

interface Resource {
  id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  hours?: string;
  apply_text?: string;
  status: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [zip, setZip] = useState("");

  useEffect(() => {
    const params: Record<string, string> = { status: "open", limit: "50" };
    if (category) params.category = category;
    if (zip) params.zip = zip;
    api.searchResources(params)
      .then((data) => setResources(data as Resource[]))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [category, zip]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-indigo-600 font-bold text-lg">Brightwayz</Link>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700 font-medium">Resource Directory</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-3 mb-6 flex-wrap">
          <input className="input flex-1 min-w-[140px]" placeholder="ZIP code"
            value={zip} onChange={e => setZip(e.target.value)} />
          <select className="input w-48" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c || "All Categories"}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No resources found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  {r.category ? <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{r.category}</span> : null}
                </div>
                {r.address ? <p className="text-sm text-gray-500 mb-1">{r.address}{r.city ? `, ${r.city}` : ""}</p> : null}
                {r.phone ? <p className="text-sm text-gray-500">📞 {r.phone}</p> : null}
                {r.hours ? <p className="text-sm text-gray-400 mt-1">🕐 {r.hours}</p> : null}
                {r.apply_text ? <p className="text-sm text-gray-600 mt-2 italic">{r.apply_text}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
