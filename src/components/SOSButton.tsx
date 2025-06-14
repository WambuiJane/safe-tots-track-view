
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
            battery_level: 100, // You could get actual battery level if available
            speed: 0
          });
      }

      // Send SOS alert
      await supabase
        .from('alerts')
        .insert({
          child_id: user.id,
          alert_type: 'SOS',
          message: `Emergency SOS alert${latitude && longitude ? ` from location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : ''}`
        });

      toast.success('SOS alert sent to your parents!');
    } catch (error) {
      console.error('Error sending SOS alert:', error);
      toast.error('Failed to send SOS alert');
    } finally {
      setIsSending(false);
    }
  };

  const triggerFakeCall = () => {
    // Simulate a fake call interface
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
    
    // Send alert to parents
    sendSOSAlert();
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (fakeCallDiv.parentNode) {
        fakeCallDiv.remove();
      }
    }, 10000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            className="h-20 text-lg bg-red-500 hover:bg-red-600 text-white"
            disabled={isSending}
          >
            <Bell className="h-6 w-6 mr-2" />
            {isSending ? 'Sending...' : 'SOS Emergency'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Emergency Alert?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately notify your parents that you need help and share your current location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={sendSOSAlert}
              className="bg-red-500 hover:bg-red-600"
            >
              Send SOS Alert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button 
        onClick={triggerFakeCall}
        variant="outline"
        className="h-20 text-lg border-2"
      >
        📞 Fake Call
      </Button>
    </div>
  );
};

export default SOSButton;
