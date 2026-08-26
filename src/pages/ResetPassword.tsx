import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from '@/components/icons';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Choose a new password.
 *
 * Reached from a recovery email (which lands here with a session already
 * established by the auth client) and usable by any signed-in learner who
 * wants to set a password — the case that matters most is invited
 * organisation staff, who were provisioned without one.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, loading, updatePassword } = useAuth();
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  // Recovery links arrive as a URL fragment; give the auth client a moment to
  // exchange it before deciding the visitor has no session.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(() => {
      if (!cancelled) setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Please use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Those passwords do not match.');
      return;
    }

    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Password updated — you can use it to sign in from now on.');
    navigate('/my-learning', { replace: true });
  };

  if (loading || checking) {
    return (
      <PublicLayout title="Choose a password">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Choose a password">
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>Choose a password</CardTitle>
            <CardDescription>
              {user
                ? 'Set the password you will use to sign in on the web and in the mobile app.'
                : 'Open the most recent link in your password reset email, then set your password here.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Type it again"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save password
                </Button>
              </form>
            ) : (
              <Button className="w-full" onClick={() => navigate('/auth')}>
                Back to sign in
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
