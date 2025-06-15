
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, User, MapPin, Navigation, Phone } from 'lucide-react';
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
    return null; // Return null instead of throwing to prevent redirect
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

  console.log('ChildDashboard - Profile:', profile, 'User role:', profile?.user_role);

  // Only redirect if we have profile data and user is definitely not a child
  useEffect(() => {
    if (profile && profile.user_role && profile.user_role !== 'child') {
      console.log('Redirecting non-child user to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  // Auto-request location when component mounts for children
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
      console.log('Requesting location permission...');
      
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
          message: 'Emergency alert triggered by shake gesture 🚨'
        });

      toast.success('Emergency alert sent to your parents');
    } catch (error) {
      console.error('Error sending shake alert:', error);
      toast.error('Failed to send alert');
    }
  };

  const triggerFakeCall = async () => {
    // Send alert to parents first
    try {
      await supabase
        .from('alerts')
        .insert({
          child_id: user!.id,
          alert_type: 'SOS',
          message: 'Fake call emergency - Call me urgently! 📞'
        });

      toast.success('Emergency fake call alert sent to parents');
    } catch (error) {
      console.error('Error sending fake call alert:', error);
      toast.error('Failed to send alert');
    }

    // Show fake call interface
    const fakeCallDiv = document.createElement('div');
    fakeCallDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; color: #fff; z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <div style="text-align: center;">
          <div style="width: 100px; height: 100px; border-radius: 50%; background: #4ade80; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">📞</span>
          </div>
          <h2 style="margin: 0 0 10px; font-size: 24px;">Incoming Call</h2>
          <p style="margin: 0 0 40px; color: #9ca3af;">Mom</p>
          <div style="display: flex; gap: 40px;">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="width: 70px; height: 70px; border-radius: 50%; background: #ef4444; border: none; color: white; font-size: 30px; cursor: pointer;">✕</button>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="width: 70px; height: 70px; border-radius: 50%; background: #22c55e; border: none; color: white; font-size: 30px; cursor: pointer;">✓</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(fakeCallDiv);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (fakeCallDiv.parentNode) {
        fakeCallDiv.remove();
      }
    }, 15000);
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
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if we're waiting for profile or if user is not a child
  if (!profile || (profile.user_role && profile.user_role !== 'child')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <header className="p-4 border-b bg-white/80 backdrop-blur-sm flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Linda Mtoto App - Child</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-700">Welcome, {profile?.full_name || 'Child'}</span>
          <Button onClick={handleLogout} variant="outline" className="border-purple-200 hover:bg-purple-50">Logout</Button>
        </div>
      </header>
      
      <main className="p-4 md:p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Stay Safe Dashboard</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* SOS Emergency Button */}
          <Card className="md:col-span-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Bell className="h-6 w-6" />
                Emergency SOS
              </CardTitle>
              <CardDescription>
                Tap for immediate emergency alert to your parents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SOSButton />
            </CardContent>
          </Card>

          {/* Fake Call Button */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                Discreet Help
              </CardTitle>
              <CardDescription>
                Fake call to get help without being obvious
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={triggerFakeCall}
                className="w-full h-16 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-md"
              >
                📞 Fake Call from Mom
              </Button>
            </CardContent>
          </Card>

          {/* Shake to Alert */}
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                Shake Alert
              </CardTitle>
              <CardDescription>
                Shake phone vigorously 3 times for emergency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={requestShakePermissions}
                disabled={isShakeEnabled}
                variant={isShakeEnabled ? "secondary" : "default"}
                className={`w-full ${!isShakeEnabled ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600' : 'bg-gray-100'} shadow-md`}
              >
                {isShakeEnabled ? '✅ Shake Alert Enabled' : 'Enable Shake Alert'}
              </Button>
            </CardContent>
          </Card>

          {/* Location Tracking */}
          <Card className="md:col-span-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-500" />
                Location Sharing
              </CardTitle>
              <CardDescription>
                Share your location with your parents for safety
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-blue-200 rounded-lg bg-white/50 backdrop-blur-sm">
                <div className="mb-4 sm:mb-0">
                  <h4 className="font-medium text-gray-800">Live Location</h4>
                  <p className="text-sm text-gray-600">
                    {isLocationEnabled ? '✅ Your location is being shared with your parents' : 'Enable location sharing for safety'}
                  </p>
                </div>
                <Button
                  onClick={isLocationEnabled ? stopLocationTracking : requestLocationPermission}
                  variant={isLocationEnabled ? "secondary" : "default"}
                  className={`${!isLocationEnabled ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600' : 'bg-gray-100'} shadow-md`}
                >
                  {isLocationEnabled ? 'Enabled' : 'Enable Location'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Status Messages */}
          <Card className="md:col-span-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-500" />
                Quick Status Updates
              </CardTitle>
              <CardDescription>
                Send quick updates to your parents with one tap
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
