import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Loader2, 
  Star, 
  StarOff,
  Save,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';

interface FeaturedCourse {
  id: string;
  title: string;
  category: string;
  delivery_type: string | null;
  is_published: boolean;
  is_featured: boolean;
  featured_rank: number;
  updated_at: string;
}

export function FeaturedCoursesManager() {
  const [courses, setCourses] = useState<FeaturedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<FeaturedCourse>>>({});

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, category, delivery_type, is_published, is_featured, featured_rank, updated_at')
        .order('featured_rank', { ascending: true })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
      setPendingChanges({});
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublished = async (course: FeaturedCourse) => {
    setSaving(course.id);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);

      if (error) throw error;
      
      setCourses(prev => 
        prev.map(c => c.id === course.id ? { ...c, is_published: !c.is_published } : c)
      );
      toast.success(course.is_published ? 'Course unpublished' : 'Course published');
    } catch (err) {
      console.error('Error updating course:', err);
      toast.error('Failed to update course');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleFeatured = async (course: FeaturedCourse) => {
    setSaving(course.id);
    try {
      const newFeatured = !course.is_featured;
      const { error } = await supabase
        .from('courses')
        .update({ 
          is_featured: newFeatured,
          // Reset rank when unfeaturing
          featured_rank: newFeatured ? course.featured_rank : 0
        })
        .eq('id', course.id);

      if (error) throw error;
      
      setCourses(prev => 
        prev.map(c => c.id === course.id ? { ...c, is_featured: newFeatured, featured_rank: newFeatured ? c.featured_rank : 0 } : c)
      );
      toast.success(newFeatured ? 'Course featured' : 'Course unfeatured');
    } catch (err) {
      console.error('Error updating course:', err);
      toast.error('Failed to update course');
    } finally {
      setSaving(null);
    }
  };

  const handleRankChange = (courseId: string, newRank: number) => {
    setPendingChanges(prev => ({
      ...prev,
      [courseId]: { ...prev[courseId], featured_rank: newRank }
    }));
    setCourses(prev => 
      prev.map(c => c.id === courseId ? { ...c, featured_rank: newRank } : c)
    );
  };

  const handleSaveRank = async (course: FeaturedCourse) => {
    const pending = pendingChanges[course.id];
    if (!pending?.featured_rank && pending?.featured_rank !== 0) return;

    setSaving(course.id);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ featured_rank: pending.featured_rank })
        .eq('id', course.id);

      if (error) throw error;
      
      setPendingChanges(prev => {
        const { [course.id]: _, ...rest } = prev;
        return rest;
      });
      toast.success('Rank updated');
    } catch (err) {
      console.error('Error updating rank:', err);
      toast.error('Failed to update rank');
    } finally {
      setSaving(null);
    }
  };

  const moveRank = async (course: FeaturedCourse, direction: 'up' | 'down') => {
    const newRank = direction === 'up' 
      ? Math.max(0, course.featured_rank - 1)
      : course.featured_rank + 1;
    
    setSaving(course.id);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ featured_rank: newRank })
        .eq('id', course.id);

      if (error) throw error;
      
      setCourses(prev => {
        const updated = prev.map(c => 
          c.id === course.id ? { ...c, featured_rank: newRank } : c
        );
        // Re-sort after rank change
        return updated.sort((a, b) => {
          if (a.featured_rank !== b.featured_rank) {
            return a.featured_rank - b.featured_rank;
          }
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });
      toast.success('Rank updated');
    } catch (err) {
      console.error('Error updating rank:', err);
      toast.error('Failed to update rank');
    } finally {
      setSaving(null);
    }
  };

  const deliveryLabels: Record<string, string> = {
    online: 'Online',
    practical: 'Practical',
    blended: 'Blended',
    classroom: 'Classroom',
  };

  const featuredCourses = courses.filter(c => c.is_featured);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <CardTitle>Featured Courses</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCourses}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {featuredCourses.length} course{featuredCourses.length !== 1 ? 's' : ''} currently featured.
            Featured courses appear on the homepage sorted by rank (lower = higher priority), then by last updated.
          </p>
          {featuredCourses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {featuredCourses
                .sort((a, b) => a.featured_rank - b.featured_rank)
                .map((course, idx) => (
                  <Badge 
                    key={course.id} 
                    variant="secondary" 
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                    {course.title}
                  </Badge>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Delivery Mode</TableHead>
                <TableHead className="text-center">Published</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-center w-[180px]">Featured Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No courses found.
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow 
                    key={course.id}
                    className={course.is_featured ? 'bg-primary/5' : ''}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {course.is_featured && (
                          <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                        )}
                        <span className="truncate">{course.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {deliveryLabels[course.delivery_type || 'online'] || course.delivery_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={course.is_published}
                        onCheckedChange={() => handleTogglePublished(course)}
                        disabled={saving === course.id}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={course.is_featured ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleFeatured(course)}
                        disabled={saving === course.id || (!course.is_published && !course.is_featured)}
                        title={!course.is_published ? 'Publish course first to feature it' : ''}
                      >
                        {saving === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : course.is_featured ? (
                          <>
                            <Star className="h-4 w-4 mr-1 fill-current" />
                            Featured
                          </>
                        ) : (
                          <>
                            <StarOff className="h-4 w-4 mr-1" />
                            Feature
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {course.is_featured ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveRank(course, 'up')}
                            disabled={saving === course.id || course.featured_rank === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={course.featured_rank}
                            onChange={(e) => handleRankChange(course.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveRank(course, 'down')}
                            disabled={saving === course.id}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          {pendingChanges[course.id]?.featured_rank !== undefined && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={() => handleSaveRank(course)}
                              disabled={saving === course.id}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm text-center block">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
