-- Add priority/urgency column to intakes.
-- Values: low | normal | high | urgent. Default 'normal'.
alter table if exists intakes
  add column if not exists priority text not null default 'normal';

alter table if exists intakes
  drop constraint if exists intakes_priority_check;

alter table if exists intakes
  add constraint intakes_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists idx_intakes_priority on intakes(priority);
