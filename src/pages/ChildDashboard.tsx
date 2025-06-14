
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, User, MapPin } from 'lucide-react';
import SOSButton from '@/components/SOSButton';
import QuickMessages from '@/components/QuickMessages';
import { useNavigate } from 'react-router-dom';

const ChildDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);

  useEffect(() => {
    // Check if user is a child
    const checkUserRole = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();

      if (error || data?.user_role !== 'child') {
        navigate('/dashboard');
        return;
      }
    };

    checkUserRole();
  }, [user, navigate]);

  useEffect(() => {
    // Shake detection for emergency alert
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
    await supabase.auth.signOut();
    navigate('/');
  };

  const requestPermissions = async () => {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">Safe Tots Track - Child</h1>
        <div className="flex items-center gap-4">
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>
      </header>
      
      <main className="p-4 md:p-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Stay Safe Dashboard</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
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
                  onClick={requestPermissions}
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
