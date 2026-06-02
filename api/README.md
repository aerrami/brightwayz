# Brightwayz API

FastAPI backend for the Brightwayz community services platform.

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| Database | PostgreSQL via Supabase REST API |
| Auth | Supabase JWT (HS256) |
| File storage | AWS S3 (presigned URLs) |
| Deployment | AWS ECS (Fargate) via GitHub Actions |
| Tests | pytest + httpx |

---

## Project structure

```
brightwayz-api/
├── app/
│   ├── main.py              # App factory, router mounting, CORS
│   ├── core/
│   │   ├── auth.py          # JWT verification dependencies
│   │   ├── config.py        # Pydantic settings (reads .env)
│   │   └── supabase.py      # Async Supabase REST client
│   ├── models/
│   │   └── schemas.py       # All Pydantic request/response models
│   └── routers/
│       ├── intake.py        # Intake + chatbot public endpoint
│       ├── clients.py       # Client CRUD, audit logs
│       ├── referrals.py     # Referral create/accept/decline + token flow
│       ├── resources.py     # Community resource directory
│       ├── orgs.py          # Orgs, invites, team members, dashboard
│       ├── events.py        # Client calendar events
│       ├── files.py         # S3 presigned upload flow
│       └── messaging.py     # Staff↔client chat, unread counts
├── tests/
│   └── test_api.py
├── .env.example
├── .github/workflows/deploy.yml
├── Dockerfile
└── requirements.txt
```

---

## Local development

```bash
# 1. Clone and enter the repo
git clone https://github.com/your-org/brightwayz-api.git
cd brightwayz-api

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your Supabase + AWS credentials

# 5. Run the server
uvicorn app.main:app --reload --port 8000

# 6. Open interactive API docs
open http://localhost:8000/docs
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret from Supabase dashboard |
| `SUPABASE_ANON_KEY` | ✅ | Anon key (for reference) |
| `DEFAULT_ORG_ID` | ✅ | UUID of org that owns the chatbot widget |
| `ENVIRONMENT` | ✅ | `development` \| `staging` \| `production` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `AWS_ACCESS_KEY_ID` | For file uploads | AWS IAM key |
| `AWS_SECRET_ACCESS_KEY` | For file uploads | AWS IAM secret |
| `AWS_REGION` | For file uploads | e.g. `us-east-1` |
| `AWS_S3_BUCKET` | For file uploads | S3 bucket name |
| `GOOGLE_MAPS_API_KEY` | Optional | For geocoding resource addresses |

---

## API overview

### Public endpoints (`/auth/*`)
No authentication required.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/chatbot-intake` | Submit intake from public chatbot |
| GET | `/auth/referral/{token}` | Get referral info from token link |
| POST | `/auth/accept-referral/{token}` | Accept referral via link |
| POST | `/auth/decline-referral/{token}` | Decline referral via link |
| GET | `/auth/invite-info/{token}` | Get org invite details |
| GET | `/auth/resources` | Search public resource directory |
| GET | `/auth/resources/{id}` | Get a single resource |

### Authenticated endpoints (`/data/*`)
Require `Authorization: Bearer <supabase_jwt>`.

**Clients**

| Method | Path | Description |
|---|---|---|
| GET | `/data/clients` | List clients for an org |
| POST | `/data/create-client` | Create a new client |
| GET | `/data/client/{id}` | Get a single client |
| POST | `/data/update-client/{id}` | Update client fields |
| GET | `/data/client/{id}/intakes` | List client's assessments |
| GET | `/data/clients/{id}/referrals` | List client's referrals |
| POST | `/data/update-client-worker` | Assign a case worker |
| GET | `/data/clients-comms/{id}` | Get communication history |
| GET | `/data/auditlogs` | Get org audit log |

**Intake / assessments**

| Method | Path | Description |
|---|---|---|
| POST | `/data/intake` | Create client + case + blank assessment |
| GET | `/data/intake/{id}` | Fetch an assessment |
| POST | `/data/update-intake/{id}` | Auto-save draft |
| POST | `/data/complete-intake/{id}` | Finalise assessment |

**Referrals**

| Method | Path | Description |
|---|---|---|
| POST | `/data/create-referral` | Create a referral |
| POST | `/data/delete-referral/{id}` | Cancel a referral |
| POST | `/data/referrals/{id}/accept` | Accept (by staff) |
| POST | `/data/referrals/{id}/decline` | Decline (by staff) |

**Resources**

| Method | Path | Description |
|---|---|---|
| GET | `/data/resources/{orgId}` | List org's resources |
| POST | `/data/resources` | Create a resource |
| POST | `/data/resources/{id}` | Update a resource |
| DELETE | `/data/resources/{id}` | Delete a resource |

**Organisations**

| Method | Path | Description |
|---|---|---|
| GET | `/data/organizations` | List all orgs |
| GET | `/data/organization/{id}` | Get an org |
| POST | `/data/update-org/{id}` | Update org details |
| GET | `/data/org-members/{id}` | List team members |
| GET | `/data/invites` | List pending invites |
| POST | `/data/create-invite` | Send email invites |
| POST | `/data/delete-invite/{id}` | Cancel an invite |
| GET | `/data/dashboard/{id}` | Get dashboard data |
| GET | `/data/user` | Get current user |

**Events**

| Method | Path | Description |
|---|---|---|
| GET | `/data/client-event` | List events for a client |
| POST | `/data/client-event` | Create event |
| POST | `/data/update-client-event/{id}` | Update event |
| POST | `/data/delete-client-event/{id}` | Delete event |

**Files**

| Method | Path | Description |
|---|---|---|
| POST | `/data/clients/{id}/files/start` | Get presigned S3 upload URL |
| POST | `/data/clients/{id}/files/{fileId}` | Mark file as uploaded |
| GET | `/data/clients/{id}/files` | List client files |

**Messaging**

| Method | Path | Description |
|---|---|---|
| GET | `/data/people/chat/messages/{clientId}` | Staff fetches messages |
| POST | `/data/people/chat/unread` | Mark messages read (staff) |
| POST | `/data/client/chat/start` | Client starts conversation |
| GET | `/data/client/chat/messages/{orgId}` | Client fetches messages |
| POST | `/data/client/chat/messages` | Client sends a message |
| GET | `/data/client/chat/unread` | Client unread count |
| POST | `/data/client/chat/unread` | Reset client unread |

---

## Tests

```bash
pytest tests/ -v
```

Tests mock all Supabase calls — no live database needed for CI.

---

## AWS deployment

### Prerequisites
1. An ECR repository named `brightwayz-api`
2. An ECS cluster named `brightwayz-cluster`
3. An ECS service named `brightwayz-api-service`
4. A task definition named `brightwayz-api` with the container named `brightwayz-api`

### Secrets required in GitHub
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

### Environment variables in ECS task definition
Add all variables from `.env.example` as ECS secrets (from AWS Secrets Manager or Parameter Store).

### Deploy
Push to `main` — the GitHub Actions workflow handles the rest.

---

## Supabase Row Level Security (RLS)

Enable RLS on all tables. Example policies:

```sql
-- clients: org members can only see their org's clients
create policy "org members see own clients"
on clients for select
using (org_id = (select org_id from org_members where user_id = auth.uid() limit 1));

-- intakes: same pattern
create policy "org members see own intakes"
on intakes for select
using (org_id = (select org_id from org_members where user_id = auth.uid() limit 1));
```

> The service role key used by this backend bypasses RLS — keep it strictly server-side.
