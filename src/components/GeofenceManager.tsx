
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Trash, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type GeofenceManagerProps = {
  childId: string;
};

type LocationResult = {
  place_name: string;
  center: [number, number];
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

// Mapbox Geocoding API search
const searchLocations = async (query: string): Promise<LocationResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    // Using a public Mapbox token - in production, this should be from environment variables
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw&limit=5&types=poi,address,place`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search locations');
    }
    
    const data = await response.json();
    return data.features.map((feature: any) => ({
      place_name: feature.place_name,
      center: feature.center
    }));
  } catch (error) {
    console.error('Error searching locations:', error);
    toast.error('Failed to search locations. Please try again.');
    return [];
  }
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (location: LocationResult) => {
    setNewGeofence(prev => ({
      ...prev,
      name: prev.name || location.place_name.split(',')[0],
      latitude: location.center[1].toString(),
      longitude: location.center[0].toString()
    }));
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Location selected');
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
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
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
          
          {/* Location Search */}
          <div className="space-y-2">
            <Label htmlFor="location-search">Search Location</Label>
            <div className="flex gap-2">
              <Input
                id="location-search"
                placeholder="Search for schools, addresses, landmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
              />
              <Button
                onClick={handleSearchLocation}
                disabled={isSearching || !searchQuery.trim()}
                variant="outline"
                size="icon"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {searchResults.map((location, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0 text-sm"
                    onClick={() => handleSelectLocation(location)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span>{location.place_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
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
