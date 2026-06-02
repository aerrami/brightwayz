"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function ReferralContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [referral, setReferral] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "done">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(token ? "" : "No referral token provided.");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getReferralByToken(token)
      .then(r => { setReferral(r); setStatus("ready"); })
      .catch(e => { setMessage(e.message); setStatus("error"); });
  }, [token]);

  async function respond(action: "accept" | "decline") {
    setActing(true);
    try {
      if (action === "accept") await api.acceptReferralByToken(token);
      else await api.declineReferralByToken(token);
      setMessage(action === "accept" ? "You have accepted the referral." : "You have declined the referral.");
      setStatus("done");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full">
      <Link href="/" className="text-indigo-600 font-bold text-lg block mb-6">Brightwayz</Link>

      {status === "loading" && <p className="text-gray-400">Loading referral…</p>}

      {status === "error" && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Referral Not Found</h2>
          <p className="text-gray-500 text-sm">{message}</p>
        </>
      )}

      {status === "ready" && referral && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-1">You have a referral</h2>
          <p className="text-sm text-gray-500 mb-4">from <strong>{(referral.from_org_id as string) ?? "an organisation"}</strong></p>
          {referral.note ? (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 mb-6 italic">
              &ldquo;{referral.note as string}&rdquo;
            </div>
          ) : null}
          <div className="flex gap-3">
            <button onClick={() => respond("accept")} disabled={acting} className="flex-1 btn-primary">
              {acting ? "…" : "Accept"}
            </button>
            <button onClick={() => respond("decline")} disabled={acting}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
              {acting ? "…" : "Decline"}
            </button>
          </div>
        </>
      )}

      {status === "done" && (
        <>
          <div className="text-4xl mb-4">{message.includes("accepted") ? "✅" : "❌"}</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Done</h2>
          <p className="text-gray-500 text-sm">{message}</p>
        </>
      )}
    </div>
  );
}

export default function ReferralPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
        <ReferralContent />
      </Suspense>
    </div>
  );
}
