import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Package, Loader2, CheckCircle2, Info, FileArchive } from 'lucide-react';
import { toast } from 'sonner';

interface ScormPackage {
  id: string;
  title: string;
  version: string;
  launch_path: string;
  created_at: string;
}

export function ScormPackageManager() {
  const [packages, setPackages] = useState<ScormPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', version: '1.2' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('scorm_packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Error fetching SCORM packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a SCORM ZIP file');
      return;
    }
    if (!uploadForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadForm.title);
      formData.append('version', uploadForm.version);

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('upload-scorm', {
        body: formData,
      });

      if (error) throw error;

      toast.success(`SCORM package uploaded — ${data.files_extracted} files extracted`);
      setUploadDialog(false);
      setSelectedFile(null);
      setUploadForm({ title: '', version: '1.2' });
      fetchPackages();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload SCORM package');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              SCORM Packages
            </CardTitle>
            <CardDescription>Upload and manage SCORM content packages</CardDescription>
          </div>
          <Button onClick={() => setUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload SCORM Package
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* HeyGen workflow help */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>HeyGen workflow:</strong> In HeyGen, export your video as SCORM (ZIP) → choose SCORM 1.2 → set completion threshold (e.g. 80% watched) → upload the ZIP here → attach it to a course lesson in the Course Builder.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No SCORM packages uploaded yet.</p>
            <p className="text-sm mt-1">Upload a SCORM ZIP to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{pkg.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Launch: {pkg.launch_path} • {new Date(pkg.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    SCORM {pkg.version}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload SCORM Package</DialogTitle>
            <DialogDescription>
              Upload a SCORM 1.2 ZIP package. The system will extract it and detect the launch file from the manifest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scorm-title">Package Title</Label>
              <Input
                id="scorm-title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Medication Administration - HeyGen Video"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scorm-version">SCORM Version</Label>
              <Select
                value={uploadForm.version}
                onValueChange={(v) => setUploadForm({ ...uploadForm, version: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.2">SCORM 1.2</SelectItem>
                  <SelectItem value="2004">SCORM 2004</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scorm-file">SCORM ZIP File</Label>
              <Input
                id="scorm-file"
                type="file"
                accept=".zip"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading & Extracting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
