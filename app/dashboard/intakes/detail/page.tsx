"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type Intake = {
  id: string;
  status: string;
  source: string | null;
  created_at: string;
  completed_at: string | null;
  language: string | null;
  age: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  housing_status: string | null;
  housing_stable: string | null;
  employment_status: string | null;
  support_types: string[] | null;
  support_urgent: string | null;
  support_more: string | null;
  health_medication: string | null;
  health_mental_history: string | null;
  justice_impact_time: string | null;
  justice_impact_status: string | null;
  justice_conviction_type: string | null;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const filtered = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(filtered) && filtered.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function IntakeDetailContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { session } = useAuth();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !id) return;
    api
      .getIntake(id, session.access_token)
      .then((r: Intake) => setIntake(r))
      .catch(() => setIntake(null))
      .finally(() => setLoading(false));
  }, [id, session]);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!intake) return <div className="p-8 text-gray-500">Intake not found.</div>;

  const supportTypes = intake.support_types ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href="/dashboard/intakes/"
        className="text-sm text-indigo-600 hover:underline mb-4 block"
      >
        ← Intakes
      </Link>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {intake.client ? (
              <Link
                href={`/dashboard/clients/detail/?id=${intake.client.id}`}
                className="hover:underline"
              >
                {intake.client.first_name} {intake.client.last_name}
              </Link>
            ) : (
              "Unknown client"
            )}
          </h1>
          <p className="text-sm text-gray-400 font-mono mt-1">{intake.id}</p>
        </div>
        <div className="flex items-center gap-3">
          {intake.support_urgent ? (
            <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
              urgent
            </span>
          ) : null}
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              intake.status === "completed"
                ? "bg-green-50 text-green-600"
                : "bg-yellow-50 text-yellow-600"
            }`}
          >
            {intake.status}
          </span>
          <span className="text-xs text-gray-400 capitalize">via {intake.source ?? "—"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Submission">
          <Field label="Submitted" value={new Date(intake.created_at).toLocaleString()} />
          <Field
            label="Completed"
            value={intake.completed_at ? new Date(intake.completed_at).toLocaleString() : null}
          />
          <Field label="Source" value={intake.source} />
        </Section>

        <Section title="Contact">
          <Field label="Phone" value={intake.phone ?? intake.client?.phone ?? null} />
          <Field label="Email" value={intake.email ?? intake.client?.email ?? null} />
          <Field label="ZIP" value={intake.zip_code} />
          <Field label="Language" value={intake.language} />
          <Field label="Age" value={intake.age} />
        </Section>

        <Section title="Housing & Employment">
          <Field label="Housing status" value={intake.housing_status} />
          <Field label="Housing stable?" value={intake.housing_stable} />
          <Field label="Employment status" value={intake.employment_status} />
        </Section>

        <Section title="Support Needs">
          {supportTypes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {supportTypes.map((t) => (
                <span
                  key={t}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <Field label="Urgency" value={intake.support_urgent} />
          {intake.support_more ? (
            <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-3 whitespace-pre-wrap">
              {intake.support_more}
            </div>
          ) : null}
        </Section>

        <Section title="Health">
          <Field label="Medication needs" value={intake.health_medication} />
          <Field label="Mental health history" value={intake.health_mental_history} />
        </Section>

        <Section title="Justice Involvement">
          <Field label="Time since impact" value={intake.justice_impact_time} />
          <Field label="Status" value={intake.justice_impact_status} />
          <Field label="Conviction type" value={intake.justice_conviction_type} />
        </Section>
      </div>
    </div>
  );
}

export default function IntakeDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading…</div>}>
      <IntakeDetailContent />
    </Suspense>
  );
}
