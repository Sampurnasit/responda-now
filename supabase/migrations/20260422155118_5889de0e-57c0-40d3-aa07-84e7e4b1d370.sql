ALTER TABLE public.incidents
  ADD COLUMN people_affected INTEGER,
  ADD COLUMN location_type TEXT,
  ADD COLUMN priority_score INTEGER,
  ADD COLUMN priority_label TEXT;

CREATE INDEX idx_incidents_priority_score ON public.incidents(priority_score DESC NULLS LAST);