import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EditorialCourseCard, type EditorialCourse } from "@/components/courses/EditorialCourseCard";

interface Course extends EditorialCourse {
  delivery_type: string;
  duration_minutes: number;
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
