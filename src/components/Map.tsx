
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState(() => localStorage.getItem('mapboxToken') || '');
  const [tokenInput, setTokenInput] = useState('');
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    if (map.current) return; // initialize map only once

    const initializeMap = (center: [number, number], zoom: number) => {
      if (!mapContainer.current) return;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom,
      });
      
      map.current.addControl(new mapboxgl.NavigationControl());

      // Add a marker at the center
      new mapboxgl.Marker()
          .setLngLat(center)
          .addTo(map.current);
      
      setIsLocating(false);
    };

    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          initializeMap([position.coords.longitude, position.coords.latitude], 13);
        },
        (error) => {
          console.error("Geolocation error: ", error.message);
          // Fallback to default location
          initializeMap([-74.5, 40], 9);
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      // Fallback to default location
      initializeMap([-74.5, 40], 9);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);
  
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput) {
      localStorage.setItem('mapboxToken', tokenInput);
      setMapboxToken(tokenInput);
    }
  };

  if (!mapboxToken) {
    return (
        <div className="border rounded-lg h-[60vh] bg-muted flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Mapbox Access Token Required</CardTitle>
                    <CardDescription>
                        Please provide your Mapbox public access token to display the map. You can get one from your <a href="https://account.mapbox.com/access-tokens" target="_blank" rel="noopener noreferrer" className="text-primary underline">Mapbox account</a>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleTokenSubmit} className="flex gap-2">
                        <Input 
                            type="password"
                            placeholder="pk.ey..."
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                        />
                        <Button type="submit">Set Token</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="relative border rounded-lg h-[60vh] w-full">
      {isLocating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Getting your location...</p>
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

export default Map;
