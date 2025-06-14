
-- Fix ambiguous column reference in the function to get children's locations.
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
    SELECT pc.child_id FROM public.parent_child_relations pc WHERE pc.parent_id = p_parent_id
  ),
  latest_locations AS (
    SELECT DISTINCT ON (lh.child_id)
      lh.child_id,
      lh.latitude,
      lh.longitude,
      lh.recorded_at
    FROM public.location_history lh
    WHERE lh.child_id IN (SELECT child_id FROM parent_children)
    ORDER BY lh.child_id, lh.recorded_at DESC
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
