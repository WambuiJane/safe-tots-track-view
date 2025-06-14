
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, MapPin } from 'lucide-react';
import { toast } from 'sonner';

type LocationResult = {
  place_name: string;
  center: [number, number];
};

type LocationSearchProps = {
  onLocationSelected: (location: LocationResult) => void;
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

const LocationSearch = ({ onLocationSelected }: LocationSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
    onLocationSelected(location);
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Location selected');
  };

  return (
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
  );
};

export default LocationSearch;
