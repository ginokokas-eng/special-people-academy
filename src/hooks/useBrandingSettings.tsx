import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BrandingSettings {
  platformName: string;
  platformTagline: string;
  logoMarkUrl: string;
  logoFullUrl: string;
  faviconUrl: string;
  footerTextLeft: string;
  footerTextRight: string;
  socialLinks: {
    linkedin: string;
    facebook: string;
    instagram: string;
    youtube: string;
    email: string;
  };
}

const DEFAULT_SETTINGS: BrandingSettings = {
  platformName: 'Special People Academy',
  platformTagline: '',
  logoMarkUrl: '',
  logoFullUrl: '',
  faviconUrl: '',
  footerTextLeft: '© {year} Special People Academy. All rights reserved.',
  footerTextRight: 'Made with ❤️ for every learner',
  socialLinks: {
    linkedin: '',
    facebook: '',
    instagram: '',
    youtube: '',
    email: 'academy@specialpeople.org.uk',
  },
};

/** Public-facing hook: reads branding for all layouts (no auth required for read) */
export function useBranding() {
  const query = useQuery({
    queryKey: ['platform-settings', 'branding'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('settings')
        .eq('section', 'branding')
        .maybeSingle();
      const s = data?.settings as Partial<BrandingSettings> | null;
      return { ...DEFAULT_SETTINGS, ...s, socialLinks: { ...DEFAULT_SETTINGS.socialLinks, ...(s?.socialLinks || {}) } };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
  return query.data ?? DEFAULT_SETTINGS;
}

/** Admin hook: read + write branding settings */
export function useBrandingSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['platform-settings', 'branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('settings')
        .eq('section', 'branding')
        .single();
      if (error) throw error;
      const s = data?.settings as Partial<BrandingSettings> | null;
      return { ...DEFAULT_SETTINGS, ...s, socialLinks: { ...DEFAULT_SETTINGS.socialLinks, ...(s?.socialLinks || {}) } };
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: BrandingSettings) => {
      const previous = settingsQuery.data;
      const { error } = await supabase
        .from('platform_settings')
        .update({
          settings: JSON.parse(JSON.stringify(newSettings)),
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('section', 'branding');
      if (error) throw error;

      // Audit log
      const changes: string[] = [];
      for (const key of Object.keys(newSettings) as (keyof BrandingSettings)[]) {
        if (JSON.stringify(previous?.[key]) !== JSON.stringify(newSettings[key])) {
          changes.push(`${key} changed`);
        }
      }
      if (changes.length > 0) {
        await supabase.from('settings_audit_log').insert([{
          section: 'branding',
          changed_by: user?.id,
          previous_value: JSON.parse(JSON.stringify(previous)),
          new_value: JSON.parse(JSON.stringify(newSettings)),
          change_summary: changes.join('; '),
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings', 'branding'] });
      toast.success('Branding settings saved.');
    },
    onError: (err) => {
      toast.error('Failed to save: ' + (err as Error).message);
    },
  });

  const uploadAsset = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('branding-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('branding-assets').getPublicUrl(path);
    return urlData.publicUrl;
  };

  return {
    settings: settingsQuery.data ?? DEFAULT_SETTINGS,
    isLoading: settingsQuery.isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    uploadAsset,
  };
}
