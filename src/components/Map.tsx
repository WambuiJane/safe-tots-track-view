
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icon issue with bundlers like Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const Map = () => {
  const [isLocating, setIsLocating] = useState(true);
  const [position, setPosition] = useState<[number, number]>([51.505, -0.09]); // Default to London
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          if (mapRef.current) {
            mapRef.current.flyTo(newPos, 13);
          }
          setIsLocating(false);
        },
        (err) => {
          console.error("Geolocation error:", err.message);
          setIsLocating(false); // Stop loading, use default location
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      setIsLocating(false); // Stop loading, use default location
    }
  }, []);

  return (
    <div className="relative border rounded-lg h-[60vh] w-full overflow-hidden">
      {isLocating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-[1000] rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Getting your location...</p>
        </div>
      )}
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>Your location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default Map;
