import { useState, useEffect, useRef } from 'react';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Upload, Image, Type, Globe, X } from 'lucide-react';
import { useBrandingSettings, type BrandingSettings } from '@/hooks/useBrandingSettings';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

function LogoUploadField({ label, description, value, onUpload, onClear }: {
  label: string; description: string; value: string;
  onUpload: (file: File) => Promise<void>; onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('File must be under 2 MB.'); return; }
    setUploading(true);
    try { await onUpload(file); } catch (err) { toast.error('Upload failed: ' + (err as Error).message); }
    finally { setUploading(false); if (ref.current) ref.current.value = ''; }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden">
            <img src={value} alt={label} className="h-full w-full object-contain" />
          </div>
          <Button variant="outline" size="sm" onClick={onClear}><X className="h-3 w-3 mr-1" />Remove</Button>
        </div>
      ) : (
        <div>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <Button variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />{uploading ? 'Uploading…' : 'Upload Image'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BrandingSettingsPage() {
  const { settings, isLoading, save, isSaving, uploadAsset } = useBrandingSettings();
  const [form, setForm] = useState<BrandingSettings>(settings);

  useEffect(() => { if (!isLoading) setForm(settings); }, [isLoading, settings]);

  const handleSave = () => save(form);

  const handleUpload = (field: 'logoMarkUrl' | 'logoFullUrl' | 'faviconUrl') => async (file: File) => {
    const url = await uploadAsset(file, field.replace('Url', ''));
    setForm(p => ({ ...p, [field]: url }));
    toast.success('Image uploaded.');
  };

  if (isLoading) {
    return (
      <PortalLayout title="Branding">
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Branding">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin-portal/settings"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Branding</h1>
            <p className="text-muted-foreground mt-1">Manage platform identity, logos, and footer content.</p>
          </div>
        </div>

        {/* A) Platform Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5 text-primary" />Platform Identity</CardTitle>
            <CardDescription>Set the name and tagline shown across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input id="platformName" value={form.platformName} onChange={e => setForm(p => ({ ...p, platformName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platformTagline">Tagline (optional)</Label>
                <Input id="platformTagline" value={form.platformTagline} onChange={e => setForm(p => ({ ...p, platformTagline: e.target.value }))} placeholder="e.g. Empowering every learner" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B) Logo Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5 text-primary" />Logo Assets</CardTitle>
            <CardDescription>Upload logos displayed in headers and browser tabs. Max 2 MB each.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <LogoUploadField
              label="Logo Mark (Header Icon)"
              description="Small square icon shown in navigation headers. Recommended 64×64 px or larger."
              value={form.logoMarkUrl}
              onUpload={handleUpload('logoMarkUrl')}
              onClear={() => setForm(p => ({ ...p, logoMarkUrl: '' }))}
            />
            <Separator />
            <LogoUploadField
              label="Full Logo (optional)"
              description="Wide logo with text, used in footer or email templates."
              value={form.logoFullUrl}
              onUpload={handleUpload('logoFullUrl')}
              onClear={() => setForm(p => ({ ...p, logoFullUrl: '' }))}
            />
            <Separator />
            <LogoUploadField
              label="Favicon (optional)"
              description="Browser tab icon. Recommended 32×32 px PNG."
              value={form.faviconUrl}
              onUpload={handleUpload('faviconUrl')}
              onClear={() => setForm(p => ({ ...p, faviconUrl: '' }))}
            />
          </CardContent>
        </Card>

        {/* C) Footer + Social Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Footer &amp; Social Links</CardTitle>
            <CardDescription>Customise footer text and social media links.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="footerLeft">Footer Text (Left)</Label>
                <Input id="footerLeft" value={form.footerTextLeft} onChange={e => setForm(p => ({ ...p, footerTextLeft: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Use {'{year}'} for the current year.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerRight">Footer Text (Right)</Label>
                <Input id="footerRight" value={form.footerTextRight} onChange={e => setForm(p => ({ ...p, footerTextRight: e.target.value }))} />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-medium">Social Links</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['linkedin', 'facebook', 'instagram', 'youtube', 'email'] as const).map(key => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`social-${key}`} className="capitalize">{key}</Label>
                    <Input
                      id={`social-${key}`}
                      type={key === 'email' ? 'email' : 'url'}
                      placeholder={key === 'email' ? 'name@example.com' : `https://${key}.com/...`}
                      value={form.socialLinks[key]}
                      onChange={e => setForm(p => ({ ...p, socialLinks: { ...p.socialLinks, [key]: e.target.value } }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving…' : 'Save Branding Settings'}
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
