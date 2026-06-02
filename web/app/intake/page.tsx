"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const STEPS = ["About You", "Housing", "Support Needs", "Contact"];

export default function IntakePage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", language: "en",
    housingStatus: "", employmentStatus: "",
    supportTypes: [] as string[],
    phone: "", email: "", zipCode: "",
  });

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleSupport(type: string) {
    set("supportTypes", form.supportTypes.includes(type)
      ? form.supportTypes.filter(t => t !== type)
      : [...form.supportTypes, type]);
  }

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await api.chatbotIntake({ ...form });
      setAssessmentId(res.assessmentId);
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md text-center shadow-sm">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received</h2>
        <p className="text-gray-500 mb-6">A case manager will be in touch within 24 hours.<br />Reference: <span className="font-mono text-xs text-gray-400">{assessmentId}</span></p>
        <Link href="/" className="text-indigo-600 text-sm hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-sm text-indigo-600 hover:underline mb-6 block">← Brightwayz</Link>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-indigo-600" : "bg-gray-100"}`} />
            ))}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                  <input className="input" value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Jane" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input className="input" value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred language</label>
                <select className="input" value={form.language} onChange={e => set("language", e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current housing situation</label>
                {["stable", "at-risk", "shelter", "homeless", "other"].map(opt => (
                  <label key={opt} className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input type="radio" name="housing" value={opt} checked={form.housingStatus === opt} onChange={() => set("housingStatus", opt)} className="accent-indigo-600" />
                    <span className="text-sm capitalize text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment status</label>
                {["employed", "unemployed-looking", "unemployed-not-looking", "unable-to-work"].map(opt => (
                  <label key={opt} className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input type="radio" name="employment" value={opt} checked={form.employmentStatus === opt} onChange={() => set("employmentStatus", opt)} className="accent-indigo-600" />
                    <span className="text-sm capitalize text-gray-700">{opt.replace(/-/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
              {["Housing", "Food", "Employment", "Healthcare", "Mental Health", "Legal Aid", "Transportation", "Childcare", "Financial Assistance"].map(type => (
                <label key={type} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" checked={form.supportTypes.includes(type)} onChange={() => toggleSupport(type)} className="accent-indigo-600" />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="555-000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input className="input" type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />
                <p className="mt-1 text-xs text-gray-400">We&apos;ll use this to follow up with you.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP code</label>
                <input className="input" value={form.zipCode} onChange={e => set("zipCode", e.target.value)} placeholder="94601" />
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

          <div className="flex justify-between mt-8">
            {step > 0
              ? <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
              : <span />
            }
            {step < STEPS.length - 1
              ? <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.firstName} className="btn-primary disabled:opacity-40">Next →</button>
              : <button onClick={submit} disabled={loading || !form.email.trim()} className="btn-primary disabled:opacity-40">{loading ? "Submitting…" : "Submit"}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
