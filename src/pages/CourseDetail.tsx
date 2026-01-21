import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { CourseHero } from '@/components/course-detail/CourseHero';
import { CourseSidebar } from '@/components/course-detail/CourseSidebar';
import { CourseContent } from '@/components/course-detail/CourseContent';
import { CourseOverview } from '@/components/course-detail/CourseOverview';
import { CourseInstructor } from '@/components/course-detail/CourseInstructor';
import { CoursePractical } from '@/components/course-detail/CoursePractical';
import { CourseAssessment } from '@/components/course-detail/CourseAssessment';
import { CourseFAQs } from '@/components/course-detail/CourseFAQs';
import { CourseReviews } from '@/components/course-detail/CourseReviews';
import { CourseFirstAid } from '@/components/course-detail/CourseFirstAid';
import { CourseCarePlan } from '@/components/course-detail/CourseCarePlan';
import { CourseResources } from '@/components/course-detail/CourseResources';
import { CourseProgressTracker } from '@/components/course-detail/CourseProgressTracker';
import { MobileBottomCTA } from '@/components/course-detail/MobileBottomCTA';
import { CoursePricing, BookingDetails } from '@/components/course-detail/CoursePricing';
import { Button } from '@/components/ui/button';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  lesson_type: string;
  module_id: string | null;
  completed?: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  course_id: string;
}

interface Instructor {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  job_title: string | null;
  credentials: string | null;
}

interface PracticalSession {
  id: string;
  session_date: string | null;
  location: string | null;
  max_attendees: number | null;
  notes: string | null;
}

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_name?: string;
}

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  overview: string | null;
  category: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  level: string;
  price: number;
  delivery_type: string;
  is_mandatory: boolean;
  is_internal: boolean;
  has_certificate: boolean;
  cpd_hours: number;
  pass_mark: number;
  language: string;
  last_updated: string | null;
  learning_outcomes: string[];
  target_audience: string[];
  requirements: string[];
  faqs: { question: string; answer: string }[];
  practical_details: string | null;
  assessment_details: string | null;
  certificate_details: string | null;
  instructor_id: string | null;
  // Pricing fields
  price_online: number;
  price_face_to_face: number;
  price_group: number;
  group_max_participants: number;
  regulated_cert_available: boolean;
  regulated_cert_fee: number;
}

interface Enrollment {
  id: string;
  enrolled_at: string;
  completed_at: string | null;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  order_index: number;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [practicalSessions, setPracticalSessions] = useState<PracticalSession[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  
  // Progress tracking state
  const [quizProgress, setQuizProgress] = useState({ total: 0, passed: 0 });
  const [practicalProgress, setPracticalProgress] = useState({ required: false, completed: false });
  const [certificateId, setCertificateId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    if (!id) return;

    try {
      // Fetch course with all extended fields
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      
      // Parse JSON fields safely
      const parsedCourse: Course = {
        ...courseData,
        learning_outcomes: Array.isArray(courseData.learning_outcomes) 
          ? (courseData.learning_outcomes as string[])
          : [],
        target_audience: Array.isArray(courseData.target_audience) 
          ? (courseData.target_audience as string[])
          : [],
        requirements: Array.isArray(courseData.requirements) 
          ? (courseData.requirements as string[])
          : [],
        faqs: Array.isArray(courseData.faqs) 
          ? (courseData.faqs as { question: string; answer: string }[])
          : [],
        delivery_type: courseData.delivery_type || 'online',
        is_mandatory: courseData.is_mandatory || false,
        is_internal: courseData.is_internal !== false,
        has_certificate: courseData.has_certificate !== false,
        cpd_hours: courseData.cpd_hours || 0,
        pass_mark: courseData.pass_mark || 70,
        language: courseData.language || 'English',
        // Pricing fields
        price_online: courseData.price_online || 0,
        price_face_to_face: courseData.price_face_to_face || 0,
        price_group: courseData.price_group || 0,
        group_max_participants: courseData.group_max_participants || 12,
        regulated_cert_available: courseData.regulated_cert_available || false,
        regulated_cert_fee: courseData.regulated_cert_fee || 15,
      };
      
      setCourse(parsedCourse);

      // Fetch modules
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', id)
        .order('order_index');
      
      setModules(modulesData || []);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id)
        .order('order_index');

      // Fetch instructor if exists
      if (parsedCourse.instructor_id) {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('*')
          .eq('id', parsedCourse.instructor_id)
          .single();
        
        setInstructor(instructorData);
      }

      // Fetch practical sessions
      const { data: sessionsData } = await supabase
        .from('practical_sessions')
        .select('*')
        .eq('course_id', id)
        .order('session_date');
      
      setPracticalSessions(sessionsData || []);

      // Fetch resources
      const { data: resourcesData } = await supabase
        .from('course_resources')
        .select('*')
        .eq('course_id', id)
        .order('order_index');
      
      setResources(resourcesData || []);

      // Fetch approved reviews
      const { data: reviewsData } = await supabase
        .from('course_reviews')
        .select('*')
        .eq('course_id', id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      setReviews(reviewsData || []);

      // Fetch lesson progress and enrollment if user is logged in
      if (user) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id);

        const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);
        
        const lessonsWithProgress = (lessonsData || []).map(lesson => ({
          ...lesson,
          lesson_type: lesson.lesson_type || 'video',
          completed: progressMap.get(lesson.id) || false,
        }));

        setLessons(lessonsWithProgress);

        // Fetch enrollment
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .maybeSingle();

        setEnrollment(enrollmentData);

        // Fetch quiz progress - get quiz lessons and check attempts
        const quizLessonIds = (lessonsData || [])
          .filter(l => l.lesson_type === 'quiz')
          .map(l => l.id);
        
        if (quizLessonIds.length > 0) {
          // Get quizzes for these lessons
          const { data: quizzesData } = await supabase
            .from('quizzes')
            .select('id, lesson_id')
            .in('lesson_id', quizLessonIds);

          const quizIds = (quizzesData || []).map(q => q.id);
          
          if (quizIds.length > 0) {
            // Get passed attempts
            const { data: attemptsData } = await supabase
              .from('quiz_attempts')
              .select('quiz_id, passed')
              .eq('user_id', user.id)
              .in('quiz_id', quizIds)
              .eq('passed', true);

            const passedQuizIds = new Set((attemptsData || []).map(a => a.quiz_id));
            setQuizProgress({
              total: quizIds.length,
              passed: passedQuizIds.size,
            });
          } else {
            setQuizProgress({ total: 0, passed: 0 });
          }
        } else {
          setQuizProgress({ total: 0, passed: 0 });
        }

        // Check practical completion
        const requiresPractical = parsedCourse.delivery_type === 'blended' || 
          (parsedCourse as any).requires_practical_signoff;
        
        if (requiresPractical) {
          const { data: attendanceData } = await supabase
            .from('practical_attendance')
            .select('competency_outcome, session_id')
            .eq('user_id', user.id);
          
          // Check if any attendance is for this course's sessions
          const sessionIds = (sessionsData || []).map(s => s.id);
          const relevantAttendance = (attendanceData || []).filter(
            a => sessionIds.includes(a.session_id) && a.competency_outcome === 'pass'
          );
          
          setPracticalProgress({
            required: true,
            completed: relevantAttendance.length > 0,
          });
        } else {
          setPracticalProgress({ required: false, completed: false });
        }

        // Check if user already has a certificate
        const { data: certData } = await supabase
          .from('certificates')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .maybeSingle();
        
        setCertificateId(certData?.id);

      } else {
        setLessons((lessonsData || []).map(lesson => ({ 
          ...lesson, 
          lesson_type: lesson.lesson_type || 'video',
          completed: false 
        })));
        setEnrollment(null);
        setQuizProgress({ total: 0, passed: 0 });
        setPracticalProgress({ required: false, completed: false });
        setCertificateId(undefined);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!course) return;
    
    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
        });

      if (error) throw error;
      
      toast.success('Successfully enrolled!');
      fetchCourseData();
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleStart = () => {
    if (!enrollment && user) {
      handleEnroll();
      return;
    }
    
    // Find first incomplete lesson or first lesson
    const firstIncomplete = lessons.find(l => !l.completed);
    const targetLesson = firstIncomplete || lessons[0];
    
    if (targetLesson) {
      navigate(`/courses/${id}/learn?lesson=${targetLesson.id}`);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (enrollment) {
      navigate(`/courses/${id}/learn?lesson=${lesson.id}`);
    }
  };

  const handleQuizClick = (lesson: Lesson) => {
    if (enrollment) {
      navigate(`/courses/${id}/quiz?lesson=${lesson.id}`);
    }
  };

  const progress = lessons.length > 0 
    ? Math.round((lessons.filter(l => l.completed).length / lessons.length) * 100)
    : 0;

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : undefined;

  const hasPractical = course?.delivery_type === 'blended' || 
    course?.delivery_type === 'in-person' ||
    lessons.some(l => l.lesson_type === 'practical');

  const hasScenarios = lessons.some(l => l.lesson_type === 'scenario');

  // Access control logic
  const isInternal = course?.is_internal ?? true;
  const requiresSubscription = !isInternal && !hasActiveSubscription;
  const canAccessCourse = user && (isInternal ? !!enrollment : hasActiveSubscription);

  if (authLoading || loading || subLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">Course not found</h2>
          <p className="text-muted-foreground mb-6">
            The course you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />
      
      {/* Hero Section */}
      <CourseHero
        title={course.title}
        subtitle={course.subtitle || undefined}
        level={course.level}
        deliveryType={course.delivery_type}
        category={course.category}
        isMandatory={course.is_mandatory}
        isInternal={course.is_internal}
        hasCertificate={course.has_certificate}
        durationMinutes={course.duration_minutes || 0}
        lastUpdated={course.last_updated || undefined}
        language={course.language}
        thumbnailUrl={course.thumbnail_url || undefined}
        averageRating={averageRating}
        reviewCount={reviews.length}
        learnerCount={0}
        onStart={handleStart}
        isEnrolled={!!enrollment}
        progress={progress}
      />

      {/* Main Content */}
      <div className="container py-8 lg:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Tracker - only show when enrolled */}
            {enrollment && canAccessCourse && (
              <CourseProgressTracker
                courseId={course.id}
                userId={user!.id}
                lessonProgress={{
                  total: lessons.length,
                  completed: lessons.filter(l => l.completed).length,
                }}
                quizProgress={quizProgress}
                practicalProgress={practicalProgress}
                hasCertificate={course.has_certificate}
                isCompleted={!!enrollment.completed_at}
                certificateId={certificateId}
              />
            )}

            {/* A. Overview, What you'll learn, Who this is for, Requirements */}
            <CourseOverview
              overview={course.overview || undefined}
              description={course.description || undefined}
              learningOutcomes={course.learning_outcomes}
              targetAudience={course.target_audience}
              requirements={course.requirements}
            />

            {/* E. Course Content */}
            <CourseContent
              modules={modules.map(m => ({ ...m, lessons: [] }))}
              lessons={lessons}
              isEnrolled={!!enrollment}
              onLessonClick={handleLessonClick}
              onQuizClick={handleQuizClick}
              canAccessCourse={!!canAccessCourse}
              requiresSubscription={requiresSubscription}
            />

            {/* F. Seizure First-Aid Summary (category-specific) */}
            <CourseFirstAid category={course.category} />

            {/* G. Individual Support & Care Plan Alignment */}
            <CourseCarePlan category={course.category} />

            {/* H. Practical Session Details */}
            {hasPractical && (
              <CoursePractical
                practicalDetails={course.practical_details || undefined}
                sessions={practicalSessions}
              />
            )}

            {/* I. Assessment & Certificate */}
            <CourseAssessment
              passMark={course.pass_mark}
              assessmentDetails={course.assessment_details || undefined}
              certificateDetails={course.certificate_details || undefined}
              hasPractical={hasPractical}
            />

            {/* Resources Section */}
            <CourseResources
              resources={resources}
              courseId={course.id}
              isEnrolled={!!enrollment}
              canAccess={!!canAccessCourse}
            />

            {/* I. Instructor */}
            {instructor && (
              <CourseInstructor instructor={instructor} />
            )}

            {/* J. FAQs */}
            <CourseFAQs faqs={course.faqs} />

            {/* K. Reviews */}
            <CourseReviews reviews={reviews} averageRating={averageRating} />
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="hidden lg:block space-y-6">
            {/* Pricing Card - show for external courses */}
            {!course.is_internal && (
              <CoursePricing
                priceOnline={course.price_online}
                priceFaceToFace={course.price_face_to_face}
                priceGroup={course.price_group}
                groupMaxParticipants={course.group_max_participants}
                regulatedCertAvailable={course.regulated_cert_available}
                regulatedCertFee={course.regulated_cert_fee}
                deliveryType={course.delivery_type}
                onBookingRequest={(booking) => {
                  toast.success(`Booking request submitted: ${booking.bookingType} - £${booking.totalPrice}`);
                  // TODO: Integrate with contact form or booking system
                }}
              />
            )}
            
            <CourseSidebar
              isLoggedIn={!!user}
              isEnrolled={!!enrollment}
              isInternal={course.is_internal}
              progress={progress}
              hasCertificate={course.has_certificate}
              cpdHours={Number(course.cpd_hours) || 0}
              lessonCount={lessons.length}
              resourceCount={resources.length}
              hasPractical={hasPractical}
              hasScenarios={hasScenarios}
              onStart={handleStart}
              onEnroll={handleEnroll}
              enrolling={enrolling}
              canAccessCourse={!!canAccessCourse}
              requiresSubscription={requiresSubscription}
              hasActiveSubscription={hasActiveSubscription}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom CTA */}
      <MobileBottomCTA
        isLoggedIn={!!user}
        isEnrolled={!!enrollment}
        isInternal={course.is_internal}
        progress={progress}
        onStart={handleStart}
        onEnroll={handleEnroll}
        enrolling={enrolling}
        canAccessCourse={!!canAccessCourse}
        requiresSubscription={requiresSubscription}
        hasActiveSubscription={hasActiveSubscription}
      />

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}