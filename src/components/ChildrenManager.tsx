
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Settings, User } from 'lucide-react';
import AddChildDialog from './AddChildDialog';
import ChildSettingsSheet from './ChildSettingsSheet';
import { toast } from 'sonner';

type Child = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  latitude?: number;
  longitude?: number;
  recorded_at?: string;
};

type ChildrenManagerProps = {
  setSelectedChildId: React.Dispatch<React.SetStateAction<string | null>>;
  onChildSettingsChange?: (isOpen: boolean) => void;
};

const ChildrenManager = ({ setSelectedChildId, onChildSettingsChange }: ChildrenManagerProps) => {
  const { user } = useAuth();

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase.rpc('get_children_latest_locations', { p_parent_id: user.id });
      
      if (error) {
        console.error("Error fetching children:", error);
        toast.error('Failed to load children');
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  const handleChildClick = (childId: string) => {
    setSelectedChildId(prevId => prevId === childId ? null : childId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Children
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          Children
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {children.map((child) => (
            <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg">
              <button 
                onClick={() => handleChildClick(child.id)}
                className="flex items-center gap-3 flex-1 text-left hover:bg-accent/50 rounded p-2 transition-colors"
              >
                {child.avatar_url ? (
                  <img src={child.avatar_url} alt={child.full_name || ""} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{child.full_name || 'Unnamed Child'}</p>
                  {child.latitude && child.longitude ? (
                    <p className="text-sm text-muted-foreground">
                      Last seen: {child.recorded_at ? new Date(child.recorded_at).toLocaleString() : 'N/A'}
                    </p>
                  ) : (
                    <Badge variant="outline" className="text-xs">No location data</Badge>
                  )}
                </div>
              </button>
              <ChildSettingsSheet 
                child={child}
                onOpenChange={onChildSettingsChange}
              >
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </ChildSettingsSheet>
            </div>
          ))}
          
          {children.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No children added yet</p>
              <AddChildDialog />
            </div>
          )}
          
          {children.length > 0 && (
            <AddChildDialog />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChildrenManager;
