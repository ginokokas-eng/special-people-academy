import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Scale, FileText, Heart } from 'lucide-react';

interface CourseSafetyGovernanceProps {
  category: string;
  deliveryType: string;
  courseTitle: string;
}

export function CourseSafetyGovernance({ category, deliveryType, courseTitle }: CourseSafetyGovernanceProps) {
  // Only show for PBS/behavior-related courses or blended care courses
  const isPBSCourse = courseTitle.toLowerCase().includes('behaviour') || 
                      courseTitle.toLowerCase().includes('pbs') ||
                      courseTitle.toLowerCase().includes('intervention');
  
  const isCareCourse = category === 'Care & Support';
  const isBlended = deliveryType === 'blended';

  if (!isPBSCourse && !isCareCourse) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-accent">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          Safety & Governance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core principles */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
              <Heart className="h-3 w-3 mr-1" />
              Person-centred
            </Badge>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
              <Scale className="h-3 w-3 mr-1" />
              Least restrictive
            </Badge>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
              <FileText className="h-3 w-3 mr-1" />
              CQC compliant
            </Badge>
          </div>
        </div>

        {isPBSCourse && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Least Restrictive Practice
              </h4>
              <p className="text-sm text-muted-foreground">
                This course emphasises prevention and de-escalation as the primary approach. 
                Physical intervention is taught as a last resort, in line with the Human Rights Act 
                and least restrictive practice principles required by CQC.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Documentation & Reporting
              </h4>
              <p className="text-sm text-muted-foreground">
                All restrictive interventions must be documented accurately. This course covers 
                proper incident reporting, debriefing procedures, and review processes as required 
                for regulatory compliance.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                Regulatory Reminder
              </h4>
              <p className="text-sm text-muted-foreground">
                Always follow your organisation's behaviour support policy and individual care plans. 
                Physical intervention should only be used when absolutely necessary to prevent harm, 
                and for the minimum time required.
              </p>
            </div>
          </div>
        )}

        {!isPBSCourse && isCareCourse && (
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              This training supports your organisation's compliance with CQC regulations and 
              Skills for Care guidance. Apply all learning within the context of individual 
              care plans and your organisation's policies.
            </p>
          </div>
        )}

        {/* Footer note */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Training content aligns with BILD (British Institute of Learning Disabilities) 
            guidance and Skills for Care competency frameworks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
