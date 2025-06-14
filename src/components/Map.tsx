
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState(() => localStorage.getItem('mapboxToken') || '');
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40],
      zoom: 9,
    });
    
    map.current.addControl(new mapboxgl.NavigationControl());

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
    <div ref={mapContainer} className="border rounded-lg h-[60vh] w-full" />
  );
};

export default Map;
