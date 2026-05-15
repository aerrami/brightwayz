"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { session } = useAuth();

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-indigo-600">Brightwayz</span>
        <div className="flex gap-4">
          <Link href="/resources/" className="text-sm text-gray-600 hover:text-gray-900">Resources</Link>
          <Link href="/intake/" className="text-sm text-gray-600 hover:text-gray-900">Get Help</Link>
          {session
            ? <Link href="/dashboard/" className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700">Dashboard</Link>
            : <Link href="/login/" className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700">Staff Login</Link>
          }
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Community services,<br />
          <span className="text-indigo-600">simplified.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Brightwayz connects people in need with housing, food, employment, and other community resources — quickly and with dignity.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/intake/" className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-medium hover:bg-indigo-700 transition">
            Get Help Now
          </Link>
          <Link href="/resources/" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full text-lg font-medium hover:bg-gray-50 transition">
            Browse Resources
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Quick Intake", desc: "Fill out a short form and get matched with the right services in minutes.", icon: "📋" },
          { title: "Resource Directory", desc: "Search shelters, food banks, employment programs, and more near you.", icon: "🗺️" },
          { title: "Case Management", desc: "Staff can track clients, manage referrals, and coordinate care in one place.", icon: "👥" },
        ].map((f) => (
          <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
