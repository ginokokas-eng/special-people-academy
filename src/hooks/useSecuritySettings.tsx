import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SecuritySettings {
  enableEmailPassword: boolean;
  enableMicrosoftLogin: boolean;
  enableGoogleLogin: boolean;
  restrictStaffAccountsToDomains: boolean;
  staffAllowedDomains: string[];
  sessionTimeoutHours: number;
  logoutRedirectUrl: string;
  loginRedirectUrl: string;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  enableEmailPassword: true,
  enableMicrosoftLogin: false,
  enableGoogleLogin: true,
  restrictStaffAccountsToDomains: true,
  staffAllowedDomains: ['specialpeople.org.uk'],
  sessionTimeoutHours: 8,
  logoutRedirectUrl: '/',
  loginRedirectUrl: '/dashboard',
};

export function useSecuritySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['platform-settings', 'security'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('settings')
        .eq('section', 'security')
        .single();

      if (error) throw error;
      return { ...DEFAULT_SETTINGS, ...(data?.settings as Partial<SecuritySettings>) };
    },
    enabled: !!user,
  });

  const auditLogQuery = useQuery({
    queryKey: ['settings-audit-log', 'security'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings_audit_log')
        .select('*')
        .eq('section', 'security')
        .order('changed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: SecuritySettings) => {
      const previous = settingsQuery.data;

      // Upsert settings
      const { error: upsertError } = await supabase
        .from('platform_settings')
        .update({ settings: JSON.parse(JSON.stringify(newSettings)), updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq('section', 'security');

      if (upsertError) throw upsertError;

      // Build change summary
      const changes: string[] = [];
      for (const key of Object.keys(newSettings) as (keyof SecuritySettings)[]) {
        const oldVal = previous?.[key];
        const newVal = newSettings[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);
        }
      }

      if (changes.length > 0) {
        const { error: auditError } = await supabase
          .from('settings_audit_log')
          .insert([{
            section: 'security',
            changed_by: user?.id,
            previous_value: JSON.parse(JSON.stringify(previous)),
            new_value: JSON.parse(JSON.stringify(newSettings)),
            change_summary: changes.join('; '),
          }]);

        if (auditError) console.error('Audit log error:', auditError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings', 'security'] });
      queryClient.invalidateQueries({ queryKey: ['settings-audit-log', 'security'] });
      toast.success('Security settings saved.');
    },
    onError: (err) => {
      toast.error('Failed to save settings: ' + (err as Error).message);
    },
  });

  return {
    settings: settingsQuery.data ?? DEFAULT_SETTINGS,
    isLoading: settingsQuery.isLoading,
    auditLog: auditLogQuery.data ?? [],
    auditLogLoading: auditLogQuery.isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
