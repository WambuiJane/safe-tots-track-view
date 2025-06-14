
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import LocationSearch from './LocationSearch';

type GeofenceFormProps = {
  childId: string;
  childLocation?: { latitude: number; longitude: number } | null;
};

type LocationResult = {
  place_name: string;
  center: [number, number];
};

const GeofenceForm = ({ childId, childLocation }: GeofenceFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newGeofence, setNewGeofence] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100'
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleLocationSelected = (location: LocationResult) => {
    setNewGeofence(prev => ({
      ...prev,
      name: prev.name || location.place_name.split(',')[0],
      latitude: location.center[1].toString(),
      longitude: location.center[0].toString()
    }));
  };

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
        
        <LocationSearch onLocationSelected={handleLocationSelected} />
        
        {/* Manual Coordinates (for advanced users) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="Auto-filled from search"
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
              placeholder="Auto-filled from search"
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
  );
};

export default GeofenceForm;
