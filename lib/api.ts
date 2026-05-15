const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

// ── Public ────────────────────────────────────────────────────────────────────

export const api = {
  // Resources
  searchResources: (params: Record<string, string>) =>
    request(`/auth/resources?${new URLSearchParams(params)}`),
  getResource: (id: string) => request(`/auth/resources/${id}`),

  // Referrals
  getReferralByToken: (token: string) => request(`/auth/referral/${token}`),
  acceptReferralByToken: (token: string) =>
    request(`/auth/accept-referral/${token}`, { method: "POST" }),
  declineReferralByToken: (token: string) =>
    request(`/auth/decline-referral/${token}`, { method: "POST" }),

  // Chatbot intake
  chatbotIntake: (body: Record<string, unknown>) =>
    request("/auth/chatbot-intake", { method: "POST", body: JSON.stringify(body) }),

  // ── Authenticated ──────────────────────────────────────────────────────────

  // Dashboard
  getDashboard: (orgId: string, token: string) =>
    request(`/data/dashboard/${orgId}`, {}, token),

  // Clients
  listClients: (params: Record<string, string>, token: string) =>
    request(`/data/clients?${new URLSearchParams(params)}`, {}, token),
  getClient: (id: string, token: string) =>
    request(`/data/client/${id}`, {}, token),
  createClient: (body: Record<string, unknown>, token: string) =>
    request("/data/create-client", { method: "POST", body: JSON.stringify(body) }, token),
  updateClient: (id: string, body: Record<string, unknown>, token: string) =>
    request(`/data/update-client/${id}`, { method: "POST", body: JSON.stringify(body) }, token),
  getClientIntakes: (id: string, token: string) =>
    request(`/data/client/${id}/intakes`, {}, token),
  getClientReferrals: (id: string, token: string) =>
    request(`/data/clients/${id}/referrals`, {}, token),

  // Intake
  createIntake: (body: Record<string, unknown>, token: string) =>
    request("/data/intake", { method: "POST", body: JSON.stringify(body) }, token),
  getIntake: (id: string, token: string) =>
    request(`/data/intake/${id}`, {}, token),
  updateIntake: (id: string, body: Record<string, unknown>, token: string) =>
    request(`/data/update-intake/${id}`, { method: "POST", body: JSON.stringify(body) }, token),
  completeIntake: (id: string, body: Record<string, unknown>, token: string) =>
    request(`/data/complete-intake/${id}`, { method: "POST", body: JSON.stringify(body) }, token),

  // Referrals
  createReferral: (body: Record<string, unknown>, token: string) =>
    request("/data/create-referral", { method: "POST", body: JSON.stringify(body) }, token),
  deleteReferral: (id: string, token: string) =>
    request(`/data/delete-referral/${id}`, { method: "POST" }, token),

  // Resources (staff)
  listOrgResources: (orgId: string, token: string) =>
    request(`/data/resources/${orgId}`, {}, token),
  createResource: (body: Record<string, unknown>, token: string) =>
    request("/data/resources", { method: "POST", body: JSON.stringify(body) }, token),
  updateResource: (id: string, body: Record<string, unknown>, token: string) =>
    request(`/data/resources/${id}`, { method: "POST", body: JSON.stringify(body) }, token),
  deleteResource: (id: string, token: string) =>
    request(`/data/resources/${id}`, { method: "DELETE" }, token),

  // Orgs
  getOrg: (id: string, token: string) =>
    request(`/data/organization/${id}`, {}, token),
  updateOrg: (id: string, body: Record<string, unknown>, token: string) =>
    request(`/data/update-org/${id}`, { method: "POST", body: JSON.stringify(body) }, token),
  getOrgMembers: (id: string, token: string) =>
    request(`/data/org-members/${id}`, {}, token),

  // User
  getCurrentUser: (token: string) => request("/data/user", {}, token),

  // Messaging (staff side)
  listClientMessages: (clientId: string, orgId: string, token: string) =>
    request(`/data/people/chat/messages/${clientId}?org_id=${orgId}`, {}, token),
  sendStaffMessage: (body: { clientId: string; orgId: string; body: string }, token: string) =>
    request("/data/people/chat/messages", { method: "POST", body: JSON.stringify(body) }, token),
  markClientMessagesRead: (clientId: string, token: string) =>
    request("/data/people/chat/unread", { method: "POST", body: JSON.stringify({ clientId }) }, token),
};
