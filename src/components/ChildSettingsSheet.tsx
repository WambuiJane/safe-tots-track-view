
import React, { useState } from 'react';
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
};

const ChildSettingsSheet = ({ child, children }: ChildSettingsSheetProps) => {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(child.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

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
      // First delete the parent-child relationship
      const { error: relationError } = await supabase
        .from('parent_child_relations')
        .delete()
        .eq('child_id', child.id);

      if (relationError) {
        console.error('Error deleting parent-child relation:', relationError);
        toast.error('Failed to delete child');
        return;
      }

      // Note: We don't delete the profile itself, just the relationship
      // This allows the child to still exist and potentially be managed by other parents
      
      toast.success('Child removed successfully');
      setOpen(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['children'] });
    } catch (error) {
      console.error('Unexpected error deleting child:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
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
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {child.full_name || 'this child'} from your account. 
                        You will no longer be able to track their location or receive alerts.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteChild}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Removing...' : 'Remove Child'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TabsContent>
            
            <TabsContent value="places" className="mt-4">
              <GeofenceManager childId={child.id} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChildSettingsSheet;
