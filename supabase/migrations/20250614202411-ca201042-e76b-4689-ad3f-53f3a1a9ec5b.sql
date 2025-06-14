
-- Enable Realtime for location_history to see live location updates
ALTER TABLE public.location_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_history;

-- Enable Realtime for profiles to get avatar or name updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create a database function to efficiently get the latest location for all of a parent's children.
CREATE OR REPLACE FUNCTION public.get_children_latest_locations(p_parent_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH parent_children AS (
    SELECT child_id FROM public.parent_child_relations WHERE parent_id = p_parent_id
  ),
  latest_locations AS (
    SELECT DISTINCT ON (child_id)
      child_id,
      latitude,
      longitude,
      recorded_at
    FROM public.location_history
    WHERE child_id IN (SELECT child_id FROM parent_children)
    ORDER BY child_id, recorded_at DESC
  )
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    ll.latitude,
    ll.longitude,
    ll.recorded_at
  FROM public.profiles p
  JOIN parent_children pc ON p.id = pc.child_id
  LEFT JOIN latest_locations ll ON p.id = ll.child_id;
END;
$$ LANGUAGE plpgsql;
