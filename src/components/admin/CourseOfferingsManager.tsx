import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Monitor, Users, GraduationCap, Layers } from 'lucide-react';

interface CourseOffering {
  id: string;
  offering_type: string;
  base_price_gbp: number;
  max_participants: number | null;
  active: boolean;
}

interface CourseWithOfferings {
  id: string;
  title: string;
  category: string;
  description: string;
  is_published: boolean;
  is_featured: boolean;
  course_offerings: CourseOffering[];
}

const offeringTypeLabels: Record<string, string> = {
  individual_online: 'Individual Online',
  individual_face_to_face: 'Individual Face-to-Face',
  individual_blended: 'Individual Blended',
  group_face_to_face: 'Group Face-to-Face',
};

const offeringTypeIcons: Record<string, React.ReactNode> = {
  individual_online: <Monitor className="h-4 w-4" />,
  individual_face_to_face: <GraduationCap className="h-4 w-4" />,
  individual_blended: <Layers className="h-4 w-4" />,
  group_face_to_face: <Users className="h-4 w-4" />,
};

export function CourseOfferingsManager() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-course-offerings'],
    queryFn: async () => {
      // Fetch courses that have active offerings (our 3 core courses)
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          category,
          description,
          is_published,
          is_featured,
          course_offerings (
            id,
            offering_type,
            base_price_gbp,
            max_participants,
            active
          )
        `)
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('title');

      if (error) throw error;
      return data as CourseWithOfferings[];
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Course Offerings & Pricing</h2>
        <p className="text-muted-foreground">
          Manage pricing for all course delivery options
        </p>
      </div>

      {courses?.map((course) => (
        <Card key={course.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <CardDescription className="mt-1">
                  {course.description}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {course.is_published && (
                  <Badge variant="default">Published</Badge>
                )}
                {course.is_featured && (
                  <Badge variant="secondary">Featured</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offering Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Max Participants</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.course_offerings
                  ?.sort((a, b) => a.offering_type.localeCompare(b.offering_type))
                  .map((offering) => (
                    <TableRow key={offering.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {offeringTypeIcons[offering.offering_type]}
                          <span>{offeringTypeLabels[offering.offering_type]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(offering.base_price_gbp)}
                      </TableCell>
                      <TableCell className="text-right">
                        {offering.max_participants || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={offering.active ? 'default' : 'secondary'}>
                          {offering.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            
            {/* Regulated Certification Note */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <strong>Note:</strong> All courses support optional Regulated Certification (+£15 per person)
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Pricing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Online</TableHead>
                <TableHead className="text-right">Face-to-Face</TableHead>
                <TableHead className="text-right">Blended</TableHead>
                <TableHead className="text-right">Group (max 12)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses?.map((course) => {
                const offerings = course.course_offerings || [];
                const getPrice = (type: string) => {
                  const offering = offerings.find(o => o.offering_type === type);
                  return offering ? formatPrice(offering.base_price_gbp) : '—';
                };
                
                return (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell className="text-right">{getPrice('individual_online')}</TableCell>
                    <TableCell className="text-right">{getPrice('individual_face_to_face')}</TableCell>
                    <TableCell className="text-right">{getPrice('individual_blended')}</TableCell>
                    <TableCell className="text-right">{getPrice('group_face_to_face')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
