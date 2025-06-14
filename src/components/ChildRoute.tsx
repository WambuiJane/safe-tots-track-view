
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
    return null;
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

  console.log('ChildRoute - User:', user?.id, 'Profile:', profile, 'Loading:', isLoadingProfile);

  if (loading || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If we have profile data and user is NOT a child, redirect to dashboard
  if (profile && profile.user_role && profile.user_role !== 'child') {
    console.log('Non-child user redirected to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // If profile is null or user is a child, allow access
  return <>{children}</>;
};

export default ChildRoute;
