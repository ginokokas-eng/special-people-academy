import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Play, BookOpen, ArrowRight, GraduationCap, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScannerOverlay } from "@/hooks/useScannerOverlay";
import { ScannerOverlay } from "@/components/ui/scanner-overlay";
interface CourseOffering {
  id: string;
  base_price_gbp: number;
  active: boolean;
}

interface Course {
  id: string;
  title: string;
  category: string;
  duration_minutes: number;
  thumbnail_url: string | null;
  delivery_type: string;
  course_offerings: CourseOffering[];
}

interface CourseCardProps {
  id: string;
  title: string;
  category: string;
  duration: string;
  priceDisplay: string;
  image: string;
  deliveryType: string;
  defaultOfferingId: string | null;
}

const CourseCard = ({
  id,
  title,
  category,
  duration,
  priceDisplay,
  image,
  deliveryType,
  defaultOfferingId,
}: CourseCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  
  const { elementRef, isScanning, reduceMotion, startScan } = useScannerOverlay({
    duration: 1.4,
    runOnce: true,
  });
  
  const deliveryLabels: Record<string, string> = {
    practical: "Face-to-Face",
    blended: "Blended Learning",
    online: "Online",
    online_self_paced: "Online (Self-paced)",
    live_online: "Live Online",
    in_person_practical: "In-Person Practical",
  };

  const handleAddToBasket = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to add items to basket");
      navigate('/auth');
      return;
    }

    if (!defaultOfferingId) {
      toast.error("This course is not available for purchase yet");
      return;
    }

    setIsAdding(true);
    const success = await addToCart({
      courseId: id,
      offeringId: defaultOfferingId,
      participantsCount: 1,
      regulatedCertification: false,
    });
    setIsAdding(false);

    if (success) {
      toast.success("Added to basket", {
        action: {
          label: "View Basket",
          onClick: () => navigate('/cart'),
        },
      });
    }
  };

  return (
    <div 
      ref={elementRef}
      className="group card-soft card-soft-hover overflow-hidden"
      onMouseEnter={startScan}
    >
      {/* Scanner overlay */}
      {!reduceMotion && <ScannerOverlay isScanning={isScanning} duration={1.4} />}
      {/* Clickable area for course navigation */}
      <div 
        className="cursor-pointer"
        onClick={() => navigate(`/courses/${id}`)}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ backgroundImage: `url(${image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(259_72%_14%/0.55)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Play className="h-6 w-6 text-[hsl(259_72%_14%)] ml-0.5" />
            </div>
          </div>
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-[hsl(259_72%_14%)] backdrop-blur-sm shadow-sm">
            {deliveryLabels[deliveryType] || deliveryType}
          </span>
        </div>

        <div className="p-5 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(262_83%_45%)] mb-2">{category}</p>
          <h3 className="font-heading font-bold text-[hsl(259_72%_14%)] text-base mb-3 line-clamp-2 leading-snug group-hover:text-[hsl(262_83%_45%)] transition-colors">
            {title}
          </h3>

          <div className="flex items-center gap-4 text-sm text-[hsl(259_20%_45%)] mb-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {duration}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Practical
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-heading text-lg font-bold text-[hsl(259_72%_14%)]">
              {priceDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Non-clickable button area - separate from navigation */}
      <div className="px-5 pb-5">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full rounded-full border-[#E8E4F7] text-[hsl(259_72%_14%)] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors"
          onClick={handleAddToBasket}
          disabled={isAdding || !defaultOfferingId}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isAdding ? "Adding..." : "Add to Basket"}
        </Button>
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
          .select("id, title, category, duration_minutes, thumbnail_url, delivery_type, course_offerings(id, base_price_gbp, active)")
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

  const getDefaultOfferingId = (offerings: CourseOffering[]): string | null => {
    const activeOfferings = offerings?.filter(o => o.active) || [];
    if (activeOfferings.length === 0) return null;
    // Return the cheapest active offering as the default
    const sorted = [...activeOfferings].sort((a, b) => a.base_price_gbp - b.base_price_gbp);
    return sorted[0]?.id || null;
  };

  return (
    <section id="courses" className="section-y bg-[hsl(270_30%_98%)]">
      <div className="section-container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 lg:mb-12">
          <div className="max-w-xl">
            <span className="eyebrow mb-3">
              <BookOpen className="h-3.5 w-3.5" />
              Course catalogue
            </span>
            <h2 className="heading-display text-3xl lg:text-[40px] leading-tight mt-3">
              Featured practical courses
            </h2>
            <p className="text-[hsl(259_20%_30%)] mt-3 text-base lg:text-lg">
              Hands-on training led by expert UK trainers, with practical sign-off and audit-ready records.
            </p>
          </div>
          <Button
            variant="outline"
            className="self-start md:self-auto rounded-full border-[#E8E4F7] bg-white text-[hsl(259_72%_14%)] hover:bg-white hover:border-[#D6CCF5]"
            onClick={() => navigate("/courses")}
          >
            View all courses
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
                  priceDisplay={getPriceDisplay(course.course_offerings)}
                  image={course.thumbnail_url || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop"}
                  deliveryType={course.delivery_type}
                  defaultOfferingId={getDefaultOfferingId(course.course_offerings)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
