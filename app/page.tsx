"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm here to help you find community services. What's going on — what kind of help are you looking for today?",
};

function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await api.aiChat(
        // Skip the local-only greeting; backend has its own system prompt
        next.filter((_, i) => !(i === 0 && next[0].role === "assistant")),
      );
      setMessages([...next, { role: "assistant", content: res.reply }]);
      if (res.intakeSubmitted && res.assessmentId) setAssessmentId(res.assessmentId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `I had trouble responding (${msg}). If this keeps happening, you can fill out the form at /intake/ instead.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-6 -mt-4 mb-16">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
            B
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Brightwayz Assistant</p>
            <p className="text-xs text-gray-400">Tell me what you need — I&apos;ll help.</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[460px] overflow-y-auto bg-gray-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-md rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
              </div>
            </div>
          ) : null}
          {assessmentId ? (
            <div className="flex justify-center pt-2">
              <div className="text-xs text-gray-400 font-mono">Reference: {assessmentId}</div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="p-3 border-t border-gray-100 flex gap-2 bg-white">
          <input
            className="input flex-1"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn-primary disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

export default function Home() {
  const { session } = useAuth();

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-indigo-600">Brightwayz</span>
        <div className="flex gap-4">
          <Link href="/resources/" className="text-sm text-gray-600 hover:text-gray-900">
            Resources
          </Link>
          <Link href="/intake/" className="text-sm text-gray-600 hover:text-gray-900">
            Get Help
          </Link>
          {session ? (
            <Link
              href="/dashboard/"
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login/"
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700"
            >
              Staff Login
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-10 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Community services,
          <br />
          <span className="text-indigo-600">simplified.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Brightwayz connects people in need with housing, food, employment, and other community
          resources — quickly and with dignity.
        </p>
      </section>

      {/* Chat */}
      <AssistantChat />

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Quick Intake",
            desc: "Fill out a short form and get matched with the right services in minutes.",
            icon: "📋",
          },
          {
            title: "Resource Directory",
            desc: "Search shelters, food banks, employment programs, and more near you.",
            icon: "🗺️",
          },
          {
            title: "Case Management",
            desc: "Staff can track clients, manage referrals, and coordinate care in one place.",
            icon: "👥",
          },
        ].map((f) => (
          <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section className="max-w-4xl mx-auto px-6 py-12 text-center">
        <p className="text-sm text-gray-500 mb-4">Prefer a form?</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/intake/"
            className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-medium hover:bg-indigo-700 transition"
          >
            Get Help Now
          </Link>
          <Link
            href="/resources/"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full text-lg font-medium hover:bg-gray-50 transition"
          >
            Browse Resources
          </Link>
        </div>
      </section>
    </main>
  );
}
