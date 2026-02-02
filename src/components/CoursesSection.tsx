import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Play, BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CourseOffering {
  base_price_gbp: number;
  active: boolean;
}

interface Course {
  id: string;
  title: string;
  category: string;
  duration_minutes: number;
  level: string;
  thumbnail_url: string | null;
  delivery_type: string;
  course_offerings: CourseOffering[];
}

interface CourseCardProps {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: "New Joiner" | "Enhanced" | "Complex";
  priceDisplay: string;
  image: string;
  deliveryType: string;
}

const CourseCard = ({
  id,
  title,
  category,
  duration,
  level,
  priceDisplay,
  image,
  deliveryType,
}: CourseCardProps) => {
  const navigate = useNavigate();
  
  const deliveryLabels: Record<string, string> = {
    practical: "Face-to-Face",
    blended: "Blended Learning",
    online: "Online",
  };

  return (
    <div 
      className="group bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => navigate(`/courses/${id}`)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/90 flex items-center justify-center hover:scale-110 transition-transform">
            <Play className="h-6 w-6 text-foreground ml-0.5" />
          </div>
        </div>
        <span className="absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-medium bg-primary/90 text-primary-foreground">
          {deliveryLabels[deliveryType] || deliveryType}
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium text-primary mb-2">{category}</p>
        <h3 className="font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {duration}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Practical
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-foreground">
              {priceDisplay}
            </span>
          </div>
          <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            View Course
          </Button>
        </div>
      </div>
    </div>
  );
};

export const CoursesSection = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        // Fetch featured, published courses with their offerings
        const { data, error } = await supabase
          .from("courses")
          .select("id, title, category, duration_minutes, level, thumbnail_url, delivery_type, course_offerings(base_price_gbp, active)")
          .eq("is_featured", true)
          .eq("is_published", true)
          .order("updated_at", { ascending: false })
          .limit(6);

        if (error) throw error;
        setCourses((data as Course[]) || []);
      } catch (err) {
        console.error("Error fetching featured courses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedCourses();
  }, []);

  const formatDuration = (minutes: number) => {
    if (!minutes) return "TBD";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getPriceDisplay = (offerings: CourseOffering[]) => {
    const activeOfferings = offerings?.filter(o => o.active) || [];
    if (activeOfferings.length === 0) return "Pricing TBC";
    const minPrice = Math.min(...activeOfferings.map(o => o.base_price_gbp));
    if (minPrice === 0) return "Free";
    return `From £${minPrice}`;
  };

  return (
    <section id="courses" className="py-20 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-3">
              <BookOpen className="h-4 w-4" />
              Course Catalog
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Featured Practical Courses
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg">
              Hands-on training programs with face-to-face practical sessions led by expert trainers.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="self-start md:self-auto"
            onClick={() => navigate("/courses")}
          >
            View All Courses
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl shadow-card overflow-hidden animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-10 bg-muted rounded w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              No featured practical courses yet.
            </p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => navigate("/courses")}
            >
              Browse All Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <div
                key={course.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CourseCard
                  id={course.id}
                  title={course.title}
                  category={course.category}
                  duration={formatDuration(course.duration_minutes)}
                  level={(course.level as "New Joiner" | "Enhanced" | "Complex") || "New Joiner"}
                  priceDisplay={getPriceDisplay(course.course_offerings)}
                  image={course.thumbnail_url || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop"}
                  deliveryType={course.delivery_type}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
