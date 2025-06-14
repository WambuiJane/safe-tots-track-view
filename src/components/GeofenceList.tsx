
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

const fetchGeofences = async (parentId: string) => {
  const { data, error } = await supabase
    .from('geofences')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching geofences:', error);
    throw error;
  }
  return data;
};

const GeofenceList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: geofences, isLoading } = useQuery({
    queryKey: ['geofences', user?.id],
    queryFn: () => fetchGeofences(user!.id),
    enabled: !!user,
  });

  const handleDeleteGeofence = async (geofenceId: string) => {
    try {
      const { error } = await supabase
        .from('geofences')
        .delete()
        .eq('id', geofenceId);

      if (error) {
        console.error('Error deleting geofence:', error);
        toast.error('Failed to delete safe place');
      } else {
        toast.success('Safe place deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['geofences', user?.id] });
      }
    } catch (error) {
      console.error('Unexpected error deleting geofence:', error);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Existing Safe Places</h3>
      {isLoading ? (
        <p className="text-muted-foreground">Loading safe places...</p>
      ) : geofences && geofences.length > 0 ? (
        geofences.map((geofence: Tables<'geofences'>) => (
          <Card key={geofence.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h4 className="font-medium">{geofence.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)} • {geofence.radius}m radius
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteGeofence(geofence.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-muted-foreground">No safe places created yet.</p>
      )}
    </div>
  );
};

export default GeofenceList;
