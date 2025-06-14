
-- Create custom types for user roles and alert types
CREATE TYPE public.user_role AS ENUM ('parent', 'child');
CREATE TYPE public.alert_type AS ENUM ('SOS', 'geofence_enter', 'geofence_leave', 'low_battery', 'speeding');

-- Create a table for public user profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_role user_role NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Public profile information for each user.';

-- Create a table to link parents and children
CREATE TABLE public.parent_child_relations (
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (parent_id, child_id)
);
COMMENT ON TABLE public.parent_child_relations IS 'Links parents to their children.';

-- Create a table for location history
CREATE TABLE public.location_history (
  id BIGSERIAL PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed REAL,
  battery_level REAL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.location_history IS 'Stores real-time and historical location data for children.';
CREATE INDEX location_history_child_id_idx ON public.location_history(child_id);

-- Create a table for geofenced zones
CREATE TABLE public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius REAL NOT NULL, -- Radius in meters
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.geofences IS 'Stores geofenced zones created by parents.';

-- Create a table for alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.alerts IS 'Stores alerts like SOS, geofence breaches, etc.';

-- Set up a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_role, full_name, avatar_url)
  VALUES (
    new.id,
    (new.raw_user_meta_data->>'user_role')::user_role,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ||||||||||||||||||||||||||||||||||||||||||||||
-- || ROW LEVEL SECURITY (RLS) POLICIES      ||
-- ||||||||||||||||||||||||||||||||||||||||||||||

-- Helper function to check parent-child relationship for RLS
CREATE OR REPLACE FUNCTION public.is_parent_of(_parent_id uuid, _child_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_child_relations
    WHERE parent_id = _parent_id AND child_id = _child_id
  );
$$;

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents can view their childrens profiles." ON public.profiles FOR SELECT USING (is_parent_of(auth.uid(), id));
CREATE POLICY "Children can view their parents profiles." ON public.profiles FOR SELECT USING (is_parent_of(id, auth.uid()));
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for parent_child_relations
CREATE POLICY "Users can view their own parent-child relationships." ON public.parent_child_relations FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = child_id);
CREATE POLICY "Parents can create relationships for themselves." ON public.parent_child_relations FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can delete their own child relationships." ON public.parent_child_relations FOR DELETE USING (auth.uid() = parent_id);

-- RLS Policies for location_history
CREATE POLICY "Parents can view their childrens location history." ON public.location_history FOR SELECT USING (is_parent_of(auth.uid(), child_id));
CREATE POLICY "Children can insert their own location." ON public.location_history FOR INSERT WITH CHECK (auth.uid() = child_id);

-- RLS Policies for geofences
CREATE POLICY "Parents can manage their own geofences." ON public.geofences FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "Children can view their parents geofences." ON public.geofences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_relations
    WHERE child_id = auth.uid() AND parent_id = geofences.parent_id
  )
);

-- RLS Policies for alerts
CREATE POLICY "Parents can view alerts for their children." ON public.alerts FOR SELECT USING (is_parent_of(auth.uid(), child_id));
CREATE POLICY "Children can create alerts for themselves." ON public.alerts FOR INSERT WITH CHECK (auth.uid() = child_id);
CREATE POLICY "Parents can update their childrens alerts (e.g., mark as read)." ON public.alerts FOR UPDATE USING (is_parent_of(auth.uid(), child_id));

