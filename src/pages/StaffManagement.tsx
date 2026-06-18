import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Users, Shield, ShieldCheck } from 'lucide-react';

type AppRole = 'admin' | 'learner' | 'trainer' | 'super_admin' | 'ops_training_admin';

interface StaffProfile {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  job_title: string | null;
  role: AppRole;
  delivery_types: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const roleLabels: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  ops_training_admin: 'Ops/Training Admin',
  trainer: 'Trainer',
  learner: 'Learner',
};

const roleColors: Record<AppRole, string> = {
  super_admin: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  admin: 'bg-status-error-bg text-status-error-foreground dark:bg-destructive/20 dark:text-destructive',
  ops_training_admin: 'bg-status-info-bg text-status-info-foreground dark:bg-info/20 dark:text-info',
  trainer: 'bg-status-success-bg text-status-success-foreground dark:bg-success/20 dark:text-success',
  learner: 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground',
};

export default function StaffManagement() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    job_title: '',
    role: 'learner' as AppRole,
    delivery_types: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/access-denied');
      } else {
        fetchStaff();
      }
    }
  }, [user, authLoading, rolesLoading, isAdmin, navigate]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load staff profiles');
      console.error(error);
    } else {
      setStaff((data || []) as StaffProfile[]);
    }
    setLoading(false);
  };

  const handleOpenDialog = (staffMember?: StaffProfile) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        email: staffMember.email,
        full_name: staffMember.full_name,
        job_title: staffMember.job_title || '',
        role: staffMember.role,
        delivery_types: staffMember.delivery_types?.join(', ') || '',
        notes: staffMember.notes || '',
      });
    } else {
      setEditingStaff(null);
      setFormData({
        email: '',
        full_name: '',
        job_title: '',
        role: 'learner',
        delivery_types: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const deliveryTypesArray = formData.delivery_types
      ? formData.delivery_types.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      email: formData.email,
      full_name: formData.full_name,
      job_title: formData.job_title || null,
      role: formData.role,
      delivery_types: deliveryTypesArray,
      notes: formData.notes || null,
    };

    if (editingStaff) {
      const { error } = await supabase
        .from('staff_profiles')
        .update(payload)
        .eq('id', editingStaff.id);

      if (error) {
        toast.error('Failed to update staff profile');
        console.error(error);
      } else {
        toast.success('Staff profile updated');
        setDialogOpen(false);
        fetchStaff();
      }
    } else {
      const { error } = await supabase
        .from('staff_profiles')
        .insert(payload);

      if (error) {
        toast.error('Failed to create staff profile');
        console.error(error);
      } else {
        toast.success('Staff profile created');
        setDialogOpen(false);
        fetchStaff();
      }
    }
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <PortalLayout title="Staff Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Staff Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">Manage internal staff accounts and roles</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
                <DialogDescription>
                  {editingStaff ? 'Update staff profile details' : 'Create a new internal staff profile'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="ops_training_admin">Ops/Training Admin</SelectItem>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="learner">Learner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_types">Delivery Types (comma-separated)</Label>
                  <Input
                    id="delivery_types"
                    placeholder="e.g., In-person Practical, Blended"
                    value={formData.delivery_types}
                    onChange={(e) => setFormData({ ...formData, delivery_types: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStaff ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={roleColors.super_admin}>Super Admin</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Full platform access including users, organisations, courses, compliance, reporting, billing, and system settings.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={roleColors.ops_training_admin}>Ops/Training Admin</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage courses, practical sessions, enrollments, attendance, certificates, and compliance reports. Cannot edit pricing or security settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Internal Staff ({staff.length})
            </CardTitle>
            <CardDescription>
              View and manage internal staff profiles and role assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No staff profiles found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Delivery Types</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell>{member.job_title || '-'}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.delivery_types?.length > 0 
                          ? member.delivery_types.join(', ')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? 'default' : 'secondary'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
