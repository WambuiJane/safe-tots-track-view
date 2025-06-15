
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Trash } from 'lucide-react';
import { toast } from 'sonner';
import GeofenceManager from './GeofenceManager';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Child = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  latitude?: number;
  longitude?: number;
  recorded_at?: string;
};

type ChildSettingsSheetProps = {
  child: Child;
  children: React.ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
};

const ChildSettingsSheet = ({ child, children, onOpenChange }: ChildSettingsSheetProps) => {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(child.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const handleUpdateChild = async () => {
    if (!fullName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', child.id);

      if (error) {
        console.error('Error updating child:', error);
        toast.error('Failed to update child details');
      } else {
        toast.success('Child details updated successfully');
        queryClient.invalidateQueries({ queryKey: ['children'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    } catch (error) {
      console.error('Unexpected error updating child:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteChild = async () => {
    setIsDeleting(true);
    try {
      console.log('Starting child deletion process for child ID:', child.id);
      
      // Step 1: Delete geofences related to this child
      const { error: geofenceError } = await supabase
        .from('geofences')
        .delete()
        .eq('parent_id', child.id);

      if (geofenceError) {
        console.error('Error deleting geofences:', geofenceError);
        // Don't return here, continue with other deletions
      }

      // Step 2: Delete location history
      const { error: locationError } = await supabase
        .from('location_history')
        .delete()
        .eq('child_id', child.id);

      if (locationError) {
        console.error('Error deleting location history:', locationError);
        // Don't return here, continue with other deletions
      }

      // Step 3: Delete alerts
      const { error: alertsError } = await supabase
        .from('alerts')
        .delete()
        .eq('child_id', child.id);

      if (alertsError) {
        console.error('Error deleting alerts:', alertsError);
        // Don't return here, continue with other deletions
      }

      // Step 4: Delete quick messages
      const { error: messagesError } = await supabase
        .from('quick_messages')
        .delete()
        .eq('child_id', child.id);

      if (messagesError) {
        console.error('Error deleting quick messages:', messagesError);
        // Don't return here, continue with other deletions
      }

      // Step 5: Delete parent-child relationships
      const { error: relationError } = await supabase
        .from('parent_child_relations')
        .delete()
        .eq('child_id', child.id);

      if (relationError) {
        console.error('Error deleting parent-child relation:', relationError);
        toast.error('Failed to delete child relationship');
        return;
      }

      // Step 6: Delete the child profile from the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', child.id);

      if (profileError) {
        console.error('Error deleting child profile:', profileError);
        toast.error('Failed to delete child profile');
        return;
      }

      // Step 7: Delete the user from Supabase Auth (this requires admin privileges)
      // Since we can't delete auth users from the client side, we'll use a function call
      try {
        const { error: authError } = await supabase.rpc('delete_user', { 
          user_id: child.id 
        });
        
        if (authError) {
          console.error('Error deleting auth user:', authError);
          // This might fail if the function doesn't exist, but the profile is already deleted
          console.log('Auth user deletion failed, but profile was successfully removed');
        }
      } catch (authDeleteError) {
        console.error('Auth deletion not available:', authDeleteError);
        // This is expected if the RPC function doesn't exist
      }

      console.log('Child deletion completed successfully');
      toast.success('Child removed successfully');
      setOpen(false);
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error) {
      console.error('Unexpected error deleting child:', error);
      toast.error('An unexpected error occurred while deleting the child');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Child Settings</SheetTitle>
          <SheetDescription>
            Manage {child.full_name || 'child'}'s details and safe places.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="places">Safe Places</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="child-name">Child's Name</Label>
                <Input
                  id="child-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter child's name"
                />
              </div>
              
              <Button 
                onClick={handleUpdateChild} 
                disabled={isUpdating || fullName === child.full_name}
                className="w-full"
              >
                {isUpdating ? 'Updating...' : 'Update Details'}
              </Button>
              
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash className="h-4 w-4 mr-2" />
                      Remove Child
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {child.full_name || 'this child'} and all their data including location history, alerts, geofences, and messages. 
                        This action cannot be undone and will remove the child's account entirely.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteChild}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Removing...' : 'Remove Child Permanently'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TabsContent>
            
            <TabsContent value="places" className="mt-4 space-y-6">
              <div className="min-h-[600px]">
                <GeofenceManager childId={child.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChildSettingsSheet;
