-- Add score column to people table for verdict/scan scores
alter table people add column if not exists score numeric(3,1);

-- Backfill scores from confirmed person_scans
update people p
set score = ps.score
from person_scans ps
where ps.person_id = p.id
  and ps.status = 'confirmed'
  and ps.score is not null
  and p.score is null;
