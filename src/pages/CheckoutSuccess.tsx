import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  GraduationCap, 
  Loader2, 
  Calendar,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface PurchasedCourse {
  id: string;
  title: string;
  delivery_type: string | null;
  requires_practical_signoff: boolean | null;
}

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [purchasedCourses, setPurchasedCourses] = useState<PurchasedCourse[]>([]);

  useEffect(() => {
    const processSuccess = async () => {
      const sessionId = searchParams.get('session_id');
      
      // Clear cart on success
      await clearCart();

      if (sessionId && user) {
        // Fetch recently enrolled courses (last 5 minutes)
        try {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_id', user.id)
            .gte('enrolled_at', fiveMinutesAgo);

          if (enrollments && enrollments.length > 0) {
            const courseIds = enrollments.map(e => e.course_id);
            
            const { data: courses } = await supabase
              .from('courses')
              .select('id, title, delivery_type, requires_practical_signoff')
              .in('id', courseIds);

            setPurchasedCourses(courses || []);
          }
        } catch (error) {
          console.error('Error fetching purchased courses:', error);
        }
      }

      setLoading(false);
    };

    processSuccess();
  }, [searchParams, user, clearCart]);

  const needsPracticalSession = (course: PurchasedCourse) => {
    const practicalTypes = ['in_person_practical', 'blended', 'face_to_face'];
    return (
      practicalTypes.includes(course.delivery_type || '') ||
      course.requires_practical_signoff
    );
  };

  if (loading) {
    return (
      <PublicLayout title="Processing Order" description="Processing your order">
        <div className="container py-12 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Processing your order...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Payment Successful" description="Your payment was successful">
      <div className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Header */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground text-lg">
              Thank you for your purchase. You're now enrolled in your courses.
            </p>
          </div>

          {/* Purchased Courses */}
          {purchasedCourses.length > 0 && (
            <Card className="mb-8 text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Your Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {purchasedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium">{course.title}</p>
                      {needsPracticalSession(course) && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            Practical Session Required
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Link to={`/courses/${course.id}`}>
                      <Button size="sm" variant="outline">
                        <BookOpen className="h-4 w-4 mr-1" />
                        Start Learning
                      </Button>
                    </Link>
                  </div>
                ))}

                {purchasedCourses.some(needsPracticalSession) && (
                  <div className="p-4 bg-secondary/50 rounded-lg border border-border mt-4">
                    <p className="text-sm text-foreground">
                      <strong>Next Step:</strong> Some of your courses require a practical session. 
                      You can book your session from the course page or we'll notify you when dates are available.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/my-learning')}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Go to My Learning
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/courses')}
            >
              Browse More Courses
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
