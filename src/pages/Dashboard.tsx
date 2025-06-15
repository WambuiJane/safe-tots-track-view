
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import ChildrenManager from '@/components/ChildrenManager';
import Map from '@/components/Map';
import AlertsPanel from '@/components/AlertsPanel';
import { useState } from 'react';

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
  const [isChildSettingsOpen, setIsChildSettingsOpen] = useState(false);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  console.log('Dashboard - Profile data:', profile);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Show loading while checking user role
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <div className="animate-pulse text-gray-500">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <header className="p-4 border-b bg-white/80 backdrop-blur-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Linda Mtoto App</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {isLoadingProfile ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span className="text-gray-700">
              Welcome, <span className="font-semibold text-purple-600">{profile?.full_name || user?.email}</span>
            </span>
          )}
          <Button onClick={handleLogout} variant="outline" className="border-purple-200 hover:bg-purple-50">Logout</Button>
        </div>
      </header>
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Parent Dashboard
          </h2>
          
          <div className="grid gap-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-purple-100">
              <AlertsPanel />
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100">
              <ChildrenManager 
                setSelectedChildId={setSelectedChildId} 
                onChildSettingsChange={setIsChildSettingsOpen}
              />
            </div>
            {!isChildSettingsOpen && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-green-100">
                <Map selectedChildId={selectedChildId} setSelectedChildId={setSelectedChildId} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
