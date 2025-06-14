
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import ChildrenManager from '@/components/ChildrenManager';
import Map from '@/components/Map';
import AlertsPanel from '@/components/AlertsPanel';
import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';

const fetchProfile = async (userId: string) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, user_role')
    .eq('id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching profile", error);
    throw error;
  }

  return data;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  // Redirect children to their own dashboard
  useEffect(() => {
    console.log('Dashboard - Profile data:', profile);
    if (profile?.user_role === 'child') {
      console.log('Redirecting child to child dashboard');
      navigate('/child-dashboard', { replace: true });
    }
  }, [profile, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Show loading while checking user role
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  // Show loading if child (will redirect)
  if (profile?.user_role === 'child') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting to child dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">Safe Tots Track</h1>
        <div className="flex items-center gap-4">
          {isLoadingProfile ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span>{profile?.full_name || user?.email}</span>
          )}
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>
      </header>
      <main className="p-4 md:p-8">
        <h2 className="text-3xl font-bold mb-8">Parent Dashboard</h2>
        
        <div className="grid gap-8">
          <AlertsPanel />
          <ChildrenManager setSelectedChildId={setSelectedChildId} />
          <Map selectedChildId={selectedChildId} setSelectedChildId={setSelectedChildId} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
