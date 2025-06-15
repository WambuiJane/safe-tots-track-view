
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100">
        <div className="w-full max-w-md space-y-4 text-center">
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 px-4 relative">
      <header className="absolute top-0 right-0 p-4 md:p-6">
        <Link to="/auth">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200"
          >
            Get Started Today
          </Button>
        </Link>
      </header>

      <div className="text-center max-w-4xl mx-auto">
        <div className="mb-8">
          <ShieldCheck className="mx-auto h-16 w-16 md:h-20 md:w-20 text-purple-600 mb-6" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white bg-gradient-to-r from-purple-600 to-blue-600 px-4 md:px-8 py-3 md:py-4 rounded-2xl shadow-2xl inline-block">
            Linda Mtoto App
          </h1>
        </div>
        
        <p className="text-lg md:text-xl lg:text-2xl text-gray-700 mt-6 mb-8 max-w-3xl mx-auto leading-relaxed">
          The ultimate peace of mind for parents. Real-time location tracking, smart alerts, and safety features for your children.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-purple-200">
            <div className="text-3xl mb-4">📍</div>
            <h3 className="font-bold text-purple-600 mb-2">Real-time Tracking</h3>
            <p className="text-sm text-gray-600">Know where your children are at all times with precise GPS tracking</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-blue-200">
            <div className="text-3xl mb-4">🚨</div>
            <h3 className="font-bold text-blue-600 mb-2">Emergency Alerts</h3>
            <p className="text-sm text-gray-600">Instant SOS notifications and emergency communication features</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-green-200">
            <div className="text-3xl mb-4">🛡️</div>
            <h3 className="font-bold text-green-600 mb-2">Safe Zones</h3>
            <p className="text-sm text-gray-600">Set up geofences and get notified when children enter or leave safe areas</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-6">
          Join thousands of parents who trust Linda Mtoto App to keep their children safe
        </p>
      </div>
    </div>
  );
};

export default Index;
