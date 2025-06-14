
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
            <Skeleton className="h-12 w-40 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background">
      <div className="text-center p-4">
        <ShieldCheck className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary-foreground bg-primary px-4 py-2 rounded-lg inline-block">Safe Tots Track</h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
          The ultimate peace of mind for parents. Real-time location tracking, smart alerts, and safety features for your children.
        </p>
        <Link to="/auth" className="mt-8 inline-block">
          <Button size="lg" className="text-lg px-8 py-6">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
