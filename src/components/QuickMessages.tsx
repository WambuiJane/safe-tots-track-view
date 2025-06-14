
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const quickMessageTemplates = [
  "Reached school safely 🏫",
  "After soccer practice, home in 20 min ⚽",
  "On my way home 🏠",
  "With friends at the park 🌳",
  "At grandma's house 👵",
  "Study group at library 📚",
  "Walking home, will be there soon 🚶",
  "Safe and sound! 👍",
  "At the mall with friends 🛍️",
  "Having lunch, back to school soon 🍕"
];

const QuickMessages = () => {
  const { user } = useAuth();
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  const sendQuickMessage = async (message: string) => {
    if (!user) return;

    setSendingMessage(message);
    try {
      // Get current location if available for context
      let locationText = '';
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 3000,
              enableHighAccuracy: false
            });
          });
          locationText = ` (at ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`;
        } catch (error) {
          console.log('Could not get location for message context');
        }
      }

      await supabase
        .from('quick_messages')
        .insert({
          child_id: user.id,
          message: message + locationText
        });

      toast.success('Message sent to your parents! 📱');
    } catch (error) {
      console.error('Error sending quick message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {quickMessageTemplates.map((message, index) => (
        <Button
          key={index}
          variant="outline"
          className="h-auto p-4 text-left justify-start hover:bg-blue-50"
          onClick={() => sendQuickMessage(message)}
          disabled={sendingMessage === message}
        >
          {sendingMessage === message ? '📤 Sending...' : message}
        </Button>
      ))}
    </div>
  );
};

export default QuickMessages;
