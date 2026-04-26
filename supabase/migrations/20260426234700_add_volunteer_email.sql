ALTER TABLE public.volunteers
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS volunteers_email_unique_idx
ON public.volunteers (lower(email))
WHERE email IS NOT NULL;
