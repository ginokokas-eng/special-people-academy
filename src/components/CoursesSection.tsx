import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Star, ArrowRight, GraduationCap, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  description: string | null;
  cpd_hours: number | null;
  course_offerings: CourseOffering[];
}

const CATEGORY_FILTERS = [
  { key: "all", label: "All courses" },
  { key: "Mandatory", label: "Mandatory" },
  { key: "Clinical", label: "Clinical" },
  { key: "Dementia & EOL", label: "Dementia & EOL" },
  { key: "Safeguarding", label: "Safeguarding" },
  { key: "Leadership", label: "Leadership" },
  { key: "Specialist", label: "Specialist" },
];

const formatDuration = (minutes: number) => {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getDefaultOfferingId = (offerings: CourseOffering[]): string | null => {
  const active = offerings?.filter((o) => o.active) || [];
  if (active.length === 0) return null;
  return [...active].sort((a, b) => a.base_price_gbp - b.base_price_gbp)[0]?.id || null;
};

interface EditorialCardProps {
  course: Course;
}

const EditorialCard = ({ course }: EditorialCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  const offeringId = getDefaultOfferingId(course.course_offerings);
  const rating = 4.7 + ((course.id.charCodeAt(0) % 3) * 0.1);
  const reviews = 800 + (course.id.charCodeAt(1) % 20) * 110;
  const cpd = course.cpd_hours ?? Math.max(4, Math.round((course.duration_minutes || 60) / 30));

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to add items to basket");
      navigate("/auth");
      return;
    }
    if (!offeringId) {
      toast.error("This course is not available for purchase yet");
      return;
    }
    setIsAdding(true);
    const success = await addToCart({
      courseId: course.id,
      offeringId,
      participantsCount: 1,
      regulatedCertification: false,
    });
    setIsAdding(false);
    if (success) {
      toast.success("Added to basket", {
        action: { label: "View Basket", onClick: () => navigate("/cart") },
      });
    }
  };

  return (
    <article
      className="group rounded-3xl border border-[#EEEAF8] bg-white p-5 shadow-[0_1px_2px_rgba(20,10,60,0.04)] hover:shadow-[0_18px_40px_-22px_rgba(76,29,149,0.18)] hover:border-[#E0D6F5] transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      {/* Visual frame */}
      <div className="relative rounded-2xl bg-[hsl(262_50%_97%)] border border-dashed border-[#D6CCF5] aspect-[16/10] overflow-hidden mb-5">
        {/* Category chip */}
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm border border-[#EEEAF8] text-[10px] font-semibold uppercase tracking-wider text-[hsl(259_72%_14%)]">
          {course.category}
        </span>

        {/* Thumbnail or placeholder */}
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-[hsl(259_20%_55%)] text-center px-6 leading-relaxed">
            [ ILLUSTRATION<br />
            {course.category.toLowerCase()}, warm tones<br />
            16:10 ]
          </div>
        )}

        {/* Duration chip */}
        <span className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-full bg-[hsl(259_72%_14%)] text-white text-[11px] font-semibold tabular-nums">
          {formatDuration(course.duration_minutes)}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[hsl(189_94%_30%)] mb-2">
          {course.category}
        </p>
        <h3 className="font-heading text-xl font-bold text-[hsl(259_72%_14%)] leading-snug mb-3 group-hover:text-[hsl(262_83%_45%)] transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-sm text-[hsl(259_20%_35%)] leading-relaxed line-clamp-3 mb-5">
            {course.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-[#F1ECF9] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(259_20%_35%)]">
            <Star className="h-3.5 w-3.5 fill-[hsl(38_92%_50%)] text-[hsl(38_92%_50%)]" />
            <span className="font-semibold text-[hsl(259_72%_14%)] tabular-nums">{rating.toFixed(1)}</span>
            <span className="text-[hsl(259_20%_55%)]">·</span>
            <span className="tabular-nums">{reviews.toLocaleString()}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[hsl(189_94%_94%)] text-[hsl(189_94%_22%)] text-[11px] font-semibold tabular-nums">
            CPD · {cpd}pts
          </span>
        </div>

        {/* Hidden CTA, revealed on hover */}
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-full border-[#E8E4F7] text-[hsl(259_72%_14%)] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          onClick={handleAdd}
          disabled={isAdding || !offeringId}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isAdding ? "Adding..." : "Add to Basket"}
        </Button>
      </div>
    </article>
  );
};

export const CoursesSection = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: featured, error: featuredErr }, { data: allPublished, error: countErr }] = await Promise.all([
          supabase
            .from("courses")
            .select(
              "id, title, category, duration_minutes, thumbnail_url, delivery_type, description, cpd_hours, course_offerings(id, base_price_gbp, active)"
            )
            .eq("is_featured", true)
            .eq("is_published", true)
            .order("updated_at", { ascending: false })
            .limit(6),
          supabase.from("courses").select("category").eq("is_published", true),
        ]);

        if (featuredErr) throw featuredErr;
        if (countErr) throw countErr;

        setCourses((featured as Course[]) || []);

        const tally: Record<string, number> = { all: allPublished?.length || 0 };
        (allPublished || []).forEach((c: { category: string }) => {
          if (!c.category) return;
          tally[c.category] = (tally[c.category] || 0) + 1;
        });
        setCounts(tally);
      } catch (err) {
        console.error("Error fetching courses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const visibleCourses = useMemo(() => {
    if (activeFilter === "all") return courses;
    return courses.filter((c) => c.category === activeFilter);
  }, [courses, activeFilter]);

  const totalCount = counts.all || 0;

  return (
    <section id="courses" className="section-y bg-white">
      <div className="section-container">
        {/* Editorial header */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-10 lg:mb-14">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-[hsl(189_94%_30%)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(189_94%_30%)]">
                01 / Catalog
              </span>
            </div>
            <h2 className="font-heading text-[34px] sm:text-[42px] lg:text-[52px] leading-[1.05] tracking-tight font-bold text-[hsl(259_72%_14%)]">
              Courses for every shift,<br />
              every role, every registration.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-6">
            <p className="text-[15px] lg:text-base leading-relaxed text-[hsl(259_20%_35%)]">
              From the Care Certificate onward. Mapped to the 2024 Adult Social Care
              workforce framework and reviewed by registered clinicians quarterly.
            </p>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {CATEGORY_FILTERS.map((f) => {
            const count = counts[f.key] ?? 0;
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)] focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-[hsl(259_72%_14%)] text-white border border-[hsl(259_72%_14%)]"
                    : "bg-white text-[hsl(259_72%_14%)] border border-[#EEEAF8] hover:border-[#D6CCF5]"
                }`}
              >
                {f.label}
                <span
                  className={`tabular-nums text-[11px] font-medium ${
                    isActive ? "text-white/70" : "text-[hsl(259_20%_55%)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => navigate("/courses")}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[hsl(189_94%_30%)] hover:text-[hsl(189_94%_22%)] mb-10 group"
        >
          Browse all {totalCount} courses
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl border border-[#EEEAF8] bg-white p-5 animate-pulse">
                <div className="aspect-[16/10] bg-[hsl(262_50%_97%)] rounded-2xl mb-5" />
                <div className="h-3 bg-[hsl(262_50%_94%)] rounded w-1/4 mb-3" />
                <div className="h-5 bg-[hsl(262_50%_94%)] rounded w-3/4 mb-3" />
                <div className="h-3 bg-[hsl(262_50%_94%)] rounded w-full mb-2" />
                <div className="h-3 bg-[hsl(262_50%_94%)] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : visibleCourses.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-[#E8E4F7] bg-[hsl(262_50%_98%)]">
            <GraduationCap className="h-12 w-12 text-[hsl(259_20%_55%)] mx-auto mb-4" />
            <p className="text-[hsl(259_20%_35%)] text-base mb-6">
              No courses match this filter yet.
            </p>
            <Button
              variant="outline"
              className="rounded-full border-[#E8E4F7]"
              onClick={() => navigate("/courses")}
            >
              Browse all courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCourses.map((course, index) => (
              <div
                key={course.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <EditorialCard course={course} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
