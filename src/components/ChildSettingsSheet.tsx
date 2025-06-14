
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Trash, Edit, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GeofenceManager from './GeofenceManager';

type ChildSettingsSheetProps = {
  child: Tables<'profiles'>;
  children: React.ReactNode;
};

const ChildSettingsSheet = ({ child, children }: ChildSettingsSheetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState(child.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleUpdateChild = async () => {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsUpdating(true);
    console.log('Updating child:', child.id, 'with name:', fullName);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', child.id);

      if (error) {
        console.error('Error updating child:', error);
        toast.error('Failed to update child details');
      } else {
        console.log('Child updated successfully');
        toast.success('Child details updated successfully');
        queryClient.invalidateQueries({ queryKey: ['children', user?.id] });
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
    console.log('Deleting child:', child.id, child.full_name);

    try {
      // First delete the parent-child relationship
      const { error: relationError } = await supabase
        .from('parent_child_relations')
        .delete()
        .eq('child_id', child.id)
        .eq('parent_id', user?.id);

      if (relationError) {
        console.error('Error deleting parent-child relation:', relationError);
        toast.error('Failed to remove child');
        return;
      }

      // Then delete the child profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', child.id);

      if (profileError) {
        console.error('Error deleting child profile:', profileError);
        toast.error('Failed to delete child');
      } else {
        console.log('Child deleted successfully');
        toast.success('Child removed successfully');
        queryClient.invalidateQueries({ queryKey: ['children', user?.id] });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Unexpected error deleting child:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{child.full_name || 'Child'} Settings</SheetTitle>
          <SheetDescription>
            Manage {child.full_name || 'this child'}'s details and safety settings.
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="locations">Safe Places</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter child's full name"
              />
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={handleUpdateChild} 
                disabled={isUpdating || fullName.trim() === child.full_name}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                {isUpdating ? 'Updating...' : 'Update Details'}
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isDeleting}>
                    <Trash className="h-4 w-4 mr-2" />
                    Remove Child
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {child.full_name || 'this child'} from your account. 
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
          
          <TabsContent value="locations" className="space-y-4">
            <GeofenceManager childId={child.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ChildSettingsSheet;
