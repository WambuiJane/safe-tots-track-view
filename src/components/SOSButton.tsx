
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

const SOSButton = () => {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);

  const sendSOSAlert = async () => {
    if (!user) return;

    setIsSending(true);
    try {
      // Get current location if available
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;

          // Save current location
          await supabase
            .from('location_history')
            .insert({
              child_id: user.id,
              latitude,
              longitude,
              recorded_at: new Date().toISOString()
            });
        } catch (error) {
          console.log('Could not get location for SOS alert');
        }
      }

      // Send SOS alert
      await supabase
        .from('alerts')
        .insert({
          child_id: user.id,
          alert_type: 'SOS',
          message: `🚨 EMERGENCY SOS ALERT 🚨${latitude && longitude ? ` Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : ''}`
        });

      toast.success('🚨 SOS alert sent to your parents!');
    } catch (error) {
      console.error('Error sending SOS alert:', error);
      toast.error('Failed to send SOS alert');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          className="w-full h-20 text-xl bg-red-500 hover:bg-red-600 text-white font-bold"
          disabled={isSending}
        >
          <Bell className="h-8 w-8 mr-3" />
          {isSending ? '📤 Sending...' : '🚨 SOS EMERGENCY'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Send Emergency Alert?</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately notify your parents that you need help and share your current location. Only use in real emergencies.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={sendSOSAlert}
            className="bg-red-500 hover:bg-red-600"
          >
            🚨 Send SOS Alert
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SOSButton;
