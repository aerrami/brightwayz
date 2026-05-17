"""
app/models/schemas.py — all Pydantic request / response models.

Organised by domain: clients, intakes, referrals, resources,
organisations, events, files, messaging, auth.
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Clients ───────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    firstName: str
    lastName: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    language: Optional[str] = None
    zipCode: Optional[str] = None
    orgId: str


class ClientUpdate(ClientCreate):
    orgId: str


class ClientWorkerUpdate(BaseModel):
    case_worker_id: str
    org_id: str
    client_id: str


class ClientResponse(BaseModel):
    client: dict[str, Any]


# ── Intakes / Assessments ─────────────────────────────────────────────────────

class IntakeCreate(BaseModel):
    """Matches IntakeForm.js handleNewClient payload."""
    firstName: str
    lastName: str
    clientDob: Optional[str] = None
    orgId: str
    projectId: Optional[str] = None
    caseId: Optional[str] = None


class IntakeCreateResponse(BaseModel):
    clientId: str
    caseId: str
    assessmentId: str


class AssessmentUpdate(BaseModel):
    """Full assessment body — used by update-intake and complete-intake."""
    name: Optional[str] = None
    age: Optional[str] = None
    zipCode: Optional[str] = None
    employmentStatus: Optional[str] = None
    housingStatus: Optional[str] = None
    housingStableStatus: bool = False
    healthMedicationStatus: bool = False
    healthMentalHistory: bool = False
    justiceImpactTime: Optional[str] = None
    justiceImpactStatus: Optional[str] = None
    justiceImpactConvictionType: Optional[str] = None
    supportTypes: list[str] = Field(default_factory=list)
    supportUrgent: Optional[str] = None
    supportMore: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    language: Optional[str] = None
    source: Optional[str] = None


# ── Chatbot public intake ─────────────────────────────────────────────────────

class ChatbotIntake(BaseModel):
    firstName: str
    lastName: str = ""
    phone: Optional[str] = None
    email: Optional[str] = None
    zipCode: Optional[str] = None
    language: str = "en"
    supportTypes: list[str] = Field(default_factory=list)
    supportUrgent: Optional[str] = None
    housingStatus: Optional[str] = None
    employmentStatus: Optional[str] = None
    orgId: Optional[str] = None


class ChatbotIntakeResponse(BaseModel):
    success: bool
    assessmentId: str
    message: str


class AIChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    messages: list[AIChatMessage]


class AIChatResponse(BaseModel):
    reply: str
    intakeSubmitted: bool = False
    assessmentId: Optional[str] = None


# ── Referrals ─────────────────────────────────────────────────────────────────

class ReferralCreate(BaseModel):
    clientId: str
    destinationOrgId: Optional[str] = None
    inviteEmail: Optional[str] = None
    note: Optional[str] = None


class ReferralTokenInfo(BaseModel):
    referralId: str
    clientName: str
    fromOrg: str
    note: Optional[str] = None
    status: str


# ── Resources ─────────────────────────────────────────────────────────────────

class ResourcePayload(BaseModel):
    name: str
    type: Optional[str] = None
    status: str = "open"
    category: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    hours: Optional[str] = None
    apply_text: Optional[str] = None
    hero: Optional[str] = None
    animals: bool = False
    serves: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    lat: Optional[float] = None
    lng: Optional[float] = None
    orgId: Optional[str] = None


# ── Organisations ─────────────────────────────────────────────────────────────

class OrgUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    logo_url: Optional[str] = None


# ── Invites ───────────────────────────────────────────────────────────────────

class InviteCreate(BaseModel):
    emails: list[str]
    orgId: str
    role: str = "member"


# ── Client events / calendar ──────────────────────────────────────────────────

class ClientEventCreate(BaseModel):
    client_id: str
    org_id: str
    event_name: str
    event_description: Optional[str] = None
    date: str
    location: Optional[str] = None
    event_url: Optional[str] = None
    reminders: list[str] = Field(default_factory=list)


class ClientEventUpdate(ClientEventCreate):
    pass


# ── File uploads ──────────────────────────────────────────────────────────────

class FileStartRequest(BaseModel):
    orgId: str
    filename: str
    contentType: str
    size: int


class FileStartResponse(BaseModel):
    fileId: str
    uploadUrl: str


class FileCompleteRequest(BaseModel):
    orgId: str


# ── Messaging ─────────────────────────────────────────────────────────────────

class ChatStartRequest(BaseModel):
    orgId: str


class SendMessageRequest(BaseModel):
    conversationId: str
    body: str


class StaffSendMessageRequest(BaseModel):
    clientId: str
    orgId: str
    body: str


class SendSMSRequest(BaseModel):
    clientId: str
    body: str


class SendSMSResponse(BaseModel):
    success: bool
    messageSid: str


class SendWhatsAppRequest(BaseModel):
    clientId: str
    body: str


class SendWhatsAppResponse(BaseModel):
    success: bool
    messageSid: str


class CaseStatusUpdate(BaseModel):
    status: str  # one of: open | assigned | in_progress | resolved | closed


class MarkUnreadRequest(BaseModel):
    orgId: Optional[str] = None
    clientId: Optional[str] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    org: dict[str, Any]
    stats: dict[str, Any]
    recentClients: list[dict[str, Any]]
    recentReferrals: list[dict[str, Any]]
