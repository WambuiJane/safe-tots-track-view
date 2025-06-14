
-- Add geofencing functionality and child communication features

-- First, let's add RLS policies to existing tables that need them
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- RLS policies for geofences (parents can only manage their own geofences)
CREATE POLICY "Parents can view their own geofences" 
  ON public.geofences 
  FOR SELECT 
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create their own geofences" 
  ON public.geofences 
  FOR INSERT 
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update their own geofences" 
  ON public.geofences 
  FOR UPDATE 
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their own geofences" 
  ON public.geofences 
  FOR DELETE 
  USING (auth.uid() = parent_id);

-- RLS policies for alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Parents can see alerts for their children
CREATE POLICY "Parents can view alerts for their children" 
  ON public.alerts 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations 
      WHERE parent_id = auth.uid() AND child_id = alerts.child_id
    )
  );

-- Children can create their own alerts (for SOS)
CREATE POLICY "Children can create alerts" 
  ON public.alerts 
  FOR INSERT 
  WITH CHECK (auth.uid() = child_id);

-- Parents can update alerts (mark as read)
CREATE POLICY "Parents can update alerts for their children" 
  ON public.alerts 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations 
      WHERE parent_id = auth.uid() AND child_id = alerts.child_id
    )
  );

-- Add RLS to parent_child_relations
ALTER TABLE public.parent_child_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their child relations" 
  ON public.parent_child_relations 
  FOR SELECT 
  USING (auth.uid() = parent_id);

CREATE POLICY "Children can view their parent relations" 
  ON public.parent_child_relations 
  FOR SELECT 
  USING (auth.uid() = child_id);

-- Add RLS to location_history
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

-- Parents can view location history for their children
CREATE POLICY "Parents can view their children's location history" 
  ON public.location_history 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations 
      WHERE parent_id = auth.uid() AND child_id = location_history.child_id
    )
  );

-- Children can insert their own location data
CREATE POLICY "Children can insert their own location data" 
  ON public.location_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = child_id);

-- Add RLS to profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profiles
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Parents can view their children's profiles
CREATE POLICY "Parents can view their children's profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations 
      WHERE parent_id = auth.uid() AND child_id = profiles.id
    )
  );

-- Parents can update their children's profiles (for name changes etc)
CREATE POLICY "Parents can update their children's profiles" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations 
      WHERE parent_id = auth.uid() AND child_id = profiles.id
    )
  );

-- Create quick messages table for pre-set status updates
CREATE TABLE public.quick_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- RLS for quick messages
ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

-- Children can send their own quick messages
CREATE POLICY "Children can send quick messages" 
  ON public.quick_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = child_id);

-- Parents can view quick messages from their children
CREATE POLICY "Parents can view quick messages from their children" 
  ON public.quick_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations 
      WHERE parent_id = auth.uid() AND child_id = quick_messages.child_id
    )
  );

-- Parents can mark messages as read
CREATE POLICY "Parents can update quick messages from their children" 
  ON public.quick_messages 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_relations 
      WHERE parent_id = auth.uid() AND child_id = quick_messages.child_id
    )
  );

-- Create function to check if a point is within a geofence
CREATE OR REPLACE FUNCTION public.point_in_geofence(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_geofence_lat DOUBLE PRECISION,
  p_geofence_lng DOUBLE PRECISION,
  p_radius REAL
)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (
    6371000 * acos(
      cos(radians(p_latitude)) * cos(radians(p_geofence_lat)) *
      cos(radians(p_geofence_lng) - radians(p_longitude)) +
      sin(radians(p_latitude)) * sin(radians(p_geofence_lat))
    )
  ) <= p_radius;
$$;

-- Enable realtime for the new tables
ALTER TABLE public.quick_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_messages;

-- Also enable realtime for alerts if not already enabled
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Enable realtime for geofences
ALTER TABLE public.geofences REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofences;
