
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">Safe Tots Track</h1>
        <div className="flex items-center gap-4">
          <span>{user?.email}</span>
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>
      </header>
      <main className="p-4 md:p-8">
        <h2 className="text-3xl font-bold mb-4">Dashboard</h2>
        <div className="border rounded-lg h-[60vh] bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">Interactive Map will be displayed here</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
