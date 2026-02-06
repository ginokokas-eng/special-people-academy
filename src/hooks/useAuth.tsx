import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoading: boolean;
  isAdmin: boolean;
  isTrainer: boolean;
  isSuperAdmin: boolean;
  isOpsTrainingAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; roles?: string[] }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOpsTrainingAdmin, setIsOpsTrainingAdmin] = useState(false);

  const checkUserRoles = useCallback(async (userId: string): Promise<string[]> => {
    setRolesLoading(true);
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const roles = data?.map(r => r.role) || [];
      setIsAdmin(roles.includes('admin') || roles.includes('super_admin'));
      setIsTrainer(roles.includes('trainer') || roles.includes('admin') || roles.includes('super_admin') || roles.includes('ops_training_admin'));
      setIsSuperAdmin(roles.includes('super_admin') || roles.includes('admin'));
      setIsOpsTrainingAdmin(roles.includes('ops_training_admin') || roles.includes('super_admin') || roles.includes('admin') || roles.includes('trainer'));
      return roles;
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const clearRoles = useCallback(() => {
    setIsAdmin(false);
    setIsTrainer(false);
    setIsSuperAdmin(false);
    setIsOpsTrainingAdmin(false);
    setRolesLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch role BEFORE setting loading false
        if (session?.user) {
          await checkUserRoles(session.user.id);
        } else {
          clearRoles();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential deadlock
          setTimeout(() => {
            if (isMounted) {
              checkUserRoles(session.user.id);
            }
          }, 0);
        } else {
          clearRoles();
        }
        
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkUserRoles, clearRoles]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.user) {
      const roles = await checkUserRoles(data.user.id);
      return { error: null, roles };
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearRoles();
  };

  const refreshRoles = async (): Promise<string[]> => {
    if (user) {
      return await checkUserRoles(user.id);
    }
    return [];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      rolesLoading,
      isAdmin, 
      isTrainer, 
      isSuperAdmin, 
      isOpsTrainingAdmin, 
      signUp, 
      signIn, 
      signOut,
      refreshRoles 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
