
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

// Using OpenStreetMap Nominatim API as a free alternative to Mapbox
const searchLocations = async (query: string): Promise<LocationResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search locations');
    }
    
    const data = await response.json();
    console.log('Search results:', data);
    
    return data.map((item: any) => ({
      place_name: item.display_name,
      center: [parseFloat(item.lon), parseFloat(item.lat)]
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
    
    console.log('Searching for:', searchQuery);
    setIsSearching(true);
    try {
      const results = await searchLocations(searchQuery);
      console.log('Found results:', results);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No locations found. Try a different search term.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (location: LocationResult) => {
    console.log('Selected location:', location);
    onLocationSelected(location);
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Location selected');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchLocation();
    }
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
          onKeyPress={handleKeyPress}
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
        <div className="border rounded-md max-h-48 overflow-y-auto bg-background">
          {searchResults.map((location, index) => (
            <button
              key={index}
              className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0 text-sm transition-colors"
              onClick={() => handleSelectLocation(location)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="break-words">{location.place_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isSearching && (
        <div className="text-sm text-muted-foreground">
          Searching locations...
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
