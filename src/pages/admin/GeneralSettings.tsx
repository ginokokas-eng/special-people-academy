import { useState, useEffect } from 'react';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Building2, GraduationCap, Layout, ToggleRight } from 'lucide-react';
import { useGeneralSettingsAdmin, type GeneralSettings } from '@/hooks/useGeneralSettings';
import { Textarea } from '@/components/ui/textarea';

export default function GeneralSettingsPage() {
  const { settings, isLoading, save, isSaving } = useGeneralSettingsAdmin();
  const [form, setForm] = useState<GeneralSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    await save(form);
  };

  const update = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <PortalLayout title="General Settings">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="General Settings">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">General Settings</h1>
            <p className="text-muted-foreground mt-1">Organisation profile, training defaults, and feature controls.</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>

        {/* A) Organisation Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organisation Profile
            </CardTitle>
            <CardDescription>Your organisation's identity and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="organisationName">Organisation Name</Label>
                <Input id="organisationName" value={form.organisationName} onChange={e => update('organisationName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" type="email" value={form.supportEmail} onChange={e => update('supportEmail', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportPhone">Support Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="supportPhone" value={form.supportPhone} onChange={e => update('supportPhone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={form.timezone} onValueChange={v => update('timezone', v)}>
                  <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Europe/Dublin">Europe/Dublin</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="America/Chicago">America/Chicago</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                    <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={form.currency} onValueChange={v => update('currency', v)}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="address" rows={2} value={form.address} onChange={e => update('address', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* B) Default Training Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Default Training Rules
            </CardTitle>
            <CardDescription>Global defaults for certificates and quizzes. Individual courses can override these.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expiryAwareness">Awareness Certificate Expiry (months)</Label>
                <Input id="expiryAwareness" type="number" min={1} value={form.defaultCertificateExpiryMonthsAwareness}
                  onChange={e => update('defaultCertificateExpiryMonthsAwareness', parseInt(e.target.value) || 24)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryCompetency">Competency Certificate Expiry (months)</Label>
                <Input id="expiryCompetency" type="number" min={1} value={form.defaultCertificateExpiryMonthsCompetency}
                  onChange={e => update('defaultCertificateExpiryMonthsCompetency', parseInt(e.target.value) || 12)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quizPassMark">Default Quiz Pass Mark (%)</Label>
                <Input id="quizPassMark" type="number" min={1} max={100} value={form.defaultQuizPassMark}
                  onChange={e => update('defaultQuizPassMark', parseInt(e.target.value) || 80)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quizAttempts">Default Quiz Attempts</Label>
                <Input id="quizAttempts" type="number" min={1} value={form.defaultQuizAttempts}
                  onChange={e => update('defaultQuizAttempts', parseInt(e.target.value) || 2)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* C) Portal Behaviour */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              Portal Behaviour
            </CardTitle>
            <CardDescription>Control how learners navigate the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coursesNav">Learner "Courses" Link Destination</Label>
              <Select value={form.learnerCoursesNavDestination} onValueChange={v => update('learnerCoursesNavDestination', v as 'my-courses' | 'catalog')}>
                <SelectTrigger id="coursesNav"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="my-courses">My Courses (assigned/bought)</SelectItem>
                  <SelectItem value="catalog">Course Catalog (browse all)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">When a logged-in learner clicks "Courses", they will be taken to this page.</p>
            </div>
          </CardContent>
        </Card>

        {/* D) Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToggleRight className="h-5 w-5 text-primary" />
              Feature Toggles
            </CardTitle>
            <CardDescription>Enable or disable platform features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Career Applications</Label>
                <p className="text-xs text-muted-foreground mt-0.5">When disabled, the Careers page and application form are hidden from the site.</p>
              </div>
              <Switch checked={form.enableCareerApplications} onCheckedChange={v => update('enableCareerApplications', v)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
