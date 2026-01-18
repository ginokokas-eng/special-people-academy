import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface CourseOverviewProps {
  overview?: string;
  description?: string;
  learningOutcomes: string[];
  targetAudience: string[];
  requirements: string[];
}

export function CourseOverview({
  overview,
  description,
  learningOutcomes,
  targetAudience,
  requirements,
}: CourseOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      {(overview || description) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Overview</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {overview || description}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What you'll learn */}
      {learningOutcomes.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-xl">What you'll learn</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {learningOutcomes.map((outcome, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{outcome}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Who this course is for */}
      {targetAudience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Who this course is for</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {targetAudience.map((audience, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="text-primary">•</span>
                  <span>{audience}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="text-primary">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}