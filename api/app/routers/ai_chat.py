"""
app/routers/ai_chat.py — AI-powered intake chatbot.

Public endpoint that proxies a multi-turn conversation to Claude. When the
model has gathered enough information, it calls the `submit_intake` tool;
the server intercepts the call, runs the existing chatbot-intake flow, and
feeds the resulting assessmentId back to the model so it can confirm with
the user in natural language.
"""
from __future__ import annotations

from anthropic import Anthropic, APIError
from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.models.schemas import (
    AIChatRequest,
    AIChatResponse,
    ChatbotIntake,
)
from app.routers.intake import chatbot_intake

router = APIRouter(prefix="/auth", tags=["ai-chat"])


SYSTEM_PROMPT = """\
You are Brightwayz Assistant, a warm and helpful guide for the Brightwayz community services platform. Visitors come to you because they need help — with housing, food, employment, healthcare, legal aid, or other services.

Your job is to:
1. Greet warmly and ask how you can help. Let the visitor lead with what's on their mind.
2. Listen with empathy. Don't interrogate. Mirror their language back to them.
3. Gradually collect the information needed to connect them with a case manager:
   - First name (required)
   - Last name (helpful but optional)
   - Preferred language (default: English; offer Spanish, French, Chinese, Arabic if relevant)
   - Current housing situation: stable / at-risk / shelter / homeless / other
   - Employment status: employed / unemployed-looking / unemployed-not-looking / unable-to-work
   - Types of support needed (one or more): Housing, Food, Employment, Healthcare, Mental Health, Legal Aid, Transportation, Childcare, Financial Assistance
   - **Email address (always required — a case manager will follow up here)**
   - Phone (helpful but optional)
   - ZIP code (to match local resources)

Guidelines:
- Be concise. This is chat — keep responses short, 1–3 sentences usually.
- Don't ask everything at once. Pick the next most relevant question based on what they shared.
- If they're in crisis or mention emergency danger, gently encourage 911 or local crisis lines, but continue to help.
- Don't promise specific outcomes — say "a case manager will follow up" rather than "we will house you."
- If they ask questions you can't answer about specific programs or eligibility, say so honestly and note their question for the case manager.
- Once you have first name + at least one support type + a valid email address, you have enough to submit. Phone is welcome but not required. Confirm with them first ("Want me to send this to our team now?"), then call the submit_intake tool.
- After submission, give them the reference ID and tell them what happens next (a case manager reaches out within 24 hours).
- Stay on-topic. If asked about unrelated things, redirect kindly back to how you can help.

Priority inference: when you call submit_intake, set the `priority` field based on what the visitor told you. Use your judgment, but as a guide:
- **urgent** — immediate safety/survival need: homeless tonight, no food today, fleeing violence, child at risk, medical emergency without care. Anything where waiting 24h could cause real harm.
- **high** — staying in a shelter, at risk of losing housing this month, no income with bills due, untreated serious health/mental-health issue, recent justice involvement needing reentry support.
- **low** — stable housing, employed, asking about resources for general/future planning rather than an active crisis.
- **normal** — anything in between, or when you genuinely can't tell. Default to normal rather than guessing high.
Never tell the visitor what priority you assigned — it's an internal signal for the case manager."""


SUBMIT_INTAKE_TOOL = {
    "name": "submit_intake",
    "description": (
        "Submit the visitor's intake request to be reviewed by a case manager. "
        "Call this only after the visitor has confirmed they want to send their "
        "information. firstName and email are both required; phone is optional."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "firstName": {"type": "string"},
            "lastName": {"type": "string"},
            "language": {
                "type": "string",
                "enum": ["en", "es", "fr", "zh", "ar"],
            },
            "housingStatus": {
                "type": "string",
                "enum": ["stable", "at-risk", "shelter", "homeless", "other"],
            },
            "employmentStatus": {
                "type": "string",
                "enum": [
                    "employed",
                    "unemployed-looking",
                    "unemployed-not-looking",
                    "unable-to-work",
                ],
            },
            "supportTypes": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": [
                        "Housing",
                        "Food",
                        "Employment",
                        "Healthcare",
                        "Mental Health",
                        "Legal Aid",
                        "Transportation",
                        "Childcare",
                        "Financial Assistance",
                    ],
                },
            },
            "phone": {"type": "string"},
            "email": {"type": "string"},
            "zipCode": {"type": "string"},
            "priority": {
                "type": "string",
                "enum": ["low", "normal", "high", "urgent"],
                "description": (
                    "Internal triage signal for case managers. Infer from the "
                    "conversation per the priority guide in the system prompt. "
                    "Do not mention this field to the visitor."
                ),
            },
        },
        "required": ["firstName", "email"],
    },
}


def _client() -> Anthropic:
    cfg = get_settings()
    if not cfg.anthropic_api_key:
        raise HTTPException(
            status_code=500,
            detail="AI chat is not configured (missing ANTHROPIC_API_KEY).",
        )
    return Anthropic(api_key=cfg.anthropic_api_key)


@router.post("/ai-chat", response_model=AIChatResponse)
async def ai_chat(body: AIChatRequest):
    if not body.messages or body.messages[0].role != "user":
        raise HTTPException(status_code=400, detail="First message must be from user.")

    # Anthropic expects alternating user/assistant; we trust the client to send that.
    messages: list[dict] = [
        {"role": m.role, "content": m.content} for m in body.messages
    ]

    client = _client()
    intake_submitted = False
    assessment_id: str | None = None

    # Manual agentic loop — capped at 3 iterations to bound cost on a public endpoint.
    for _ in range(3):
        try:
            response = client.messages.create(
                model="claude-opus-4-7",
                max_tokens=1024,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                tools=[SUBMIT_INTAKE_TOOL],
                messages=messages,
            )
        except APIError as exc:
            raise HTTPException(status_code=502, detail=f"AI provider error: {exc}")

        if response.stop_reason != "tool_use":
            text = next(
                (b.text for b in response.content if getattr(b, "type", None) == "text"),
                "",
            )
            return AIChatResponse(
                reply=text or "Sorry, I didn't quite catch that — could you say it again?",
                intakeSubmitted=intake_submitted,
                assessmentId=assessment_id,
            )

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            if block.name == "submit_intake":
                try:
                    result = await chatbot_intake(ChatbotIntake(**block.input))
                    intake_submitted = True
                    assessment_id = result.assessmentId
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": (
                            f"Submitted. assessmentId={result.assessmentId}. "
                            "Tell the user their request was received and that a case "
                            "manager will reach out within 24 hours. Share the reference ID."
                        ),
                    })
                except HTTPException as exc:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": f"Submission failed: {exc.detail}",
                        "is_error": True,
                    })
            else:
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": "Unknown tool.",
                    "is_error": True,
                })

        messages.append({"role": "user", "content": tool_results})

    return AIChatResponse(
        reply="Sorry, something went wrong on my end. Could you try again?",
        intakeSubmitted=intake_submitted,
        assessmentId=assessment_id,
    )
