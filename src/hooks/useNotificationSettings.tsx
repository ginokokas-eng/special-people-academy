import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface NotificationSettings {
  enableInAppNotifications: boolean;
  enableEmailNotifications: boolean;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  notifyLearnerCourseAssigned: boolean;
  notifyLearnerCourseCompleted: boolean;
  notifyLearnerCertificateIssued: boolean;
  notifyLearnerCertificateExpiring: boolean;
  notifyAdminNewPurchase: boolean;
  notifyTrainerPracticalSignoffRequired: boolean;
  notifyAdminComplianceExpired: boolean;
  certificateExpiryReminderDays: number[];
  practicalSignoffReminderDays: number[];
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enableInAppNotifications: true,
  enableEmailNotifications: true,
  fromName: 'Special People Academy',
  fromEmail: 'training@specialpeople.org.uk',
  replyToEmail: 'training@specialpeople.org.uk',
  notifyLearnerCourseAssigned: true,
  notifyLearnerCourseCompleted: true,
  notifyLearnerCertificateIssued: true,
  notifyLearnerCertificateExpiring: true,
  notifyAdminNewPurchase: true,
  notifyTrainerPracticalSignoffRequired: true,
  notifyAdminComplianceExpired: true,
  certificateExpiryReminderDays: [30, 14, 7],
  practicalSignoffReminderDays: [7, 1],
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['platform-settings', 'notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('settings')
        .eq('section', 'notifications')
        .single();
      if (error) throw error;
      return { ...DEFAULT_SETTINGS, ...(data?.settings as Partial<NotificationSettings>) };
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      const previous = settingsQuery.data;

      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({
          settings: JSON.parse(JSON.stringify(newSettings)),
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('section', 'notifications');
      if (updateError) throw updateError;

      // Audit log
      const changes: string[] = [];
      for (const key of Object.keys(newSettings) as (keyof NotificationSettings)[]) {
        if (JSON.stringify(previous?.[key]) !== JSON.stringify(newSettings[key])) {
          changes.push(`${key}: ${JSON.stringify(previous?.[key])} → ${JSON.stringify(newSettings[key])}`);
        }
      }
      if (changes.length > 0) {
        await supabase.from('settings_audit_log').insert([{
          section: 'notifications',
          changed_by: user?.id,
          previous_value: JSON.parse(JSON.stringify(previous)),
          new_value: JSON.parse(JSON.stringify(newSettings)),
          change_summary: changes.join('; '),
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings', 'notifications'] });
      toast.success('Notification settings saved.');
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
