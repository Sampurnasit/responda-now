
-- Volunteers table (public, no auth needed for demo)
CREATE TABLE public.volunteers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available | assigned | en_route | offline
  avatar_color TEXT NOT NULL DEFAULT '#22d3ee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Incidents table
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'unknown', -- fire | medical | crowd | security | other
  severity INTEGER NOT NULL DEFAULT 3, -- 1..5
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | assigned | en_route | resolved
  reporter_label TEXT NOT NULL DEFAULT 'Anonymous',
  assigned_volunteer_id UUID REFERENCES public.volunteers(id) ON DELETE SET NULL,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Open policies for demo (no auth)
CREATE POLICY "Public read volunteers" ON public.volunteers FOR SELECT USING (true);
CREATE POLICY "Public write volunteers" ON public.volunteers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Public write incidents" ON public.incidents FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER TABLE public.volunteers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteers;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER incidents_touch
BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed volunteers around San Francisco downtown
INSERT INTO public.volunteers (name, skills, lat, lng, status, avatar_color) VALUES
  ('Maya Chen', ARRAY['medical','first-aid'], 37.7849, -122.4094, 'available', '#22d3ee'),
  ('Diego Martinez', ARRAY['security','crowd-control'], 37.7799, -122.4180, 'available', '#a78bfa'),
  ('Aisha Patel', ARRAY['medical','logistics'], 37.7888, -122.4022, 'available', '#34d399'),
  ('Liam O''Connor', ARRAY['fire','rescue'], 37.7770, -122.4150, 'available', '#fb923c'),
  ('Sofia Rossi', ARRAY['logistics','communications'], 37.7920, -122.4150, 'available', '#f472b6'),
  ('Kenji Tanaka', ARRAY['fire','first-aid'], 37.7820, -122.4250, 'available', '#facc15');
