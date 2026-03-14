import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface GeneralSettings {
  organisationName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  timezone: string;
  currency: string;
  defaultCertificateExpiryMonthsAwareness: number;
  defaultCertificateExpiryMonthsCompetency: number;
  defaultQuizPassMark: number;
  defaultQuizAttempts: number;
  learnerCoursesNavDestination: 'my-courses' | 'catalog';
  enableCareerApplications: boolean;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  organisationName: 'Special People Training',
  supportEmail: 'training@specialpeople.org.uk',
  supportPhone: '',
  address: '',
  timezone: 'Europe/London',
  currency: 'GBP',
  defaultCertificateExpiryMonthsAwareness: 24,
  defaultCertificateExpiryMonthsCompetency: 12,
  defaultQuizPassMark: 80,
  defaultQuizAttempts: 2,
  learnerCoursesNavDestination: 'my-courses',
  enableCareerApplications: false,
};

/** Public-facing hook: reads general settings (no auth required) */
export function useGeneralSettings() {
  const query = useQuery({
    queryKey: ['platform-settings', 'general'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('settings')
        .eq('section', 'general')
        .maybeSingle();
      const s = data?.settings as Partial<GeneralSettings> | null;
      return { ...DEFAULT_SETTINGS, ...s };
    },
    staleTime: 5 * 60 * 1000,
  });
  return query.data ?? DEFAULT_SETTINGS;
}

/** Admin hook: read + write general settings */
export function useGeneralSettingsAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['platform-settings', 'general'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('settings')
        .eq('section', 'general')
        .single();
      if (error) throw error;
      const s = data?.settings as Partial<GeneralSettings> | null;
      return { ...DEFAULT_SETTINGS, ...s };
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: GeneralSettings) => {
      const previous = settingsQuery.data;
      const { error } = await supabase
        .from('platform_settings')
        .update({
          settings: JSON.parse(JSON.stringify(newSettings)),
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('section', 'general');
      if (error) throw error;

      // Audit log
      const changes: string[] = [];
      for (const key of Object.keys(newSettings) as (keyof GeneralSettings)[]) {
        if (JSON.stringify(previous?.[key]) !== JSON.stringify(newSettings[key])) {
          changes.push(`${key} changed`);
        }
      }
      if (changes.length > 0) {
        await supabase.from('settings_audit_log').insert([{
          section: 'general',
          changed_by: user?.id,
          previous_value: JSON.parse(JSON.stringify(previous)),
          new_value: JSON.parse(JSON.stringify(newSettings)),
          change_summary: changes.join('; '),
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings', 'general'] });
      toast.success('General settings saved.');
    },
    onError: (err) => {
      toast.error('Failed to save: ' + (err as Error).message);
    },
  });

  return {
    settings: settingsQuery.data ?? DEFAULT_SETTINGS,
    isLoading: settingsQuery.isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
