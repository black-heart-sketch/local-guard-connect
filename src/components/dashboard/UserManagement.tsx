import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Users, Edit, Trash2, Plus, UserPlus, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function UserManagement() {
  const { profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    role: 'citizen'
  });

  useEffect(() => {
    fetchAllProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, roleFilter]);

  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user profiles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = [...profiles];

    if (searchTerm) {
      filtered = filtered.filter(profile =>
        profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(profile => profile.role === roleFilter);
    }

    setFilteredProfiles(filtered);
  };

  const updateUserRole = async (profileId: string, newRole: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString() 
        })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(profiles.map(profile =>
        profile.id === profileId ? { ...profile, role: newRole } : profile
      ));

      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString() 
        })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(profiles.map(profile =>
        profile.id === profileId ? { ...profile, ...updates } : profile
      ));

      setIsEditModalOpen(false);
      setEditingProfile(null);
      setFormData({ full_name: '', phone: '', location: '', role: 'citizen' });

      toast({
        title: 'Success',
        description: 'User profile updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user profile',
        variant: 'destructive',
      });
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this user profile? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(profiles.filter(profile => profile.id !== profileId));

      toast({
        title: 'Success',
        description: 'User profile deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user profile',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      location: profile.location || '',
      role: profile.role || 'citizen'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (editingProfile) {
      updateProfile(editingProfile.id, formData);
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'police':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'citizen':
        return 'bg-green-100 text-green-800 border-green-200';
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

  const getUniqueRoles = () => {
    return [...new Set(profiles.map(profile => profile.role))].filter(Boolean);
  };

  const stats = {
    total: profiles.length,
    admin: profiles.filter(p => p.role === 'admin').length,
    police: profiles.filter(p => p.role === 'police').length,
    citizen: profiles.filter(p => p.role === 'citizen').length,
  };

  const canManageUsers = currentUserProfile?.role === 'admin';

  if (!canManageUsers) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage users. Admin access required.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.admin}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Police</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.police}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citizens</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.citizen}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            <CardTitle>User Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {getUniqueRoles().map((role) => (
                  <SelectItem key={role} value={role}>
                    {role?.charAt(0).toUpperCase() + role?.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              Showing {filteredProfiles.length} of {profiles.length} users
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            Manage user profiles, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No users have been registered yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground text-lg">
                          {profile.full_name || 'Unnamed User'}
                        </h3>
                        <Badge className={getRoleColor(profile.role)}>
                          {profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {profile.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            {profile.phone}
                          </div>
                        )}
                        {profile.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {profile.location}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Joined {formatDate(profile.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(profile)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Select
                        value={profile.role || 'citizen'}
                        onValueChange={(value) => updateUserRole(profile.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="citizen">Citizen</SelectItem>
                          <SelectItem value="police">Police</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProfile(profile.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen</SelectItem>
                  <SelectItem value="police">Police</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>
              Update Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}