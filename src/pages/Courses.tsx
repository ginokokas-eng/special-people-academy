import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Loader2, ArrowRight } from '@/components/icons';
import { FilterPill } from '@/components/ds/FilterPill';
import { EditorialCourseCard, type EditorialCourse } from '@/components/courses/EditorialCourseCard';
import { useIsNative } from '@/lib/native';

interface Course extends EditorialCourse {
  is_published: boolean;
  level: string;
  enrollmentCount?: number;
}

// Categories are derived from the courses actually loaded (see `categoryFilters`
// below) — a hardcoded list went stale and every chip returned zero results.
const HIDDEN_CATEGORIES = new Set(['Uncategorized', 'Test']);

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const native = useIsNative();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select(
            'id, title, description, category, thumbnail_url, duration_minutes, level, is_published, cpd_hours, course_offerings(id, base_price_gbp, active)'
          )
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCourses((data as Course[]) || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const categoryFilters = useMemo(() => {
    const tally = new Map<string, number>();
    courses.forEach((c) => {
      if (!c.category || HIDDEN_CATEGORIES.has(c.category)) return;
      tally.set(c.category, (tally.get(c.category) || 0) + 1);
    });
    const derived = Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key, count]) => ({ key, label: key, count }));
    return [{ key: 'all', label: 'All courses', count: courses.length }, ...derived];
  }, [courses]);


  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = activeFilter === 'all' || course.category === activeFilter;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, activeFilter]);

  if (loading) {
    return (
      <PublicLayout title="Courses" description="Browse our CPD-certified training courses">
        <div className="container py-20 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(262_83%_45%)]" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Courses" description="Browse our CPD-certified training courses">
      <section className="bg-white">
        <div className={`section-container ${native ? 'pt-2 pb-8' : 'py-14 lg:py-20'}`}>
          {/* Editorial header — web/marketing only. In the native app the
              catalogue goes straight to search + facet chips + grid. */}
          {!native && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-10 lg:mb-14">
              <div className="lg:col-span-7">
                <h1 className="font-heading text-[34px] sm:text-[42px] lg:text-[52px] leading-[1.05] tracking-tight font-bold text-[hsl(259_72%_14%)]">
                  Courses for every shift,
                  <br />
                  every role, every registration.
                </h1>
              </div>
              <div className="lg:col-span-5 lg:pt-6">
                <p className="text-[15px] lg:text-base leading-relaxed text-[hsl(259_20%_35%)]">
                  From the Care Certificate onward. Mapped to the 2024 Adult Social Care
                  workforce framework and reviewed by registered clinicians quarterly.
                </p>
              </div>
            </div>
          )}


          {/* Search */}
          <div className="relative max-w-xl mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(259_20%_55%)]" />
            <Input
              placeholder="Search courses by title or topic…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-full border-[#EEEAF8] bg-white focus-visible:ring-[hsl(189_94%_30%)]"
            />
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {CATEGORY_FILTERS.map((f) => (
              <FilterPill
                key={f.key}
                label={f.label}
                count={counts[f.key] ?? 0}
                selected={activeFilter === f.key}
                onClick={() => setActiveFilter(f.key)}
              />
            ))}
          </div>

          <p className="text-[13px] text-[hsl(259_20%_45%)] mb-10">
            Showing {filteredCourses.length} of {courses.length} courses
          </p>

          {/* Cards */}
          {filteredCourses.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-dashed border-[#E8E4F7] bg-[hsl(262_50%_98%)]">
              <BookOpen className="h-12 w-12 text-[hsl(259_20%_55%)] mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-[hsl(259_72%_14%)] mb-2">
                No courses found
              </h3>
              <p className="text-[hsl(259_20%_40%)] mb-6">
                Try adjusting your search or category filter.
              </p>
              <Button
                variant="outline"
                className="rounded-full border-[#E8E4F7]"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
              >
                Reset filters
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, index) => (
                <div
                  key={course.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                >
                  <EditorialCourseCard course={course} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
