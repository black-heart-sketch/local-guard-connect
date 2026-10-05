import { useEffect, useMemo, useState } from 'react';
import { Calendar, Edit, Mail, MapPin, Phone, Search, Shield, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch, type ApiUser } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Jurisdiction = Record<string, string>;
type ManagedUser = ApiUser & { location?: Jurisdiction | string };

const roles = ['citizen', 'dispatcher', 'police', 'gendarmerie', 'fire', 'medical', 'ngo', 'council', 'admin'] as const;

function titleCase(value?: string) {
  return value ? value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'Citizen';
}

function formatLocation(location?: Jurisdiction | string) {
  if (!location) return '';
  if (typeof location === 'string') return location;
  const orderedKeys = ['quarter', 'village', 'town', 'subdivision', 'division', 'region'];
  const values = orderedKeys.map(key => location[key]).filter(Boolean);
  return [...new Set(values)].join(', ');
}

function roleColor(role?: string) {
  if (role === 'admin') return 'border-red-200 bg-red-100 text-red-800';
  if (['police', 'gendarmerie', 'dispatcher'].includes(role || '')) return 'border-primary/20 bg-primary/10 text-primary';
  if (role === 'citizen') return 'border-green-200 bg-green-100 text-green-800';
  return 'border-amber-200 bg-amber-100 text-amber-800';
}

export function UserManagement() {
  const { user: currentUser, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formData, setFormData] = useState({ fullName: '', phone: '', town: '', role: 'citizen' });
  const canManageUsers = currentUserProfile?.role === 'admin';

  useEffect(() => {
    if (!canManageUsers) { setLoading(false); return; }
    let active = true;
    void apiFetch<ManagedUser[]>('/users')
      .then(data => { if (active) setUsers(data); })
      .catch(error => toast({ title: 'Unable to load users', description: error instanceof Error ? error.message : 'User list request failed', variant: 'destructive' }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canManageUsers, toast]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter(user => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (!query) return true;
      return [user.full_name, user.email, user.phone, user.role, formatLocation(user.location)]
        .some(value => value?.toLowerCase().includes(query));
    });
  }, [roleFilter, searchTerm, users]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(user => user.role === 'admin').length,
    responders: users.filter(user => ['dispatcher', 'police', 'gendarmerie', 'fire', 'medical'].includes(user.role || '')).length,
    citizens: users.filter(user => user.role === 'citizen').length,
  }), [users]);

  async function patchUser(userId: string, updates: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    try {
      const updated = await apiFetch<ManagedUser>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) });
      setUsers(current => current.map(user => user.id === userId ? updated : user));
      toast({ title: 'Saved', description: successMessage });
      return updated;
    } catch (error) {
      toast({ title: 'Update failed', description: error instanceof Error ? error.message : 'Unable to update this user', variant: 'destructive' });
      return null;
    } finally { setSaving(false); }
  }

  async function updateRole(userId: string, role: string) {
    await patchUser(userId, { role }, `Role changed to ${titleCase(role)}`);
  }

  function openEdit(user: ManagedUser) {
    const jurisdiction = typeof user.location === 'object' && user.location ? user.location : {};
    setEditingUser(user);
    setFormData({ fullName: user.full_name || '', phone: user.phone || '', town: jurisdiction.town || (typeof user.location === 'string' ? user.location : ''), role: user.role || 'citizen' });
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    const existingJurisdiction = typeof editingUser.location === 'object' && editingUser.location ? editingUser.location : {};
    const updated = await patchUser(editingUser.id, { fullName: formData.fullName, phone: formData.phone || null, role: formData.role, jurisdiction: { ...existingJurisdiction, town: formData.town } }, 'User profile updated');
    if (updated) setEditingUser(null);
  }

  async function deactivateUser(user: ManagedUser) {
    if (user.id === currentUser?.id) return;
    if (!window.confirm(`Deactivate ${user.full_name || user.email || 'this user'}? They will no longer be able to sign in.`)) return;
    try {
      await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
      setUsers(current => current.filter(item => item.id !== user.id));
      toast({ title: 'User deactivated', description: 'The account can no longer sign in.' });
    } catch (error) {
      toast({ title: 'Deactivation failed', description: error instanceof Error ? error.message : 'Unable to deactivate this user', variant: 'destructive' });
    }
  }

  if (!canManageUsers) return <Alert><Shield className="h-4 w-4" /><AlertDescription>You do not have permission to manage users. Administrator access is required.</AlertDescription></Alert>;

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Total users', stats.total, Users], ['Administrators', stats.admins, Shield], ['Responders', stats.responders, Shield], ['Citizens', stats.citizens, Users],
      ].map(([label, value, Icon]) => <Card key={String(label)}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{String(label)}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{String(value)}</div></CardContent></Card>)}
    </div>

    <Card>
      <CardHeader><CardTitle>User management</CardTitle><CardDescription>Search accounts and manage roles, contact information, and access.</CardDescription></CardHeader>
      <CardContent><div className="grid gap-3 md:grid-cols-[1fr_14rem_auto]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search users" placeholder="Search name, email, phone or location" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} className="pl-10" /></div><Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger aria-label="Filter by role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map(role => <SelectItem key={role} value={role}>{titleCase(role)}</SelectItem>)}</SelectContent></Select><div className="flex items-center text-sm text-muted-foreground">{filteredUsers.length} of {users.length} users</div></div></CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>System users</CardTitle><CardDescription>Only administrators can change or deactivate accounts.</CardDescription></CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filteredUsers.length === 0 ? <div className="py-10 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-10 w-10" /><p>No users match the current filters.</p></div> : <div className="space-y-3">
          {filteredUsers.map(user => {
            const location = formatLocation(user.location);
            const isCurrentUser = user.id === currentUser?.id;
            return <article key={user.id} className="rounded-lg border p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{user.full_name || 'Unnamed user'}</h3><Badge className={roleColor(user.role)}>{titleCase(user.role)}</Badge>{isCurrentUser && <Badge variant="outline">You</Badge>}</div><div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  {user.email && <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{user.email}</span>}
                  {user.phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{user.phone}</span>}
                  {location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{location}</span>}
                  {user.created_at && <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />Joined {new Date(user.created_at).toLocaleDateString()}</span>}
                </div></div>
                <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(user)}><Edit />Edit</Button><Select value={user.role || 'citizen'} onValueChange={role => void updateRole(user.id, role)} disabled={saving || isCurrentUser}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role} value={role}>{titleCase(role)}</SelectItem>)}</SelectContent></Select><Button variant="ghost" size="sm" disabled={isCurrentUser} onClick={() => void deactivateUser(user)} className="text-destructive hover:text-destructive"><Trash2 />Deactivate</Button></div>
              </div>
            </article>;
          })}
        </div>}
      </CardContent>
    </Card>

    <Dialog open={Boolean(editingUser)} onOpenChange={open => { if (!open) setEditingUser(null); }}><DialogContent><DialogHeader><DialogTitle>Edit user</DialogTitle><DialogDescription>Update the account information and operational role.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submitEdit}><div className="space-y-2"><Label htmlFor="managed-name">Full name</Label><Input id="managed-name" value={formData.fullName} onChange={event => setFormData(current => ({ ...current, fullName: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="managed-phone">Cameroon phone number</Label><Input id="managed-phone" value={formData.phone} onChange={event => setFormData(current => ({ ...current, phone: event.target.value }))} placeholder="+2376XXXXXXXX" /></div><div className="space-y-2"><Label htmlFor="managed-town">Town</Label><Input id="managed-town" value={formData.town} onChange={event => setFormData(current => ({ ...current, town: event.target.value }))} /></div><div className="space-y-2"><Label>Role</Label><Select value={formData.role} onValueChange={role => setFormData(current => ({ ...current, role }))} disabled={editingUser?.id === currentUser?.id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role} value={role}>{titleCase(role)}</SelectItem>)}</SelectContent></Select></div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div></form></DialogContent></Dialog>
  </div>;
}
