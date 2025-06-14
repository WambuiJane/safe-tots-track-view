
-- Insert sample location data for the existing child to test the map functionality
INSERT INTO public.location_history (child_id, latitude, longitude, speed, battery_level, recorded_at)
SELECT 
    id,
    -1.2921,  -- Nairobi coordinates as example
    36.8219,
    0.0,      -- speed
    85.5,     -- battery level
    NOW()     -- current timestamp
FROM public.profiles 
WHERE user_role = 'child' AND full_name = 'ivy njoki'
LIMIT 1;
