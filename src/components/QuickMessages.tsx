
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const quickMessageTemplates = [
  "Reached school safely 🏫",
  "On my way home 🏠",
  "At soccer practice ⚽",
  "With friends at the park 🌳",
  "At grandma's house 👵",
  "Study group at library 📚",
  "Walking home, will be there in 20 min 🚶",
  "Safe and sound! 👍"
];

const QuickMessages = () => {
  const { user } = useAuth();
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  const sendQuickMessage = async (message: string) => {
    if (!user) return;

    setSendingMessage(message);
    try {
      await supabase
        .from('quick_messages')
        .insert({
          child_id: user.id,
          message
        });

      toast.success('Message sent to your parents!');
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
          className="h-auto p-4 text-left justify-start"
          onClick={() => sendQuickMessage(message)}
          disabled={sendingMessage === message}
        >
          {sendingMessage === message ? 'Sending...' : message}
        </Button>
      ))}
    </div>
  );
};

export default QuickMessages;
