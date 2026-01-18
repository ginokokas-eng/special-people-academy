import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Award, FileCheck, Target } from 'lucide-react';

interface CourseAssessmentProps {
  passMark: number;
  assessmentDetails?: string;
  certificateDetails?: string;
  hasPractical: boolean;
}

export function CourseAssessment({ 
  passMark, 
  assessmentDetails, 
  certificateDetails,
  hasPractical 
}: CourseAssessmentProps) {
  return (
    <div className="space-y-6">
      {/* Assessment & Pass Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Assessment & pass criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessmentDetails && (
            <p className="text-sm text-muted-foreground">{assessmentDetails}</p>
          )}
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Quiz pass mark</p>
                  <p className="text-2xl font-bold text-primary">{passMark}%</p>
                </div>
              </div>
            </div>
            
            {hasPractical && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Practical assessment</p>
                    <p className="text-sm text-muted-foreground">Sign-off required</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Certificate Details */}
      <Card className="border-l-4 border-l-success">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Award className="h-5 w-5 text-success" />
            Certificate details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {certificateDetails ? (
              <p className="text-sm text-muted-foreground">{certificateDetails}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Upon successful completion of all course requirements, you will receive a 
                certificate of completion. This certificate will be stored in your profile 
                and can be downloaded at any time.
              </p>
            )}
            
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                Issued on completion
              </Badge>
              <Badge variant="outline" className="text-xs">
                Stored in your profile
              </Badge>
              <Badge variant="outline" className="text-xs">
                Downloadable PDF
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}