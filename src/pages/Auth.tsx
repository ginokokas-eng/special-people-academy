import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layouts/PublicLayout';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Determine initial tab based on route
  const initialTab = location.pathname === '/sign-up' ? 'signup' : 'login';
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');

  useEffect(() => {
    if (user && !loading) {
      // User is already logged in, redirect based on role
      redirectBasedOnRole();
    }
  }, [user, loading]);

  const redirectBasedOnRole = async () => {
    if (!user) return;
    
    // Check roles in database
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const roles = rolesData?.map(r => r.role) || [];
    
    if (roles.includes('super_admin') || roles.includes('admin')) {
      navigate('/admin-portal/dashboard');
    } else if (roles.includes('ops_training_admin')) {
      navigate('/admin-portal/courses');
    } else if (roles.includes('trainer')) {
      navigate('/admin-portal/trainer');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error, roles } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      // Redirect based on roles returned from signIn
      if (roles?.includes('super_admin') || roles?.includes('admin')) {
        navigate('/admin-portal/dashboard');
      } else if (roles?.includes('ops_training_admin')) {
        navigate('/admin-portal/courses');
      } else if (roles?.includes('trainer')) {
        navigate('/admin-portal/trainer');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully! Welcome to Special People Academy.');
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      toast.error(result.error.message || 'Failed to sign in with Google');
      setIsSubmitting(false);
      return;
    }

    if (!result.redirected) {
      // Check if user needs role assignment based on email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        await assignRoleByEmail(authUser.email, authUser.id);
        
        // Now fetch the roles and redirect
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id);
        
        const roles = rolesData?.map(r => r.role) || [];
        
        toast.success('Welcome!');
        
        if (roles.includes('super_admin') || roles.includes('admin')) {
          navigate('/admin-portal/dashboard');
        } else if (roles.includes('ops_training_admin')) {
          navigate('/admin-portal/courses');
        } else if (roles.includes('trainer')) {
          navigate('/admin-portal/trainer');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }
    setIsSubmitting(false);
  };

  const assignRoleByEmail = async (email: string, userId: string) => {
    type AppRole = 'admin' | 'learner' | 'trainer' | 'super_admin' | 'ops_training_admin';
    
    // Super admins - same permissions as each other
    const superAdminEmails = [
      'constantine.bentai@specialpeople.org.uk',
      'peter@specialpeople.org.uk',
    ];
    
    // Internal staff with specific roles
    const internalStaff: Record<string, { role: AppRole; canSignOff: boolean }> = {
      'constantine.bentai@specialpeople.org.uk': { role: 'super_admin', canSignOff: true },
      'peter@specialpeople.org.uk': { role: 'super_admin', canSignOff: true },
      'tamar@specialpeople.org.uk': { role: 'ops_training_admin', canSignOff: true },
      'marina@specialpeople.org.uk': { role: 'ops_training_admin', canSignOff: true },
      'elisa@specialpeople.org.uk': { role: 'ops_training_admin', canSignOff: false },
    };

    const normalizedEmail = email.toLowerCase();
    const staffConfig = internalStaff[normalizedEmail];
    
    if (staffConfig) {
      // Check if role already assigned
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', staffConfig.role)
        .maybeSingle();

      if (!existingRole) {
        // Remove default learner role if assigning a staff role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'learner');

        // Assign the correct role
        await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: staffConfig.role }]);
      }

      // Update staff profile link
      await supabase
        .from('staff_profiles')
        .update({ user_id: userId })
        .eq('email', normalizedEmail);
    } else {
      // Non-admin user - ensure they have the learner role
      const { data: existingLearnerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'learner')
        .maybeSingle();

      if (!existingLearnerRole) {
        // Check if they have any role at all
        const { data: anyRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (!anyRole) {
          // Assign default learner role
          await supabase
            .from('user_roles')
            .insert([{ user_id: userId, role: 'learner' }]);
        }
      }
    }
  };

  if (loading) {
    return (
      <PublicLayout title="Sign In">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title={initialTab === 'signup' ? 'Sign Up' : 'Sign In'}>
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome to Special People Academy</h1>
            <p className="text-muted-foreground mt-2">Your journey to learning starts here</p>
          </div>

          <Card className="shadow-lg">
            <Tabs defaultValue={initialTab} className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <CardHeader className="pt-0">
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader className="pt-0">
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Join Special People Academy today</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
    </PublicLayout>
  );
}
