
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, User, MapPin, Navigation } from 'lucide-react';
import SOSButton from '@/components/SOSButton';
import QuickMessages from '@/components/QuickMessages';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_role, full_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
  return data;
};

const ChildDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  // Redirect if not a child
  useEffect(() => {
    if (profile && profile.user_role !== 'child') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  // Auto-request location when component mounts
  useEffect(() => {
    if (profile?.user_role === 'child' && !isLocationEnabled) {
      requestLocationPermission();
    }
  }, [profile, isLocationEnabled]);

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    try {
      // Request permission first
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        toast.error('Location permission denied. Please enable in browser settings.');
        return;
      }

      // Start watching position
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Location updated:', { latitude, longitude });
          
          // Store location in database
          supabase
            .from('location_history')
            .insert({
              child_id: user!.id,
              latitude,
              longitude,
              recorded_at: new Date().toISOString()
            })
            .then(({ error }) => {
              if (error) {
                console.error('Error storing location:', error);
              } else {
                console.log('Location stored successfully');
              }
            });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to get location: ' + error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // 1 minute
        }
      );

      setLocationWatchId(watchId);
      setIsLocationEnabled(true);
      toast.success('Location tracking enabled');
    } catch (error) {
      console.error('Error requesting location:', error);
      toast.error('Failed to enable location tracking');
    }
  };

  const stopLocationTracking = () => {
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
      setIsLocationEnabled(false);
      toast.success('Location tracking disabled');
    }
  };

  // Shake detection for emergency alert
  useEffect(() => {
    let shakeTimeout: NodeJS.Timeout;
    let lastShakeTime = 0;
    let shakeCount = 0;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (!isShakeEnabled) return;

      const { x, y, z } = event.accelerationIncludingGravity || {};
      if (!x || !y || !z) return;

      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const currentTime = Date.now();

      if (acceleration > 15) { // Threshold for shake detection
        if (currentTime - lastShakeTime > 100) { // Debounce
          shakeCount++;
          lastShakeTime = currentTime;

          if (shakeCount >= 3) {
            handleShakeAlert();
            shakeCount = 0;
          }

          clearTimeout(shakeTimeout);
          shakeTimeout = setTimeout(() => {
            shakeCount = 0;
          }, 1000);
        }
      }
    };

    if (isShakeEnabled && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      clearTimeout(shakeTimeout);
    };
  }, [isShakeEnabled]);

  const handleShakeAlert = async () => {
    try {
      await supabase
        .from('alerts')
        .insert({
          child_id: user!.id,
          alert_type: 'SOS',
          message: 'Emergency alert triggered by shake gesture'
        });

      toast.success('Emergency alert sent to your parents');
    } catch (error) {
      console.error('Error sending shake alert:', error);
      toast.error('Failed to send alert');
    }
  };

  const handleLogout = async () => {
    // Stop location tracking before logout
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
    }
    await supabase.auth.signOut();
    navigate('/');
  };

  const requestShakePermissions = async () => {
    if ('DeviceMotionEvent' in window && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setIsShakeEnabled(true);
          toast.success('Shake detection enabled');
        } else {
          toast.error('Motion permission denied');
        }
      } catch (error) {
        console.error('Error requesting motion permission:', error);
        toast.error('Failed to enable shake detection');
      }
    } else {
      setIsShakeEnabled(true);
      toast.success('Shake detection enabled');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (profile && profile.user_role !== 'child') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">Safe Tots Track - Child</h1>
        <div className="flex items-center gap-4">
          <span>Welcome, {profile?.full_name || 'Child'}</span>
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>
      </header>
      
      <main className="p-4 md:p-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Stay Safe Dashboard</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-500" />
                Location Tracking
              </CardTitle>
              <CardDescription>
                Share your location with your parents for safety
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Location Sharing</h4>
                  <p className="text-sm text-muted-foreground">
                    {isLocationEnabled ? 'Your location is being shared with your parents' : 'Enable location sharing for safety'}
                  </p>
                </div>
                <Button
                  onClick={isLocationEnabled ? stopLocationTracking : requestLocationPermission}
                  variant={isLocationEnabled ? "secondary" : "default"}
                >
                  {isLocationEnabled ? 'Enabled' : 'Enable Location'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" />
                Emergency Features
              </CardTitle>
              <CardDescription>
                Quick access to emergency and safety features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SOSButton />
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Shake to Alert</h4>
                  <p className="text-sm text-muted-foreground">
                    Shake your phone vigorously 3 times to send an emergency alert
                  </p>
                </div>
                <Button
                  onClick={requestShakePermissions}
                  disabled={isShakeEnabled}
                  variant={isShakeEnabled ? "secondary" : "default"}
                >
                  {isShakeEnabled ? 'Enabled' : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Quick Messages
              </CardTitle>
              <CardDescription>
                Send quick updates to your parents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickMessages />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ChildDashboard;
