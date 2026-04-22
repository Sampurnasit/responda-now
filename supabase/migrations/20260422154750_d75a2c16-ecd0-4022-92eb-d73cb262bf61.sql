-- Alert logs table
CREATE TABLE public.alert_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_logs_incident_id ON public.alert_logs(incident_id, created_at DESC);
CREATE INDEX idx_alert_logs_created_at ON public.alert_logs(created_at DESC);

ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read alert_logs" ON public.alert_logs FOR SELECT USING (true);
CREATE POLICY "Public write alert_logs" ON public.alert_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_logs;

-- Fan-out function: when an incident is created, notify admin + nearby volunteers
CREATE OR REPLACE FUNCTION public.fanout_incident_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_msg TEXT;
BEGIN
  v_msg := 'New ' || NEW.type || ' incident (sev ' || NEW.severity || '): ' || left(NEW.message, 80);

  -- Admin dashboard notification
  INSERT INTO public.alert_logs (incident_id, channel, recipient, recipient_type, message, status)
  VALUES (NEW.id, 'dashboard', 'Command Center', 'admin', v_msg, 'delivered');

  -- Nearby available volunteers (top 5 by haversine-ish distance using plain arithmetic)
  FOR v_record IN
    SELECT id, name,
      sqrt(power(lat - NEW.lat, 2) + power(lng - NEW.lng, 2)) * 111 AS distance_km
    FROM public.volunteers
    WHERE status = 'available'
    ORDER BY distance_km ASC
    LIMIT 5
  LOOP
    -- Push
    INSERT INTO public.alert_logs (incident_id, channel, recipient, recipient_type, message, status, metadata)
    VALUES (NEW.id, 'push', v_record.name, 'volunteer', v_msg, 'delivered',
      jsonb_build_object('volunteer_id', v_record.id, 'distance_km', round(v_record.distance_km::numeric, 2)));
    -- SMS
    INSERT INTO public.alert_logs (incident_id, channel, recipient, recipient_type, message, status, metadata)
    VALUES (NEW.id, 'sms', v_record.name, 'volunteer', v_msg, 'delivered',
      jsonb_build_object('volunteer_id', v_record.id, 'distance_km', round(v_record.distance_km::numeric, 2)));
    -- Email
    INSERT INTO public.alert_logs (incident_id, channel, recipient, recipient_type, message, status, metadata)
    VALUES (NEW.id, 'email', v_record.name, 'volunteer', v_msg, 'delivered',
      jsonb_build_object('volunteer_id', v_record.id, 'distance_km', round(v_record.distance_km::numeric, 2)));
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_incident_fanout_alerts
AFTER INSERT ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.fanout_incident_alerts();