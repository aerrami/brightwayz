-- Add internal_notes column to intakes for case-worker notes (rich text / HTML).
alter table if exists intakes
  add column if not exists internal_notes text;
