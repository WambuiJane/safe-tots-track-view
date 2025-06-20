
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';

const addChildSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
});

type AddChildFormValues = z.infer<typeof addChildSchema>;

const AddChildDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user: parentUser } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildSchema),
    defaultValues: {
      fullName: '',
      email: '',
    },
  });

  const addChildMutation = useMutation({
    mutationFn: async (values: AddChildFormValues) => {
      console.log('Frontend form values:', values);
      console.log('Parent user ID:', parentUser?.id);
      
      const { data, error } = await supabase.functions.invoke('invite-child', {
        body: { 
          email: values.email, 
          fullName: values.fullName,
          parentId: parentUser?.id 
        },
      });

      console.log('Edge function response:', data);
      console.log('Edge function error:', error);

      if (error) {
        // This handles network errors or function invocation errors
        throw new Error(error.message);
      }

      if (data.error) {
        // This handles errors returned from the function itself
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Child invited successfully!');
      queryClient.invalidateQueries({ queryKey: ['children', parentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['childrenLocations', parentUser?.id] });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast.error(error.message);
    },
  });

  const onSubmit = (values: AddChildFormValues) => {
    console.log('Form submitted with values:', values);
    addChildMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Child
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a New Child</DialogTitle>
          <DialogDescription>
            Enter your child's details below. They will receive an email invitation to create their account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={addChildMutation.isPending}>
                {addChildMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddChildDialog;
