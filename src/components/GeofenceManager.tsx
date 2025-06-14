
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import GeofenceForm from './GeofenceForm';
import GeofenceList from './GeofenceList';

type GeofenceManagerProps = {
  childId: string;
};

const fetchChildLocation = async (childId: string) => {
  const { data, error } = await supabase
    .from('location_history')
    .select('latitude, longitude')
    .eq('child_id', childId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching child location:', error);
    throw error;
  }
  return data;
};

const GeofenceManager = ({ childId }: GeofenceManagerProps) => {
  const { data: childLocation } = useQuery({
    queryKey: ['child-location', childId],
    queryFn: () => fetchChildLocation(childId),
    enabled: !!childId,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <GeofenceForm childId={childId} childLocation={childLocation} />
      </div>
      <div className="space-y-4">
        <GeofenceList />
      </div>
    </div>
  );
};

export default GeofenceManager;
