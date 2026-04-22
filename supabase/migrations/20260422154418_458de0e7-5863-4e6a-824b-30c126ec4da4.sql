-- Create incident_events table for timeline tracking
CREATE TABLE public.incident_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_events_incident_id ON public.incident_events(incident_id, created_at);

ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read incident_events" ON public.incident_events FOR SELECT USING (true);
CREATE POLICY "Public write incident_events" ON public.incident_events FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_events;

-- Auto-create initial event when incident is created
CREATE OR REPLACE FUNCTION public.log_incident_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.incident_events (incident_id, event_type, title, description, metadata)
  VALUES (
    NEW.id,
    'sos_triggered',
    'SOS Triggered',
    NEW.message,
    jsonb_build_object('reporter', NEW.reporter_label, 'lat', NEW.lat, 'lng', NEW.lng)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_incident_created
AFTER INSERT ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.log_incident_created();

-- Auto-log status changes and AI classification
CREATE OR REPLACE FUNCTION public.log_incident_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- AI classification (when type changes from unknown OR ai_summary is set)
  IF (OLD.ai_summary IS NULL AND NEW.ai_summary IS NOT NULL) THEN
    INSERT INTO public.incident_events (incident_id, event_type, title, description, metadata)
    VALUES (
      NEW.id,
      'ai_classified',
      'AI Classification Complete',
      NEW.ai_summary,
      jsonb_build_object('type', NEW.type, 'severity', NEW.severity)
    );
  END IF;

  -- Volunteer assignment
  IF (OLD.assigned_volunteer_id IS DISTINCT FROM NEW.assigned_volunteer_id AND NEW.assigned_volunteer_id IS NOT NULL) THEN
    SELECT name INTO v_name FROM public.volunteers WHERE id = NEW.assigned_volunteer_id;
    INSERT INTO public.incident_events (incident_id, event_type, title, description, metadata)
    VALUES (
      NEW.id,
      'volunteer_assigned',
      'Volunteer Assigned',
      COALESCE(v_name, 'Unknown') || ' has been dispatched',
      jsonb_build_object('volunteer_id', NEW.assigned_volunteer_id, 'volunteer_name', v_name)
    );
  END IF;

  -- Volunteer unassigned (rejection)
  IF (OLD.assigned_volunteer_id IS NOT NULL AND NEW.assigned_volunteer_id IS NULL) THEN
    INSERT INTO public.incident_events (incident_id, event_type, title, description, metadata)
    VALUES (
      NEW.id,
      'volunteer_rejected',
      'Assignment Rejected',
      'Returned to dispatch queue',
      '{}'::jsonb
    );
  END IF;

  -- Status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status = 'en_route' THEN
      INSERT INTO public.incident_events (incident_id, event_type, title, description, metadata)
      VALUES (NEW.id, 'status_en_route', 'Volunteer En Route', 'Responder is heading to the scene', '{}'::jsonb);
    ELSIF NEW.status = 'resolved' THEN
      INSERT INTO public.incident_events (incident_id, event_type, title, description, metadata)
      VALUES (NEW.id, 'status_resolved', 'Incident Resolved', 'Emergency successfully handled', '{}'::jsonb);
    ELSIF NEW.status = 'assigned' AND OLD.status != 'assigned' THEN
      -- assignment event already covers this
      NULL;
    ELSIF NEW.status = 'pending' AND OLD.status != 'pending' THEN
      -- rejection event already covers this
      NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_incident_changed
AFTER UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.log_incident_changes();