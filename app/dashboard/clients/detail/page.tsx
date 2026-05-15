"use client";
import { useEffect, useRef, useState, Suspense, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type Msg = { id: string; body: string; sender_id: string; created_at: string };

function ChatPanel({ clientId, orgId, token, meId }:
  { clientId: string; orgId: string; token: string; meId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [composing, setComposing] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMessages = () => {
      api.listClientMessages(clientId, orgId, token)
        .then((rows: Msg[]) => { if (!cancelled) setMessages([...rows].reverse()); })
        .catch(() => {});
    };
    fetchMessages();
    api.markClientMessagesRead(clientId, token).catch(() => {});
    const id = setInterval(fetchMessages, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [clientId, orgId, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = composing.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.sendStaffMessage({ clientId, orgId, body: text }, token);
      setComposing("");
      const rows: Msg[] = await api.listClientMessages(clientId, orgId, token);
      setMessages([...rows].reverse());
    } catch {
      // surface fails silently; UI shows the message stuck in compose
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 flex flex-col h-[500px]">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <MessageCircle size={16} className="text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center pt-16">No messages yet. Send the first one below.</p>
        ) : messages.map(m => {
          const isMe = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-md rounded-2xl px-4 py-2 ${isMe ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-indigo-200" : "text-gray-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-gray-100">
        <input className="input flex-1" placeholder="Type a message…" value={composing}
          onChange={e => setComposing(e.target.value)} disabled={sending} />
        <button type="submit" disabled={!composing.trim() || sending}
          className="btn-primary disabled:opacity-40 flex items-center gap-1.5">
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}

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

  const orgId = (session?.user.user_metadata?.org_id as string) ?? "";

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

      {session && orgId ? (
        <ChatPanel clientId={id} orgId={orgId} token={session.access_token} meId={session.user.id} />
      ) : null}
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
