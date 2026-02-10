import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, FileText, Mail, Calendar, ExternalLink, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

interface CareerApplication {
  id: string;
  full_name: string;
  email: string;
  role_applied_for: string;
  cv_file_url: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-status-warning-bg text-status-warning-foreground dark:bg-warning/20 dark:text-warning',
  reviewed: 'bg-status-info-bg text-status-info-foreground dark:bg-info/20 dark:text-info',
  interview_scheduled: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  hired: 'bg-status-success-bg text-status-success-foreground dark:bg-success/20 dark:text-success',
  rejected: 'bg-status-error-bg text-status-error-foreground dark:bg-destructive/20 dark:text-destructive',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending Review',
  reviewed: 'Reviewed',
  interview_scheduled: 'Interview Scheduled',
  hired: 'Hired',
  rejected: 'Rejected',
};

export default function CareerApplications() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: rolesLoading } = useRoles();
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<CareerApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ status: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isSuperAdmin) {
        navigate('/access-denied');
      } else {
        fetchApplications();
      }
    }
  }, [user, authLoading, rolesLoading, isSuperAdmin, navigate]);

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('career_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load applications');
      console.error(error);
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const openReviewDialog = (application: CareerApplication) => {
    setSelectedApplication(application);
    setFormData({
      status: application.status,
      notes: application.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedApplication) return;

    setSaving(true);
    const { error } = await supabase
      .from('career_applications')
      .update({
        status: formData.status,
        notes: formData.notes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedApplication.id);

    if (error) {
      toast.error('Failed to update application');
      console.error(error);
    } else {
      toast.success('Application updated');
      setDialogOpen(false);
      fetchApplications();
    }
    setSaving(false);
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Career Applications</h1>
          <p className="text-muted-foreground">Review and manage job applications</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Applications ({applications.length})
            </CardTitle>
            <CardDescription>
              All incoming career applications are listed here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No applications yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role Applied</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.full_name}</TableCell>
                      <TableCell>{app.role_applied_for}</TableCell>
                      <TableCell>
                        <a href={`mailto:${app.email}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Mail className="h-4 w-4" />
                          {app.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[app.status] || statusColors.pending}>
                          {statusLabels[app.status] || app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(app.created_at), 'PPp')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openReviewDialog(app)}>
                          Review
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

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              {selectedApplication?.full_name} - {selectedApplication?.role_applied_for}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Email:</span>
                  <a href={`mailto:${selectedApplication.email}`} className="ml-2 text-primary hover:underline">
                    {selectedApplication.email}
                  </a>
                </div>
                <div>
                  <span className="font-medium">Submitted:</span>
                  <span className="ml-2">{format(new Date(selectedApplication.created_at), 'PPp')}</span>
                </div>
              </div>

              {selectedApplication.cv_file_url && (
                <div>
                  <span className="font-medium text-sm">CV/Resume:</span>
                  <a 
                    href={selectedApplication.cv_file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View CV
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selectedApplication.message && (
                <div>
                  <span className="font-medium text-sm">Message:</span>
                  <p className="mt-1 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {selectedApplication.message}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this application..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
