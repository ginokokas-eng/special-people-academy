import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Loader2, Save, LogOut, Building2, Accessibility, Bell } from '@/components/icons';
import { Switch } from '@/components/ui/switch';
import { haptics } from '@/hooks/useHaptics';
import { useIsNative } from '@/lib/native';
import { toast } from 'sonner';

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
}

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const native = useIsNative();
  // Read once — useHaptics reads the same key at call time, so this state only
  // drives the control, never the gate itself.
  const [hapticsOn, setHapticsOn] = useState(() => localStorage.getItem('spa.haptics') !== 'off');
  const [renewalReminders, setRenewalReminders] = useState(
    () => localStorage.getItem('spa.reminders.renewals') !== 'off',
  );
  const [quietHours, setQuietHours] = useState(
    () => localStorage.getItem('spa.reminders.quiet') !== 'off',
  );
  const [orgName, setOrgName] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    avatar_url: '',
    job_title: '',
    department: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, job_title, department')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          job_title: data.job_title || '',
          department: data.department || '',
        });
      }
      // Home/funding organisation, for the account panel. Read-only, best effort.
      const { data: membership } = await supabase
        .from('organisation_members')
        .select('organisations(name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      const org = (membership as { organisations?: { name?: string } | null } | null)?.organisations;
      if (org?.name) setOrgName(org.name);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          job_title: profile.job_title,
          department: profile.department,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const userInitials = profile.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'U';

  if (authLoading || loading) {
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
      <div className="max-w-2xl mx-auto space-y-6">
        {!native && (
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your account information</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="text-xl gradient-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile.full_name || 'Set your name'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Form */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={profile.avatar_url || ''}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={profile.job_title || ''}
                  onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={profile.department || ''}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Email Address</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {orgName && (
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Organisation
                </p>
                <p className="text-sm text-muted-foreground">{orgName}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'}
              </p>
            </div>

            {native && (
              <div className="rounded-2xl bg-[hsl(var(--learner-wash)/0.05)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-foreground">Reminders</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="renewal-reminders" className="text-sm font-normal leading-relaxed">
                      Renewal reminders
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        30, 14 and 3 days before a certificate expires.
                      </span>
                    </Label>
                    <Switch
                      id="renewal-reminders"
                      checked={renewalReminders}
                      onCheckedChange={(on) => {
                        localStorage.setItem('spa.reminders.renewals', on ? 'on' : 'off');
                        setRenewalReminders(on);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="quiet-hours" className="text-sm font-normal leading-relaxed">
                      Quiet hours
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Nothing between 22:00 and 07:00.
                      </span>
                    </Label>
                    <Switch
                      id="quiet-hours"
                      checked={quietHours}
                      onCheckedChange={(on) => {
                        localStorage.setItem('spa.reminders.quiet', on ? 'on' : 'off');
                        setQuietHours(on);
                      }}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Set a reminder on a specific renewal from the Renewals list.
                </p>
              </div>
            )}

            {native && (
              <div className="rounded-2xl bg-[hsl(var(--learner-wash)/0.05)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Accessibility className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-foreground">Accessibility</h3>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="haptics-toggle" className="text-sm font-normal leading-relaxed">
                    Haptic feedback
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      A short buzz when you answer a question or finish a lesson.
                    </span>
                  </Label>
                  <Switch
                    id="haptics-toggle"
                    checked={hapticsOn}
                    onCheckedChange={(on) => {
                      localStorage.setItem('spa.haptics', on ? 'on' : 'off');
                      setHapticsOn(on);
                      // Confirm with the thing being switched on.
                      if (on) haptics.selection();
                    }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Text size follows your device settings.
                </p>
              </div>
            )}

            {native && (
              <Button
                variant="outline"
                className="pressable w-full h-12 rounded-full text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate('/native-welcome', { replace: true });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Sign out
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
