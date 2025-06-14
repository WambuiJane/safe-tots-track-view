
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Trash, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type GeofenceManagerProps = {
  childId: string;
};

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newGeofence, setNewGeofence] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100'
  });
  const [isCreating, setIsCreating] = useState(false);

  const { data: geofences, isLoading } = useQuery({
    queryKey: ['geofences', user?.id],
    queryFn: () => fetchGeofences(user!.id),
    enabled: !!user,
  });

  const { data: childLocation } = useQuery({
    queryKey: ['child-location', childId],
    queryFn: () => fetchChildLocation(childId),
    enabled: !!childId,
  });

  const handleCreateGeofence = async () => {
    if (!newGeofence.name.trim() || !newGeofence.latitude || !newGeofence.longitude) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('geofences')
        .insert({
          parent_id: user!.id,
          name: newGeofence.name.trim(),
          latitude: parseFloat(newGeofence.latitude),
          longitude: parseFloat(newGeofence.longitude),
          radius: parseFloat(newGeofence.radius)
        });

      if (error) {
        console.error('Error creating geofence:', error);
        toast.error('Failed to create safe place');
      } else {
        toast.success('Safe place created successfully');
        setNewGeofence({ name: '', latitude: '', longitude: '', radius: '100' });
        queryClient.invalidateQueries({ queryKey: ['geofences', user?.id] });
      }
    } catch (error) {
      console.error('Unexpected error creating geofence:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

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

  const handleUseCurrentLocation = () => {
    if (childLocation) {
      setNewGeofence(prev => ({
        ...prev,
        latitude: childLocation.latitude.toString(),
        longitude: childLocation.longitude.toString()
      }));
      toast.success('Current location set');
    } else {
      toast.error('No current location available for this child');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Safe Place</CardTitle>
          <CardDescription>
            Create geofenced areas like home, school, or other important places.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="geofence-name">Place Name</Label>
            <Input
              id="geofence-name"
              placeholder="e.g., Home, School, Grandma's House"
              value={newGeofence.name}
              onChange={(e) => setNewGeofence(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="-1.2921"
                value={newGeofence.latitude}
                onChange={(e) => setNewGeofence(prev => ({ ...prev, latitude: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="36.8219"
                value={newGeofence.longitude}
                onChange={(e) => setNewGeofence(prev => ({ ...prev, longitude: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="radius">Radius (meters)</Label>
            <Input
              id="radius"
              type="number"
              placeholder="100"
              value={newGeofence.radius}
              onChange={(e) => setNewGeofence(prev => ({ ...prev, radius: e.target.value }))}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleUseCurrentLocation}
              variant="outline"
              disabled={!childLocation}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Use Current Location
            </Button>
            <Button onClick={handleCreateGeofence} disabled={isCreating} className="flex-1">
              {isCreating ? 'Creating...' : 'Create Safe Place'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default GeofenceManager;
