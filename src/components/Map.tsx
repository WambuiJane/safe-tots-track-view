
import React, { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, User, MapPin } from 'lucide-react';
import L from 'leaflet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Fix for default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type ChildLocation = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  recorded_at: string | null;
};

const createAvatarIcon = (child: ChildLocation) => {
  const fallbackInitials = child.full_name?.charAt(0).toUpperCase() || <User className="h-6 w-6" />;
  const content = child.avatar_url
    ? `<img src="${child.avatar_url}" alt="${child.full_name || 'Child Avatar'}" class="w-10 h-10 rounded-full border-2 border-primary shadow-lg object-cover bg-background" />`
    : `<div class="w-10 h-10 rounded-full border-2 border-primary shadow-lg bg-muted flex items-center justify-center text-primary font-bold text-lg">${fallbackInitials}</div>`;

  return L.divIcon({
    html: content,
    className: 'bg-transparent border-none',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

type MapProps = {
  selectedChildId: string | null;
  setSelectedChildId: React.Dispatch<React.SetStateAction<string | null>>;
};

const MapUpdater = ({ childrenLocations, selectedChildId, openPopup }: { childrenLocations: ChildLocation[], selectedChildId: string | null, openPopup: (childId: string) => void }) => {
  const map = useMap();
  useEffect(() => {
    // When a child is selected, fly to their location.
    if (selectedChildId) {
      const child = childrenLocations.find(c => c.id === selectedChildId);
      if (child?.latitude && child.longitude) {
        map.flyTo([child.latitude, child.longitude], 18, {
          animate: true,
          duration: 1,
        });
        // Open popup after animation
        const popupTimeout = setTimeout(() => {
            if (selectedChildId) openPopup(selectedChildId);
        }, 1000);
        return () => clearTimeout(popupTimeout);
      }
    } else {
      // Otherwise, fit all children in the view.
      const childrenWithLocations = childrenLocations.filter(c => c.latitude && c.longitude) as Required<Pick<ChildLocation, 'latitude' | 'longitude'>>[];

      if (childrenWithLocations.length > 0) {
        const bounds = L.latLngBounds(childrenWithLocations.map(c => [c.latitude, c.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
      }
    }
  }, [childrenLocations, selectedChildId, map, openPopup]);

  return null;
};

const Map = ({ selectedChildId, setSelectedChildId }: MapProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['childrenLocations', user?.id];
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  const { data: childrenLocations = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_children_latest_locations', { p_parent_id: user.id });
      if (error) {
        console.error("Error fetching children locations:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const handleLocationInsert = (payload: any) => {
      const newLocation = payload.new as Tables<'location_history'>;
      queryClient.setQueryData(queryKey, (oldData: ChildLocation[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(child =>
          child.id === newLocation.child_id
            ? { ...child, latitude: newLocation.latitude, longitude: newLocation.longitude, recorded_at: newLocation.recorded_at }
            : child
        );
      });
    };
    
    const handleProfileUpdate = (payload: any) => {
        const updatedProfile = payload.new as Tables<'profiles'>;
        queryClient.setQueryData(queryKey, (oldData: ChildLocation[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(child => 
                child.id === updatedProfile.id 
                ? { ...child, full_name: updatedProfile.full_name, avatar_url: updatedProfile.avatar_url }
                : child
            );
        });
    };

    const locationChannel = supabase.channel('realtime-child-locations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_history' }, handleLocationInsert)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, handleProfileUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [user, queryClient, queryKey]);
  
  const openPopup = useCallback((childId: string) => {
    markerRefs.current[childId]?.openPopup();
  }, []);

  const childrenWithLocations = childrenLocations.filter(c => c.latitude && c.longitude);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Live Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative border rounded-lg h-[60vh] w-full overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-[1000] rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Loading children's locations...</p>
            </div>
          )}

          <Card className="absolute top-3 right-3 z-[1000] w-48 max-h-[calc(60vh-1.5rem)] overflow-y-auto">
            <CardHeader className="p-3">
              <CardTitle className="text-base">Children</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {childrenWithLocations.length > 0 ? (
                <ul className="space-y-1">
                  {childrenWithLocations.map(child => (
                    <li key={child.id}>
                      <Button
                        variant={selectedChildId === child.id ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start h-auto py-1.5"
                        onClick={() => setSelectedChildId(prevId => prevId === child.id ? null : child.id)}
                      >
                        <div className="flex items-center gap-2">
                           {child.avatar_url ? (
                              <img src={child.avatar_url} alt={child.full_name || ""} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                {child.full_name?.charAt(0) || <User className="h-4 w-4" />}
                              </div>
                            )}
                          <span className="truncate text-sm">{child.full_name || 'Unnamed Child'}</span>
                        </div>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground px-1">No children with location data found.</p>
              )}
              {selectedChildId && (
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setSelectedChildId(null)}>
                  Show All
                </Button>
              )}
            </CardContent>
          </Card>

          <MapContainer
            center={[51.505, -0.09]} // Default center, will be updated by MapUpdater
            zoom={2}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater childrenLocations={childrenLocations} selectedChildId={selectedChildId} openPopup={openPopup} />
            {childrenWithLocations.map(child => (
              <Marker
                key={child.id}
                position={[child.latitude!, child.longitude!]}
                icon={createAvatarIcon(child)}
                ref={el => { markerRefs.current[child.id] = el }}
              >
                <Popup>
                  <div className="font-semibold">{child.full_name || 'Unnamed Child'}</div>
                  <div className="text-xs text-muted-foreground">
                    Last seen: {child.recorded_at ? new Date(child.recorded_at).toLocaleString() : 'N/A'}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default Map;
