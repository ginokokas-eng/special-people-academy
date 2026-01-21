import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  File
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
    if (!canAccess || !isEnrolled) {
      toast.error('Please enroll in this course to download resources');
      return;
    }

    setDownloading(resource.id);

    try {
      // If resource has a direct URL, open it
      if (resource.url) {
        window.open(resource.url, '_blank');
        return;
      }

      // Otherwise, try to get from storage
      // File path format: {course_id}/{filename}
      const fileName = `${resource.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      const filePath = `${courseId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('course-resources')
        .createSignedUrl(filePath, 60); // 60 seconds expiry

      if (error) {
        // File might not exist yet in storage
        toast.info('This resource is coming soon. Check back later.');
        console.log('Storage error:', error);
        return;
      }

      // Open the signed URL in a new tab
      window.open(data.signedUrl, '_blank');
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading resource:', error);
      toast.error('Failed to download resource');
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
        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                canAccess && isEnrolled 
                  ? 'hover:bg-muted/50 cursor-pointer' 
                  : 'bg-muted/20'
              }`}
              onClick={() => handleDownload(resource)}
            >
              <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
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
                  >
                    {downloading === resource.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>

        {!canAccess || !isEnrolled ? (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              <Lock className="h-4 w-4 inline-block mr-1 -mt-0.5" />
              Enroll in this course to download resources
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
