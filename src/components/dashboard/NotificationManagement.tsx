import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Bell, Send, Users, User, Globe, Trash2, Eye, Plus } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'registered' | 'targeted';
  target_user_id: string | null;
  sender_id: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  target_user?: {
    full_name: string;
    user_id: string;
  };
}

interface User {
  id: string;
  full_name: string;
  user_id: string;
}

export function NotificationManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general' as 'general' | 'registered' | 'targeted',
    target_user_id: '',
  });

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          target_user:profiles!notifications_target_user_id_fkey(full_name, user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, user_id')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'targeted' && !formData.target_user_id) {
      toast({
        title: 'Error',
        description: 'Please select a target user for targeted notifications',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: formData.title,
          message: formData.message,
          type: formData.type as 'general' | 'registered' | 'targeted',
          target_user_id: formData.type === 'targeted' ? formData.target_user_id : null,
          sender_id: user?.id || '',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification sent successfully',
      });

      setFormData({
        title: '',
        message: '',
        type: 'general',
        target_user_id: '',
      });
      setIsCreateModalOpen(false);
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification deleted successfully',
      });

      fetchNotifications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <Globe className="w-4 h-4" />;
      case 'registered':
        return <Users className="w-4 h-4" />;
      case 'targeted':
        return <User className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'general':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'registered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'targeted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notification Management</h2>
          <p className="text-muted-foreground">Send and manage notifications to users</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Notification</DialogTitle>
              <DialogDescription>
                Send a notification to users on the platform
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateNotification} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notification title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Notification message"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type">Notification Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'general' | 'registered' | 'targeted') => 
                    setFormData({ ...formData, type: value, target_user_id: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        General (Everyone)
                      </div>
                    </SelectItem>
                    <SelectItem value="registered">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Registered Users
                      </div>
                    </SelectItem>
                    <SelectItem value="targeted">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Specific User
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.type === 'targeted' && (
                <div>
                  <Label htmlFor="target_user">Target User *</Label>
                  <Select
                    value={formData.target_user_id}
                    onValueChange={(value) => setFormData({ ...formData, target_user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name || 'Unnamed User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">General Notifications</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter(n => n.type === 'general').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Targeted Notifications</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter(n => n.type === 'targeted').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
          <CardDescription>
            All notifications you have sent to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications sent</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first notification
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Notification
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {notification.title}
                        </h3>
                        <Badge className={getTypeColor(notification.type)}>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(notification.type)}
                            {notification.type}
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      {notification.type === 'targeted' && notification.target_user && (
                        <div className="text-xs text-muted-foreground">
                          Target: {notification.target_user.full_name}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sent: {formatDate(notification.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}