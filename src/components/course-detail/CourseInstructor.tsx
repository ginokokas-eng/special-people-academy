import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';

interface Instructor {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  job_title?: string;
  credentials?: string;
}

interface CourseInstructorProps {
  instructor?: Instructor;
}

export function CourseInstructor({ instructor }: CourseInstructorProps) {
  if (!instructor) return null;

  const initials = instructor.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Your instructor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <Avatar className="h-20 w-20 flex-shrink-0">
            <AvatarImage src={instructor.avatar_url} alt={instructor.full_name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-semibold text-lg">{instructor.full_name}</h3>
              {instructor.job_title && (
                <p className="text-sm text-muted-foreground">{instructor.job_title}</p>
              )}
            </div>
            
            {instructor.credentials && (
              <Badge variant="outline" className="text-xs">
                <GraduationCap className="h-3 w-3 mr-1" />
                {instructor.credentials}
              </Badge>
            )}
            
            {instructor.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                {instructor.bio}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}