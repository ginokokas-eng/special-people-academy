import { useState, useEffect } from 'react';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell, Mail, ArrowLeft, Info, Save, SendHorizonal,
  Plus, X, AlertTriangle, Users, GraduationCap, Shield
} from 'lucide-react';
import { useNotificationSettings, type NotificationSettings } from '@/hooks/useNotificationSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function NotificationSettingsPage() {
  const { settings, isLoading, save, isSaving } = useNotificationSettings();
  const { user } = useAuth();
  const [form, setForm] = useState<NotificationSettings>(settings);
  const [newExpiryDay, setNewExpiryDay] = useState('');
  const [newSignoffDay, setNewSignoffDay] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!isLoading) setForm(settings);
  }, [isLoading, settings]);

  const handleSave = () => save(form);

  const addDay = (field: 'certificateExpiryReminderDays' | 'practicalSignoffReminderDays', value: string, setter: (v: string) => void) => {
    const num = parseInt(value);
    if (!num || num < 1) return;
    if (form[field].includes(num)) { toast.error('Already added.'); return; }
    setForm(prev => ({ ...prev, [field]: [...prev[field], num].sort((a, b) => b - a) }));
    setter('');
  };

  const removeDay = (field: 'certificateExpiryReminderDays' | 'practicalSignoffReminderDays', val: number) => {
    setForm(prev => ({ ...prev, [field]: prev[field].filter(d => d !== val) }));
  };

  const sendTestNotification = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        user_id: user.id,
        title: '🔔 Test Notification',
        message: 'This is a test notification from the admin settings page. If you can see this, in-app notifications are working!',
        type: 'test',
        link: '/admin-portal/settings/notifications',
      }]);
      if (error) throw error;
      toast.success('Test notification sent! Check the bell icon.');
    } catch (err) {
      toast.error('Failed to send test: ' + (err as Error).message);
    } finally {
      setSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <PortalLayout title="Notification Settings">
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Notification Settings">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin-portal/settings"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Notification Settings</h1>
            <p className="text-muted-foreground mt-1">Configure how and when notifications are sent.</p>
          </div>
        </div>

        {/* A) Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Channels
            </CardTitle>
            <CardDescription>Enable or disable notification delivery methods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>In-App Notifications</Label>
                <p className="text-xs text-muted-foreground">Show notifications in the bell icon panel.</p>
              </div>
              <Switch checked={form.enableInAppNotifications} onCheckedChange={v => setForm(p => ({ ...p, enableInAppNotifications: v }))} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send notification emails for important events.</p>
              </div>
              <Switch checked={form.enableEmailNotifications} onCheckedChange={v => setForm(p => ({ ...p, enableEmailNotifications: v }))} />
            </div>
          </CardContent>
        </Card>

        {/* B) Email Sender Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Sender Settings
            </CardTitle>
            <CardDescription>Configure the sender identity for notification emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="default" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                Email provider not configured — emails won't send until connected. These settings will apply once an email provider is set up.
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input id="fromName" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input id="fromEmail" type="email" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replyTo">Reply-To Email</Label>
                <Input id="replyTo" type="email" value={form.replyToEmail} onChange={e => setForm(p => ({ ...p, replyToEmail: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* C) Event Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Learner Event Notifications
            </CardTitle>
            <CardDescription>Choose which events trigger notifications for learners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              ['notifyLearnerCourseAssigned', 'Course Assigned', 'When a learner is assigned a new course.'],
              ['notifyLearnerCourseCompleted', 'Course Completed', 'When a learner completes a course.'],
              ['notifyLearnerCertificateIssued', 'Certificate Issued', 'When a certificate is generated.'],
              ['notifyLearnerCertificateExpiring', 'Certificate Expiring', 'Reminder before certificate expires.'],
            ] as const).map(([key, label, desc], i) => (
              <div key={key}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <div><Label>{label}</Label><p className="text-xs text-muted-foreground">{desc}</p></div>
                  <Switch checked={form[key]} onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin &amp; Trainer Event Notifications
            </CardTitle>
            <CardDescription>Choose which events trigger notifications for staff.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              ['notifyAdminNewPurchase', 'New Purchase', 'When a learner purchases a course or booking.'],
              ['notifyTrainerPracticalSignoffRequired', 'Practical Sign-off Required', 'When a learner needs practical assessment.'],
              ['notifyAdminComplianceExpired', 'Compliance Expired', 'When a staff compliance requirement expires.'],
            ] as const).map(([key, label, desc], i) => (
              <div key={key}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <div><Label>{label}</Label><p className="text-xs text-muted-foreground">{desc}</p></div>
                  <Switch checked={form[key]} onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* D) Reminder Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Reminder Rules
            </CardTitle>
            <CardDescription>Configure how many days in advance reminders are sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Certificate Expiry Reminders (days before)</Label>
              <div className="flex flex-wrap gap-2">
                {form.certificateExpiryReminderDays.map(d => (
                  <Badge key={d} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {d} days
                    <button onClick={() => removeDay('certificateExpiryReminderDays', d)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input type="number" min={1} placeholder="e.g. 30" value={newExpiryDay} onChange={e => setNewExpiryDay(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDay('certificateExpiryReminderDays', newExpiryDay, setNewExpiryDay))} className="max-w-[120px]" />
                <Button variant="outline" size="sm" onClick={() => addDay('certificateExpiryReminderDays', newExpiryDay, setNewExpiryDay)}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Practical Sign-off Reminders (days before)</Label>
              <div className="flex flex-wrap gap-2">
                {form.practicalSignoffReminderDays.map(d => (
                  <Badge key={d} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {d} days
                    <button onClick={() => removeDay('practicalSignoffReminderDays', d)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input type="number" min={1} placeholder="e.g. 7" value={newSignoffDay} onChange={e => setNewSignoffDay(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDay('practicalSignoffReminderDays', newSignoffDay, setNewSignoffDay))} className="max-w-[120px]" />
                <Button variant="outline" size="sm" onClick={() => addDay('practicalSignoffReminderDays', newSignoffDay, setNewSignoffDay)}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* F) Test & Save */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SendHorizonal className="h-5 w-5 text-primary" />
              Test Notification
            </CardTitle>
            <CardDescription>Send a test notification to yourself to verify the setup.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={sendTestNotification} disabled={sendingTest}>
              <Bell className="h-4 w-4 mr-2" />
              {sendingTest ? 'Sending…' : 'Send Test Notification'}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving…' : 'Save Notification Settings'}
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
