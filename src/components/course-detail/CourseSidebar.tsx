import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Award, 
  FileText, 
  CheckCircle, 
  Clock,
  Shield,
  BookOpen
} from 'lucide-react';

interface CourseSidebarProps {
  isLoggedIn: boolean;
  isEnrolled: boolean;
  isInternal: boolean;
  progress: number;
  hasCertificate: boolean;
  cpdHours: number;
  lessonCount: number;
  resourceCount: number;
  hasPractical: boolean;
  onStart: () => void;
  onEnroll: () => void;
  enrolling: boolean;
}

export function CourseSidebar({
  isLoggedIn,
  isEnrolled,
  isInternal,
  progress,
  hasCertificate,
  cpdHours,
  lessonCount,
  resourceCount,
  hasPractical,
  onStart,
  onEnroll,
  enrolling,
}: CourseSidebarProps) {
  const getButtonContent = () => {
    if (!isLoggedIn) {
      return isInternal ? 'Sign in to access' : 'Subscribe to access';
    }
    if (!isEnrolled) {
      return 'Start course';
    }
    return progress > 0 ? 'Continue learning' : 'Start course';
  };

  const handleClick = () => {
    if (!isLoggedIn || !isEnrolled) {
      onEnroll();
    } else {
      onStart();
    }
  };

  return (
    <Card className="sticky top-6 shadow-lg border-0">
      <CardContent className="p-6 space-y-6">
        {/* Progress section for enrolled users */}
        {isEnrolled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Your progress</span>
              <span className="font-semibold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {progress === 100 && (
              <Badge className="bg-success text-success-foreground">
                <Award className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        )}

        {/* Main CTA */}
        <Button 
          onClick={handleClick} 
          className="w-full h-12 text-base font-semibold"
          disabled={enrolling}
        >
          {enrolling ? 'Processing...' : getButtonContent()}
        </Button>

        <Separator />

        {/* What's included */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            What's included
          </h3>
          
          <ul className="space-y-3">
            {hasCertificate && (
              <li className="flex items-center gap-3 text-sm">
                <Award className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Certificate of completion</span>
              </li>
            )}
            
            <li className="flex items-center gap-3 text-sm">
              <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
              <span>{lessonCount} lessons</span>
            </li>
            
            {resourceCount > 0 && (
              <li className="flex items-center gap-3 text-sm">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{resourceCount} downloadable resources</span>
              </li>
            )}
            
            {hasPractical && (
              <li className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Practical sign-off session</span>
              </li>
            )}
            
            {cpdHours > 0 && (
              <li className="flex items-center gap-3 text-sm">
                <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{cpdHours} CPD hours</span>
              </li>
            )}
          </ul>
        </div>

        <Separator />

        {/* Compliance note */}
        <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
          <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This course supports our training governance and competency records.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}