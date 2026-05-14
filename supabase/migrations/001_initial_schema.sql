-- ─────────────────────────────────────────────────────────────────────────────
-- Brightwayz — initial schema
-- Run this in the Supabase SQL editor or via supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";

-- ── Organizations ─────────────────────────────────────────────────────────────

create table if not exists organizations (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    display_name    text,
    website         text,
    email           text,
    phone           text,
    address_line1   text,
    address_line2   text,
    city            text,
    state           text,
    postal_code     text,
    logo_url        text,
    created_at      timestamptz not null default now()
);

-- ── Users (mirrors Supabase auth.users) ──────────────────────────────────────

create table if not exists users (
    id          uuid primary key,  -- matches auth.users.id
    first_name  text,
    last_name   text,
    email       text,
    created_at  timestamptz not null default now()
);

-- ── Org Members ───────────────────────────────────────────────────────────────

create table if not exists org_members (
    id          uuid primary key default gen_random_uuid(),
    org_id      uuid not null references organizations(id) on delete cascade,
    user_id     uuid not null references users(id) on delete cascade,
    role        text not null default 'member',
    joined_at   timestamptz not null default now(),
    unique (org_id, user_id)
);

-- ── Clients ───────────────────────────────────────────────────────────────────

create table if not exists clients (
    id                  uuid primary key default gen_random_uuid(),
    org_id              uuid not null references organizations(id) on delete cascade,
    first_name          text not null,
    last_name           text not null,
    date_of_birth       text,
    gender              text,
    phone               text,
    email               text,
    language            text,
    zip_code            text,
    assigned_worker_id  uuid references users(id) on delete set null,
    created_at          timestamptz not null default now()
);

-- ── Cases ─────────────────────────────────────────────────────────────────────

create table if not exists cases (
    id          uuid primary key default gen_random_uuid(),
    client_id   uuid not null references clients(id) on delete cascade,
    org_id      uuid not null references organizations(id) on delete cascade,
    project_id  uuid,
    status      text not null default 'open',
    created_at  timestamptz not null default now()
);

-- ── Intakes / Assessments ─────────────────────────────────────────────────────

create table if not exists intakes (
    id                      uuid primary key default gen_random_uuid(),
    client_id               uuid not null references clients(id) on delete cascade,
    org_id                  uuid not null references organizations(id) on delete cascade,
    name                    text,
    age                     text,
    zip_code                text,
    employment_status       text,
    housing_status          text,
    housing_stable          boolean not null default false,
    health_medication       boolean not null default false,
    health_mental_history   boolean not null default false,
    justice_impact_time     text,
    justice_impact_status   text,
    justice_conviction_type text,
    support_types           text[] not null default '{}',
    support_urgent          text,
    support_more            text,
    phone                   text,
    email                   text,
    language                text,
    source                  text not null default 'staff',
    status                  text not null default 'in_progress',
    completed_at            timestamptz,
    created_at              timestamptz not null default now()
);

-- ── Audit Logs ────────────────────────────────────────────────────────────────

create table if not exists audit_logs (
    id          uuid primary key default gen_random_uuid(),
    org_id      uuid references organizations(id) on delete set null,
    user_id     uuid references users(id) on delete set null,
    action      text not null,
    entity_type text not null,
    entity_id   uuid,
    created_at  timestamptz not null default now()
);

-- ── Referrals ─────────────────────────────────────────────────────────────────

create table if not exists referrals (
    id                  uuid primary key default gen_random_uuid(),
    client_id           uuid not null references clients(id) on delete cascade,
    from_org_id         uuid references organizations(id) on delete set null,
    destination_org_id  uuid references organizations(id) on delete set null,
    invite_email        text,
    note                text,
    status              text not null default 'pending',
    token               text unique not null,
    expires_at          timestamptz,
    responded_at        timestamptz,
    created_at          timestamptz not null default now()
);

-- ── Invites ───────────────────────────────────────────────────────────────────

create table if not exists invites (
    id          uuid primary key default gen_random_uuid(),
    org_id      uuid not null references organizations(id) on delete cascade,
    email       text not null,
    role        text not null default 'member',
    token       text unique not null,
    status      text not null default 'pending',
    expires_at  timestamptz,
    created_at  timestamptz not null default now()
);

-- ── Resources ─────────────────────────────────────────────────────────────────

create table if not exists resources (
    id              uuid primary key default gen_random_uuid(),
    org_id          uuid references organizations(id) on delete set null,
    name            text not null,
    type            text,
    status          text not null default 'open',
    category        text,
    phone           text,
    email           text,
    address         text,
    address_line2   text,
    city            text,
    state           text,
    postal_code     text,
    hours           text,
    apply_text      text,
    hero            text,
    animals         boolean not null default false,
    serves          text[] not null default '{}',
    requirements    text[] not null default '{}',
    tags            text[] not null default '{}',
    lat             double precision,
    lng             double precision,
    created_at      timestamptz not null default now()
);

-- ── Client Events ─────────────────────────────────────────────────────────────

create table if not exists client_events (
    id                  uuid primary key default gen_random_uuid(),
    client_id           uuid not null references clients(id) on delete cascade,
    org_id              uuid not null references organizations(id) on delete cascade,
    event_name          text not null,
    event_description   text,
    date                text not null,
    location            text,
    event_url           text,
    reminders           text[] not null default '{}',
    deleted             boolean not null default false,
    created_at          timestamptz not null default now()
);

-- ── Client Files ──────────────────────────────────────────────────────────────

create table if not exists client_files (
    id          uuid primary key default gen_random_uuid(),
    client_id   uuid not null references clients(id) on delete cascade,
    org_id      uuid not null references organizations(id) on delete cascade,
    filename    text not null,
    mime_type   text,
    size_bytes  bigint,
    storage_url text,
    status      text not null default 'pending',
    created_at  timestamptz not null default now()
);

-- ── Conversations ─────────────────────────────────────────────────────────────

create table if not exists conversations (
    id          uuid primary key default gen_random_uuid(),
    org_id      uuid not null references organizations(id) on delete cascade,
    client_id   uuid not null references clients(id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (org_id, client_id)
);

-- ── Messages ──────────────────────────────────────────────────────────────────

create table if not exists messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid references conversations(id) on delete cascade,
    client_id       uuid references clients(id) on delete cascade,
    org_id          uuid references organizations(id) on delete set null,
    sender_id       uuid references users(id) on delete set null,
    body            text not null,
    read            boolean not null default false,
    created_at      timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists idx_clients_org_id         on clients(org_id);
create index if not exists idx_clients_assigned_worker on clients(assigned_worker_id);
create index if not exists idx_cases_client_id         on cases(client_id);
create index if not exists idx_intakes_client_id       on intakes(client_id);
create index if not exists idx_intakes_org_id          on intakes(org_id);
create index if not exists idx_audit_logs_org_id       on audit_logs(org_id);
create index if not exists idx_referrals_client_id     on referrals(client_id);
create index if not exists idx_referrals_token         on referrals(token);
create index if not exists idx_invites_token           on invites(token);
create index if not exists idx_invites_org_id          on invites(org_id);
create index if not exists idx_resources_org_id        on resources(org_id);
create index if not exists idx_resources_status        on resources(status);
create index if not exists idx_client_events_client_id on client_events(client_id);
create index if not exists idx_client_files_client_id  on client_files(client_id);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_client_id      on messages(client_id);
create index if not exists idx_conversations_client_id on conversations(client_id);
