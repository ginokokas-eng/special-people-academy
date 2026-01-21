import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface CourseFirstAidProps {
  category?: string;
}

const firstAidContent = {
  'Care & Support': {
    title: 'Seizure First-Aid Summary',
    icon: ShieldCheck,
    steps: [
      'Stay calm and remain with the person',
      'Clear the area of any hazardous objects',
      'Cushion their head if possible',
      'Do NOT restrain or put anything in their mouth',
      'Time the seizure from the start',
      'Place in recovery position once movements stop',
      'Call 999 if seizure lasts more than 5 minutes'
    ],
    emergency: 'Call emergency services if: first seizure, seizure over 5 mins, repeated seizures, injury, or breathing difficulties.'
  }
};

export function CourseFirstAid({ category }: CourseFirstAidProps) {
  const content = category && firstAidContent[category as keyof typeof firstAidContent];
  
  if (!content) return null;

  const IconComponent = content.icon;

  return (
    <Card className="border-l-4 border-l-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-destructive" />
          {content.title}
        </CardTitle>
        <Badge variant="outline" className="w-fit text-xs bg-destructive/10 text-destructive border-destructive/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Safety Critical
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {content.steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
        
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-warning-foreground font-medium">
              {content.emergency}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
