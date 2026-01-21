import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Lock, 
  Loader2,
  FileSpreadsheet,
  FileImage,
  File,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  order_index: number;
}

interface CourseResourcesProps {
  resources: Resource[];
  courseId: string;
  isEnrolled: boolean;
  canAccess: boolean;
}

export function CourseResources({ 
  resources, 
  courseId, 
  isEnrolled, 
  canAccess 
}: CourseResourcesProps) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  if (resources.length === 0) {
    return null;
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-destructive" />;
      case 'spreadsheet':
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-success" />;
      case 'image':
        return <FileImage className="h-5 w-5 text-primary" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getResourceBadge = (type: string) => {
    return (
      <Badge variant="outline" className="uppercase text-xs">
        {type}
      </Badge>
    );
  };

  const handleDownload = async (resource: Resource) => {
    if (!user) {
      toast.error('Please sign in to download resources');
      return;
    }

    if (!canAccess || !isEnrolled) {
      toast.error('Please enroll in this course to download resources');
      return;
    }

    setDownloading(resource.id);

    try {
      // Call the secure download edge function
      const { data, error } = await supabase.functions.invoke('download-resource', {
        body: { 
          resource_id: resource.id, 
          course_id: courseId 
        }
      });

      if (error) {
        throw error;
      }

      if (data.pending) {
        toast.info(data.message || 'This resource is being prepared. Check back soon.');
        return;
      }

      if (data.url) {
        // Open the signed URL in a new tab
        window.open(data.url, '_blank');
        toast.success(`Downloading: ${data.title || resource.title}`);
      } else {
        toast.error('Unable to generate download link');
      }
    } catch (error: any) {
      console.error('Error downloading resource:', error);
      toast.error(error.message || 'Failed to download resource');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Downloadable Resources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Download these resources to support your learning and practice.
        </p>
        
        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                canAccess && isEnrolled 
                  ? 'hover:bg-muted/50 cursor-pointer hover:border-primary/30' 
                  : 'bg-muted/20 opacity-75'
              }`}
              onClick={() => canAccess && isEnrolled && handleDownload(resource)}
            >
              <div className="flex-shrink-0 p-2.5 bg-muted rounded-lg">
                {getResourceIcon(resource.resource_type)}
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-foreground">{resource.title}</h4>
                  {getResourceBadge(resource.resource_type)}
                </div>
                {resource.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {resource.description}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {canAccess && isEnrolled ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={downloading === resource.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(resource);
                    }}
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    {downloading === resource.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <div className="p-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {(!canAccess || !isEnrolled) && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Resources locked
                </p>
                <p className="text-xs text-muted-foreground">
                  Enroll in this course to download these resources
                </p>
              </div>
            </div>
          </div>
        )}

        {canAccess && isEnrolled && (
          <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>You have full access to all course resources</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
