
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

const fetchAlertsAndMessages = async (parentId: string) => {
  // Get children first
  const { data: relations } = await supabase
    .from('parent_child_relations')
    .select('child_id')
    .eq('parent_id', parentId);

  if (!relations || relations.length === 0) {
    return { alerts: [], messages: [] };
  }

  const childIds = relations.map(r => r.child_id);

  // Fetch alerts
  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select(`
      *,
      profiles:child_id (full_name)
    `)
    .in('child_id', childIds)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch quick messages
  const { data: messages, error: messagesError } = await supabase
    .from('quick_messages')
    .select(`
      *,
      profiles:child_id (full_name)
    `)
    .in('child_id', childIds)
    .order('sent_at', { ascending: false })
    .limit(10);

  if (alertsError) throw alertsError;
  if (messagesError) throw messagesError;

  return { alerts: alerts || [], messages: messages || [] };
};

const AlertsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts-and-messages', user?.id],
    queryFn: () => fetchAlertsAndMessages(user!.id),
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const markAlertAsRead = async (alertId: string) => {
    try {
      await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      queryClient.invalidateQueries({ queryKey: ['alerts-and-messages', user?.id] });
      toast.success('Alert marked as read');
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Failed to mark alert as read');
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('quick_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      queryClient.invalidateQueries({ queryKey: ['alerts-and-messages', user?.id] });
      toast.success('Message marked as read');
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast.error('Failed to mark message as read');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const { alerts = [], messages = [] } = data || {};
  const unreadAlerts = alerts.filter((alert: any) => !alert.is_read);
  const unreadMessages = messages.filter((msg: any) => !msg.is_read);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Alerts
            {unreadAlerts.length > 0 && (
              <Badge variant="destructive">{unreadAlerts.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Emergency and safety alerts from your children</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No alerts</p>
          ) : (
            alerts.slice(0, 5).map((alert: any) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${!alert.is_read ? 'bg-red-50 border-red-200' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{alert.profiles?.full_name}</span>
                      <Badge variant={alert.alert_type === 'SOS' ? 'destructive' : 'secondary'}>
                        {alert.alert_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!alert.is_read && (
                    <Button size="sm" onClick={() => markAlertAsRead(alert.id)}>
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Messages
            {unreadMessages.length > 0 && (
              <Badge variant="default">{unreadMessages.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Quick status updates from your children</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No messages</p>
          ) : (
            messages.slice(0, 5).map((message: any) => (
              <div
                key={message.id}
                className={`p-4 border rounded-lg ${!message.is_read ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium mb-1">{message.profiles?.full_name}</div>
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(message.sent_at).toLocaleString()}
                    </p>
                  </div>
                  {!message.is_read && (
                    <Button size="sm" variant="outline" onClick={() => markMessageAsRead(message.id)}>
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPanel;
