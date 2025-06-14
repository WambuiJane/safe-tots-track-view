
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import ChildrenManager from '@/components/ChildrenManager';

const fetchProfile = async (userId: string) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
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

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

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
        <h2 className="text-3xl font-bold mb-8">Dashboard</h2>
        
        <div className="space-y-8">
            <ChildrenManager />
            <div className="border rounded-lg h-[60vh] bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Interactive Map will be displayed here</p>
            </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
