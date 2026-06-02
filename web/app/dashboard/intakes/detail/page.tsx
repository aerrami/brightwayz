"use client";
import { useEffect, useState, Suspense, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GitMerge, Pencil, Trash2, Save, X, Bold, Italic, List, ListOrdered, Heading } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
  housing_stable: boolean | null;
  employment_status: string | null;
  support_types: string[] | null;
  support_urgent: string | null;
  support_more: string | null;
  health_medication: boolean | null;
  health_mental_history: boolean | null;
  justice_impact_time: string | null;
  justice_impact_status: string | null;
  justice_conviction_type: string | null;
  internal_notes: string | null;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

const HOUSING = ["", "stable", "at-risk", "shelter", "homeless", "other"];
const EMPLOYMENT = ["", "employed", "unemployed-looking", "unemployed-not-looking", "unable-to-work"];
const LANGUAGES = ["", "en", "es", "fr", "zh", "ar"];
const SUPPORT_TYPES = [
  "Housing", "Food", "Employment", "Healthcare",
  "Mental Health", "Legal Aid", "Transportation", "Childcare", "Financial Assistance",
];

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1.5 border-b border-gray-50">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function RichTextEditor({
  content,
  onChange,
  readOnly,
}: {
  content: string;
  onChange: (html: string) => void;
  readOnly: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || "",
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-[160px] focus:outline-none prose prose-sm max-w-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content || "");
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [readOnly, editor]);

  if (!editor) return <div className="min-h-[160px] text-sm text-gray-400">Loading editor…</div>;

  return (
    <div className={`border border-gray-200 rounded-lg ${readOnly ? "bg-gray-50" : "bg-white"}`}>
      {!readOnly ? (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive("bold") ? "bg-gray-200" : ""}`} title="Bold">
            <Bold size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive("italic") ? "bg-gray-200" : ""}`} title="Italic">
            <Italic size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive("heading", { level: 3 }) ? "bg-gray-200" : ""}`} title="Heading">
            <Heading size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive("bulletList") ? "bg-gray-200" : ""}`} title="Bulleted list">
            <List size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive("orderedList") ? "bg-gray-200" : ""}`} title="Numbered list">
            <ListOrdered size={14} />
          </button>
        </div>
      ) : null}
      <div className="p-3">
        <EditorContent editor={editor} />
        {readOnly && !content ? (
          <p className="text-sm text-gray-400">No internal notes yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function defaultReferralNote(intake: Intake): string {
  const name = intake.client
    ? `${intake.client.first_name} ${intake.client.last_name}`
    : "Client";
  const lines = [
    `Referral from intake submitted ${new Date(intake.created_at).toLocaleDateString()}.`,
    "",
    `${name} is seeking support with: ${(intake.support_types ?? []).join(", ") || "(unspecified)"}.`,
  ];
  if (intake.support_urgent) lines.push(`Urgency: ${intake.support_urgent}.`);
  if (intake.housing_status) lines.push(`Housing status: ${intake.housing_status}.`);
  if (intake.employment_status) lines.push(`Employment: ${intake.employment_status}.`);
  if (intake.zip_code) lines.push(`ZIP: ${intake.zip_code}.`);
  return lines.join("\n");
}

function ConvertToReferralPanel({ intake, onClose }: { intake: Intake; onClose: () => void }) {
  const { session } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [destinationOrgId, setDestinationOrgId] = useState("");
  const [note, setNote] = useState(defaultReferralNote(intake));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!intake.client) { setError("This intake has no client attached."); return; }
    if (!inviteEmail.trim() && !destinationOrgId.trim()) { setError("Provide either an invite email or a destination organization ID."); return; }
    if (!session) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { clientId: intake.client.id, note: note.trim() || undefined };
      if (inviteEmail.trim()) body.inviteEmail = inviteEmail.trim();
      if (destinationOrgId.trim()) body.destinationOrgId = destinationOrgId.trim();
      const res = await api.createReferral(body, session.access_token);
      setCreatedId(res.id ?? res.referralId ?? "(unknown)");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdId) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-green-800 mb-1">Referral created</p>
          <p className="text-sm text-green-700">Reference <span className="font-mono">{createdId}</span></p>
        </div>
        <button onClick={onClose} aria-label="Dismiss" className="text-green-600 hover:text-green-800"><X size={16} /></button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Convert to referral</h2>
        <button type="button" onClick={onClose} aria-label="Cancel" className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invite by email</label>
          <input type="email" className="input w-full" placeholder="partner@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={submitting} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Or destination org ID</label>
          <input className="input w-full" placeholder="(optional)" value={destinationOrgId} onChange={(e) => setDestinationOrgId(e.target.value)} disabled={submitting} />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea className="input w-full font-sans" rows={6} value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
      </div>
      {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2 mb-3">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={submitting} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-40">{submitting ? "Creating…" : "Create referral"}</button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

type Draft = {
  zipCode: string;
  language: string;
  age: string;
  phone: string;
  email: string;
  housingStatus: string;
  employmentStatus: string;
  supportTypes: string[];
  supportUrgent: string;
  supportMore: string;
  internalNotes: string;
};

function intakeToDraft(i: Intake): Draft {
  return {
    zipCode: i.zip_code ?? "",
    language: i.language ?? "",
    age: i.age ?? "",
    phone: i.phone ?? "",
    email: i.email ?? "",
    housingStatus: i.housing_status ?? "",
    employmentStatus: i.employment_status ?? "",
    supportTypes: i.support_types ?? [],
    supportUrgent: i.support_urgent ?? "",
    supportMore: i.support_more ?? "",
    internalNotes: i.internal_notes ?? "",
  };
}

function IntakeDetailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  const { session } = useAuth();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || !id) return;
    api.getIntake(id, session.access_token)
      .then((r: Intake) => setIntake(r))
      .catch(() => setIntake(null))
      .finally(() => setLoading(false));
  }, [id, session]);

  function startEdit() {
    if (!intake) return;
    setDraft(intakeToDraft(intake));
    setEditing(true);
    setError("");
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setError("");
  }

  async function save() {
    if (!draft || !session || !intake) return;
    setSaving(true);
    setError("");
    try {
      await api.updateIntake(intake.id, draft, session.access_token);
      const fresh: Intake = await api.getIntake(intake.id, session.access_token);
      setIntake(fresh);
      setEditing(false);
      setDraft(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!session || !intake) return;
    setDeleting(true);
    try {
      await api.deleteIntake(intake.id, session.access_token);
      router.push("/dashboard/intakes/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function toggleSupport(t: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      supportTypes: draft.supportTypes.includes(t)
        ? draft.supportTypes.filter((x) => x !== t)
        : [...draft.supportTypes, t],
    });
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!intake) return <div className="p-8 text-gray-500">Intake not found.</div>;

  const supportTypes = editing && draft ? draft.supportTypes : intake.support_types ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/dashboard/intakes/" className="text-sm text-indigo-600 hover:underline mb-4 block">← Intakes</Link>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {intake.client ? (
              <Link href={`/dashboard/clients/detail/?id=${intake.client.id}`} className="hover:underline">
                {intake.client.first_name} {intake.client.last_name}
              </Link>
            ) : "Unknown client"}
          </h1>
          <p className="text-sm text-gray-400 font-mono mt-1">{intake.id}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {intake.support_urgent ? <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">urgent</span> : null}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${intake.status === "completed" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>{intake.status}</span>
          <span className="text-xs text-gray-400 capitalize">via {intake.source ?? "—"}</span>
        </div>
      </div>

      {!editing && !converting ? (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setConverting(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <GitMerge size={14} /> Convert to Referral
          </button>
          <button onClick={startEdit} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => setConfirmDelete(true)} className="text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1.5">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      ) : null}

      {converting ? <ConvertToReferralPanel intake={intake} onClose={() => setConverting(false)} /> : null}

      {editing ? (
        <div className="flex gap-2 mb-6 sticky top-0 bg-gray-50/95 backdrop-blur py-2 z-10">
          <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-40">
            <Save size={14} /> {saving ? "Saving…" : "Save changes"}
          </button>
          <button onClick={cancelEdit} disabled={saving} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-red-800 mb-2">Delete this intake?</p>
          <p className="text-sm text-red-700 mb-3">This permanently removes intake <span className="font-mono">{intake.id.slice(0, 8)}…</span>. The client record stays. This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={doDelete} disabled={deleting} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-40 flex items-center gap-1.5">
              <Trash2 size={14} /> {deleting ? "Deleting…" : "Yes, delete permanently"}
            </button>
            <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5">Cancel</button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-3 mb-4">{error}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Submission">
          <Field label="Submitted" value={new Date(intake.created_at).toLocaleString()} />
          <Field label="Completed" value={intake.completed_at ? new Date(intake.completed_at).toLocaleString() : null} />
          <Field label="Source" value={intake.source} />
        </Section>

        <Section title="Contact">
          {editing && draft ? (
            <>
              <InputRow label="Phone"><input className="input w-full" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></InputRow>
              <InputRow label="Email"><input type="email" className="input w-full" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></InputRow>
              <InputRow label="ZIP"><input className="input w-full" value={draft.zipCode} onChange={(e) => setDraft({ ...draft, zipCode: e.target.value })} /></InputRow>
              <InputRow label="Language"><select className="input w-full" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })}>{LANGUAGES.map((l) => <option key={l} value={l}>{l || "—"}</option>)}</select></InputRow>
              <InputRow label="Age"><input className="input w-full" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} /></InputRow>
            </>
          ) : (
            <>
              <Field label="Phone" value={intake.phone ?? intake.client?.phone ?? null} />
              <Field label="Email" value={intake.email ?? intake.client?.email ?? null} />
              <Field label="ZIP" value={intake.zip_code} />
              <Field label="Language" value={intake.language} />
              <Field label="Age" value={intake.age} />
            </>
          )}
        </Section>

        <Section title="Housing & Employment">
          {editing && draft ? (
            <>
              <InputRow label="Housing status"><select className="input w-full" value={draft.housingStatus} onChange={(e) => setDraft({ ...draft, housingStatus: e.target.value })}>{HOUSING.map((h) => <option key={h} value={h}>{h || "—"}</option>)}</select></InputRow>
              <InputRow label="Employment status"><select className="input w-full" value={draft.employmentStatus} onChange={(e) => setDraft({ ...draft, employmentStatus: e.target.value })}>{EMPLOYMENT.map((e2) => <option key={e2} value={e2}>{e2 || "—"}</option>)}</select></InputRow>
            </>
          ) : (
            <>
              <Field label="Housing status" value={intake.housing_status} />
              <Field label="Employment status" value={intake.employment_status} />
            </>
          )}
        </Section>

        <Section title="Support Needs">
          {editing && draft ? (
            <>
              <InputRow label="Types">
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {SUPPORT_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={draft.supportTypes.includes(t)} onChange={() => toggleSupport(t)} className="accent-indigo-600" />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </InputRow>
              <InputRow label="Urgency (e.g. tonight, this week)"><input className="input w-full" value={draft.supportUrgent} onChange={(e) => setDraft({ ...draft, supportUrgent: e.target.value })} /></InputRow>
              <InputRow label="Additional context"><textarea className="input w-full font-sans" rows={3} value={draft.supportMore} onChange={(e) => setDraft({ ...draft, supportMore: e.target.value })} /></InputRow>
            </>
          ) : (
            <>
              {supportTypes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {supportTypes.map((t) => <span key={t} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
              ) : null}
              <Field label="Urgency" value={intake.support_urgent} />
              {intake.support_more ? <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-3 whitespace-pre-wrap">{intake.support_more}</div> : null}
            </>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Internal Notes (case worker only)">
          <RichTextEditor
            content={editing && draft ? draft.internalNotes : intake.internal_notes ?? ""}
            onChange={(html) => { if (editing && draft) setDraft({ ...draft, internalNotes: html }); }}
            readOnly={!editing}
          />
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
