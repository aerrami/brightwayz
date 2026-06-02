---
marp: true
theme: default
paginate: true
header: 'Brightwayz · Building Together'
---

<style>
section {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  padding: 40px 60px;
  font-size: 22px;
  line-height: 1.4;
}
h1 { color: #4f46e5; font-size: 1.9em; margin: 0 0 0.4em 0; }
h2 { color: #1f2937; font-size: 1.4em; margin: 0 0 0.4em 0; }
h3 { font-size: 1.05em; margin: 0 0 0.3em 0; }
p, ul, ol { margin: 0.4em 0; }
ul { line-height: 1.45; padding-left: 1.1em; }
li { margin: 0.15em 0; }
blockquote { margin: 0.6em 0; font-size: 0.95em; }
strong { color: #4f46e5; }
.muted { color: #6b7280; font-size: 0.8em; }
.kicker { color: #4f46e5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7em; margin-bottom: 0.5em; }
</style>

<!-- ==================================================================== -->

<div class="kicker">Brightwayz · Demo + Volunteer Pitch</div>

# Building a community-services platform — with AI as a teammate

A live look at what we shipped, **how we shipped it**, and how you can help.

<br>

`brightwayz` · connecting people with housing, food, employment, healthcare, and legal aid

<!--
TIMING: 60 sec

OPENING (warm + confident):
"Thanks for being here. This is a 15-minute walk through a project that
proves a small group of people — many of them non-coders — can ship
real production software now, with AI as a teammate. I'm going to show
you what we built, how, and where you fit in."

NOTES:
- Don't say "vibe coding" yet — let it land in slide 4
- Mix of technical + non-technical in the room: keep eye contact split
- If the demo URL is live, mention "you can pull this up on your phone right now"
-->

---

## Why we're building this

Community-service orgs spend hours on intake forms, follow-ups, referrals — work that's repetitive but high-stakes.

**Brightwayz cuts the friction:**

- People in need talk to an **AI assistant** (in English / Spanish / French / Chinese / Arabic), describe their situation, get matched.
- Case managers see every request in **one dashboard**: filter by need, status, ZIP, date.
- Status changes auto-notify the client — **email + SMS + WhatsApp** — so nobody's left wondering.

A free, accessible front door to social services. Built for and with the orgs that use it.

<!--
TIMING: 90 sec

KEY POINTS:
1. Frame the pain first — "intake hell" resonates with anyone who's
   ever volunteered at a food bank, free clinic, or housing nonprofit.
2. Three concrete benefits, one per audience role.
3. Land on "built for and with" — this signals that we want their
   input, which is the recruiting hook.

ANALOGY (if non-tech audience):
"Think of it like the difference between filling out 8 PDFs and texting
a friend who already knows what to ask."

DO NOT:
- List every feature here. That's the next slide.
- Mention competitors. Stay focused on the work.
-->

---

## What we've shipped (so far)

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">

<div>

**For people seeking help**
- AI chatbot on the homepage
- Multi-step intake form
- Public resource directory
- Referral acceptance flow (token-based)
- Mobile-first, multi-language

</div>

<div>

**For case managers**
- Dashboard: clients · intakes · referrals · cases
- Search & filter (name, ZIP, date, status)
- CRM lifecycle: open → assigned → in-progress → resolved → closed
- Status changes → **auto email + SMS** to client
- One-click WhatsApp / SMS to any client
- Rich-text internal notes (case-worker only)
- Convert intake → referral with one click

</div>

</div>

<!--
TIMING: 2 min (this is where the live demo happens)

LIVE DEMO:
Open two browser windows on the projector:
1. Phone or laptop on the public landing page (the AI chatbot)
2. Dashboard logged in as a case worker

WALK THROUGH:
- "I'm a person needing housing help" → say one sentence to the AI
  chatbot. Watch it ask for the right follow-up info.
- Switch to dashboard → "and here it is, in real time."
- Click into the new intake → show the case status dropdown → flip it
  to 'assigned' → "watch — the client just got an email saying a case
  manager is on it. And an SMS, and a WhatsApp."

IF DEMO BREAKS:
- That's fine — say "this is software, software breaks." 
- Pivot to screenshots if you've got them prepped.
- Don't try to debug live; it eats time and audience attention.

IF DEMO GOES LONG:
- Cut the SMS / WhatsApp demo (the email one alone makes the point).
-->

---

## How we built it: "vibe coding" with **Claude Code**

> *Vibe coding* = describe the outcome, let AI do the typing.
> You review, course-correct, and own the direction.

<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 28px; align-items: start;">

<div>

**A real exchange from this project:**

> **Human:** add a whatsapp button same as text message
>
> **Claude Code:** *(reads existing SMS code, adds Twilio WhatsApp wrapper, new endpoint, frontend button + panel, runs tests, opens PR)*

Ten minutes later: green button on the dashboard, real WhatsApp delivered to a phone.

</div>

<div class="muted">

⚡ **What changed**<br><br>
The bottleneck stopped being typing code. It became **knowing what to ask for** — design, UX, prioritization.

</div>

</div>

<!--
TIMING: 2 min

DEFINE FIRST: pause and say the term out loud.
"Vibe coding is a term coined by Andrej Karpathy earlier this year. The
idea is: you describe the vibe of what you want, and the AI handles
the typing. Your job becomes *direction*, not *production*."

THEN: the WhatsApp story.
- Six words → working feature, end to end.
- Mention this is REAL — not staged, not a demo project. Real Twilio
  account, real WhatsApp message, real production deploy at the time.

PUNCHLINE — say it slowly:
"The bottleneck stopped being typing code. It became knowing what to
ask for."

TIE TO AUDIENCE:
- Tech folks: "Your code-review skills matter more than ever."
- Non-tech: "If you can describe what you want clearly, you can ship."

OPTIONAL LIVE BIT:
If you have a laptop with Claude Code running, open a new terminal
and run a tiny request live. Example: ask it to add a confirmation
modal to one button. Watch it write the code in front of the audience.
RISKY but high impact if it works.
-->

---

## Agentic AI — beyond chat

Most AI today *answers*. Agentic AI **acts**.

In this project, the AI:
- Read existing code to match conventions ✅
- Edited multiple files in one go ✅
- Ran `npm`, `pip`, `pytest`, `git`, `aws`, `curl` ✅
- Deployed to AWS (ECS, ALB, CloudFront, Secrets Manager) ✅
- Diagnosed real bugs (JWT signing algorithm mismatch, DNS misconfig) ✅
- Rotated leaked credentials ✅
- Wrote SQL migrations, applied them, verified data ✅

A single human + an agent → a small engineering team. Without the meetings.

<!--
TIMING: 2 min

CONTRAST CLEARLY:
"ChatGPT answers questions. An agent does the work."

POINT TO THE LIST:
"Every check mark here is a real thing that happened on this project.
Not in a sandbox — on actual AWS infrastructure with real credentials."

WAR STORY (pick one):
1. JWT mismatch — Supabase migrated to ES256 partway through, every
   login broke, agent diagnosed and fixed it in 10 minutes.
2. Leaked AWS keys — agent spotted them in a config file, rotated
   them, and updated GitHub secrets and the live ECS task — without
   downtime.
3. DNS — agent traced why www.wedkai.com worked but apex didn't, all
   the way to GoDaddy forwarding settings.

These are the kinds of multi-step incidents that used to need an
on-call engineer + a meeting. Now: one prompt, one human watching.

DON'T:
- Oversell. The human still needed to confirm sensitive steps.
- The point is "force multiplier," not "replaces humans."
-->

---

## What's under the hood

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">

<div>

**Web**
- Next.js 16 (App Router, static export)
- Tailwind CSS · Tiptap rich text
- Supabase Auth (JWT ES256)

**API**
- FastAPI + Pydantic
- Supabase Postgres
- Anthropic Claude (intake assistant)
- Twilio (SMS / WhatsApp)
- Resend (email)

</div>

<div>

**Infra (when live)**
- AWS ECS Fargate · ALB
- CloudFront + S3 (static web)
- Secrets Manager
- GitHub Actions CI/CD

**Dev**
- Local-first: `npm run dev` + `uvicorn`
- venv for isolation
- Branches per feature, easy to revert

</div>

</div>

<div class="muted">Every integration above was wired up by Claude Code, including the gnarly bits (DNS, IAM, secrets rotation).</div>

<!--
TIMING: 60 sec — this is a "skim" slide

ASK FIRST: "Quick show of hands — who's a developer?"

IF MOSTLY DEVS:
Spend more time. Mention you can swap any layer (e.g. Resend → SES,
Supabase → self-hosted Postgres) and the AI handles the refactor.

IF MOSTLY NON-DEVS:
"You don't need to know any of these names. I'm showing you the stack
just so you know there's nothing exotic here — these are standard
tools. Anyone with a few months of practice could maintain this."

PUNCH:
"What's interesting isn't the stack. It's that we shipped this whole
stack with the AI as the integration engineer."
-->

---

## How **you** can help — non-technical

You don't need to write code to make this better.

- **Try it.** Submit a fake intake. Tell us what was confusing.
- **Translate.** Are the AI's prompts kind / clear in your language? Help us tune them.
- **Pilot it.** Run an intake or two for your org and tell us what's missing.
- **Design.** The landing page, the email templates, the SMS phrasing — these need a human touch.
- **Write.** Resource directory entries, FAQ, how-to guides for case managers.
- **Talk to people.** Spread the word to orgs and to people who need help.

> The features above were prioritized by *someone like you* telling the team what mattered.

<!--
TIMING: 90 sec

POSTURE: lean in. This is the recruiting moment for half your audience.

EMPHASIZE:
"You don't need to write code." Repeat it. Many people in the room
will be quietly thinking they're not technical enough to contribute.

CONCRETE ASKS:
Pick ONE bullet and go deep, rather than skimming all six. The
"translate" bullet is great if the room is diverse linguistically.
The "pilot it" bullet is great if there are nonprofit folks present.

CALL OUT NAMES IF YOU CAN:
"Sara, you mentioned you run intake at [Org] — that 'pilot it' bullet
is literally aimed at you."

THE LAST LINE IS THE PUNCHLINE:
"The features above were prioritized by someone like you telling the
team what mattered." Pause. Let it sit.
-->

---

## How **you** can help — technical

If you code (or want to learn), Claude Code makes this exceptionally low-friction to contribute.

- **Pick a feature** from the roadmap below, branch it, ship it.
  - File uploads (S3 task-role auth, currently stubbed)
  - Audit log view (table already collects entries)
  - Dashboard analytics (intake counts, response times)
  - SMS opt-out + STOP-keyword handling
  - Per-org branding
- **Bring your own AI.** Claude Code, Cursor, whatever — the codebase reads cleanly for any agent.
- **No prior repo knowledge needed.** Open the repo in your editor, type a request to your AI: *"Add an X to Y."* Read what it writes. Send a PR.

<!--
TIMING: 90 sec

POSTURE: this is the recruiting moment for the OTHER half of the audience.

THE 5 ROADMAP ITEMS:
Don't read them all out. Mention 2-3 you find most interesting.
The bullets are there for the slide deck PDF that lives on after.

REASSURE NEW CONTRIBUTORS:
"If you've never contributed to an open-source project, this is a
gentle entry point. Pick a small thing. Type one sentence to your AI.
Read what it produces. Send a PR. We'll review it kindly."

REASSURE EXPERIENCED ENGINEERS:
"If you're a senior eng wondering 'is this codebase a mess' — the
quality bar in here is set by Pydantic + TypeScript types + pytest +
ESLint. You'll feel at home."

OFFER PAIR PROGRAMMING:
"If you want to ship something together, I'll pair with you live for
an hour. Just DM me."
-->

---

## What this demo just proved

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px;">

<div>

**Most of what you saw was built in conversations.**

- 4 feature branches, all merged
- 20+ committed features
- 3 messaging providers integrated end-to-end
- 1 full AWS deploy + teardown
- A migration, a bug fix, and a UX iteration in the time it took to drink a coffee

</div>

<div>

**The hard parts shifted:**

- ~~Typing boilerplate~~ → asking the right question
- ~~"How do I configure Twilio"~~ → "what should the trial-vs-prod path look like"
- ~~Spinning up infra~~ → deciding what's worth deploying

The remaining hard parts are **judgment, taste, and care** — exactly the things humans should own.

</div>

</div>

<!--
TIMING: 60 sec

POSTURE: this is the takeaway slide. Slow down.

NUMBERS LAND BETTER WHEN SPOKEN, NOT READ:
Don't say "twenty plus committed features." Say "we shipped more than
twenty features. And that's just what's on this branch."

THE STRIKETHROUGH LIST:
Read each item aloud. The "before → after" cadence is the rhetorical
trick that makes the point stick.

LAST LINE — say slowly, look up from notes:
"The remaining hard parts are judgment, taste, and care — exactly the
things humans should own."

This is your money line. Pause. Move on.
-->

---

## Get involved

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: center;">

<div>

**Today**
- Try the demo · *insert URL*
- Star / fork the repo · *github.com/aerrami/brightwayz-{api,web}*
- Join our Slack / Discord · *insert link*

**This week**
- Pick one item from the "How you can help" lists
- DM us with your name + what you'd like to try
- We'll pair you with whoever's working on it

</div>

<div>

**Contact**

📧 *insert email*<br>
🌐 *insert site*<br>
🐙 *github org / handle*<br><br>

<br>

**Thank you 💛**

Building public-good software, faster — together.

</div>

</div>

<!--
TIMING: 90 sec + Q&A

LEAVE THIS SLIDE UP through Q&A — people will photograph it.

OFFER TO LINGER:
"I'll be in the [room / corner / coffee area] for the next 20 minutes.
Come find me if you want to chat about anything you saw today."

ASK A QUESTION BACK:
"Before we close — what's one feature you'd add tomorrow if you had
the time and tools? Just shout it out."
This often surfaces your next 2-3 best contributors.

PRACTICAL NEXT STEPS:
- If you're collecting signups, have a QR code or Google Form ready.
- Print 5-10 paper copies of the contact info for people who don't
  photograph slides.
- Mention any in-person follow-up: "I'm hosting an intro-to-Claude-Code
  workshop next Saturday."
-->
