import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Users, ClipboardList } from 'lucide-react';

interface CourseCarePlanProps {
  category?: string;
}

const carePlanContent = {
  'Care & Support': {
    title: 'Individual Support & Care Plan Alignment',
    description: 'This course aligns with person-centred care planning principles and supports the delivery of individualised care.',
    points: [
      {
        icon: FileText,
        title: 'Documented care plans',
        text: 'Learn to record seizure activity and triggers in individual care plans'
      },
      {
        icon: Users,
        title: 'Person-centred approach',
        text: 'Understand how to tailor support based on individual needs and preferences'
      },
      {
        icon: ClipboardList,
        title: 'Communication protocols',
        text: 'Know when and how to escalate concerns within your care team'
      }
    ]
  }
};

export function CourseCarePlan({ category }: CourseCarePlanProps) {
  const content = category && carePlanContent[category as keyof typeof carePlanContent];
  
  if (!content) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {content.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{content.description}</p>
        
        <div className="space-y-4">
          {content.points.map((point, index) => {
            const IconComponent = point.icon;
            return (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <IconComponent className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">{point.title}</h4>
                  <p className="text-sm text-muted-foreground">{point.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
