
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const fetchUserRole = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    throw error;
  }
  return data;
};

type ChildRouteProps = {
  children: React.ReactNode;
};

const ChildRoute = ({ children }: ChildRouteProps) => {
  const { user, loading } = useAuth();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: () => fetchUserRole(user!.id),
    enabled: !!user,
  });

  if (loading || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile?.user_role !== 'child') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ChildRoute;
