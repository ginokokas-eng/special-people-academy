import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageShell } from '@/components/layout/PageShell';
import { CourseFilters } from '@/components/courses/CourseFilters';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  Star, 
  Play, 
  BookOpen, 
  Loader2,
  ShoppingCart 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface CourseOffering {
  id: string;
  base_price_gbp: number;
  active: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  level: string;
  delivery_type: string | null;
  is_published: boolean;
  course_offerings: CourseOffering[];
  enrollmentCount?: number;
}

const deliveryLabels: Record<string, string> = {
  online_self_paced: 'Online',
  live_online: 'Live Online',
  in_person_practical: 'Face-to-Face',
  blended: 'Blended Learning',
};

const getDeliveryBadgeStyles = (deliveryType: string | null) => {
  switch (deliveryType) {
    case 'blended':
      return 'bg-accent-green text-foreground';
    case 'in_person_practical':
      return 'bg-accent-yellow text-foreground';
    case 'online_self_paced':
    case 'live_online':
      return 'bg-secondary border border-primary text-foreground';
    default:
      return 'bg-secondary text-foreground';
  }
};

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*, course_offerings(id, base_price_gbp, active)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueCategories = [...new Set(data?.map(c => c.category) || [])];
      setCategories(uniqueCategories);

      const coursesWithCounts = await Promise.all(
        (data || []).map(async (course) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);
          
          return { ...course, enrollmentCount: count || 0 };
        })
      );

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMinPrice = (offerings: CourseOffering[]) => {
    const activeOfferings = offerings?.filter(o => o.active) || [];
    if (activeOfferings.length === 0) return null;
    return Math.min(...activeOfferings.map(o => o.base_price_gbp));
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    const matchesLevel = levelFilter === 'all' || course.level === levelFilter;
    const matchesDelivery = deliveryFilter === 'all' || course.delivery_type === deliveryFilter;
    
    // Price filter
    let matchesPrice = true;
    if (priceFilter !== 'all') {
      const minPrice = getMinPrice(course.course_offerings);
      if (minPrice === null) {
        matchesPrice = false;
      } else if (priceFilter === 'free') {
        matchesPrice = minPrice === 0;
      } else if (priceFilter === 'under50') {
        matchesPrice = minPrice > 0 && minPrice < 50;
      } else if (priceFilter === '50to100') {
        matchesPrice = minPrice >= 50 && minPrice <= 100;
      } else if (priceFilter === 'over100') {
        matchesPrice = minPrice > 100;
      }
    }
    
    return matchesSearch && matchesCategory && matchesLevel && matchesDelivery && matchesPrice;
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getPriceDisplay = (offerings: CourseOffering[]) => {
    const minPrice = getMinPrice(offerings);
    if (minPrice === null) return "Pricing TBC";
    if (minPrice === 0) return "Free";
    return `From £${minPrice}`;
  };

  const handleAddToCart = async (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to add to basket');
      navigate('/auth');
      return;
    }

    const activeOffering = course.course_offerings?.find(o => o.active);
    if (!activeOffering) {
      toast.error('No active offering available');
      return;
    }

    setAddingToCart(course.id);
    try {
      await addToCart({
        courseId: course.id,
        offeringId: activeOffering.id,
      });
      toast.success('Added to basket', {
        action: {
          label: 'View Basket',
          onClick: () => navigate('/cart'),
        },
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to basket');
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">Course Catalog</h1>
          <p className="text-muted-foreground mt-2">Explore and enroll in our training courses</p>
        </div>

        {/* Filters */}
        <CourseFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          levelFilter={levelFilter}
          onLevelChange={setLevelFilter}
          deliveryFilter={deliveryFilter}
          onDeliveryChange={setDeliveryFilter}
          priceFilter={priceFilter}
          onPriceChange={setPriceFilter}
          categories={categories}
        />

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredCourses.length} of {courses.length} courses
        </p>

        {/* Courses grid */}
        {filteredCourses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title="No courses found"
            description="Try adjusting your search or filters to find what you're looking for."
            action={{
              label: 'Clear Filters',
              onClick: () => {
                setSearchQuery('');
                setCategoryFilter('all');
                setLevelFilter('all');
                setDeliveryFilter('all');
                setPriceFilter('all');
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card 
                key={course.id} 
                className="group bg-card hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-border/50"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {course.thumbnail_url ? (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent-green/20">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-card/90 flex items-center justify-center">
                      <Play className="h-6 w-6 text-foreground ml-0.5" />
                    </div>
                  </div>
                  {course.delivery_type && (
                    <Badge className={`absolute top-3 right-3 ${getDeliveryBadgeStyles(course.delivery_type)}`}>
                      {deliveryLabels[course.delivery_type] || course.delivery_type}
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <p className="text-xs font-medium text-primary">{course.category}</p>
                  <h3 className="font-heading font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold text-foreground">
                      {getPriceDisplay(course.course_offerings)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(course.duration_minutes || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.enrollmentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-accent-yellow fill-accent-yellow" />
                      4.8
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={(e) => handleAddToCart(e, course)}
                    disabled={addingToCart === course.id || !course.course_offerings?.some(o => o.active)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {addingToCart === course.id ? "Adding..." : "Add to Basket"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
