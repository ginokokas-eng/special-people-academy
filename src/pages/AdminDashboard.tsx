import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Eye,
  EyeOff,
  Video,
  UserPlus,
  GraduationCap,
  Shield
} from 'lucide-react';
import { PracticalSessionsManager } from '@/components/admin/PracticalSessionsManager';
import { CertificateReporting } from '@/components/admin/CertificateReporting';
import { FeaturedCoursesManager } from '@/components/admin/FeaturedCoursesManager';
import { CourseOfferingsManager } from '@/components/admin/CourseOfferingsManager';
import { PaymentsHealthPanel } from '@/components/admin/PaymentsHealthPanel';
import { AdminOverviewCards } from '@/components/admin/AdminOverviewCards';
import { AdminTableControls } from '@/components/admin/AdminTableControls';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  duration_minutes: number;
  is_published: boolean;
  requires_practical_signoff: boolean;
  delivery_type: string | null;
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  course_id: string;
}

interface User {
  id: string;
  email: string;
  profile: {
    full_name: string | null;
    department: string | null;
  } | null;
  enrollments: number;
  enrolledCourses: string[];
}

interface Stats {
  totalLearners: number;
  activeEnrollments: number;
  upcomingSessions: number;
  certificatesIssued: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading, rolesLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalLearners: 0,
    activeEnrollments: 0,
    upcomingSessions: 0,
    certificatesIssued: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Table controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [dataLoading, setDataLoading] = useState(true);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  // Destructive-action confirmation dialog state (replaces window.confirm)
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    action: () => void;
  }>({ open: false, title: '', description: '', confirmLabel: 'Delete', action: () => {} });

  const askConfirm = (
    title: string,
    description: string,
    action: () => void,
    confirmLabel = 'Delete',
  ) => setConfirmState({ open: true, title, description, confirmLabel, action });

  // Lesson management state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Assign training state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<User | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'New Joiner',
    duration_minutes: 0,
    is_published: false,
    requires_practical_signoff: false,
    delivery_type: 'online',
  });

  // Lesson form state
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    duration_minutes: 0,
    order_index: 0,
  });

  // ProtectedRoute already handles auth + role guard, so fetch data on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      setCourses(coursesData || []);

      // Fetch users with profiles and their enrollments
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, department');

      // Fetch ALL enrollments once and group them by user (no per-user N+1).
      const { data: allEnrollments } = await supabase
        .from('enrollments')
        .select('user_id, course_id');

      const enrollmentsByUser = new Map<string, string[]>();
      for (const e of allEnrollments || []) {
        const list = enrollmentsByUser.get(e.user_id) || [];
        list.push(e.course_id);
        enrollmentsByUser.set(e.user_id, list);
      }

      const usersWithEnrollments: User[] = (profilesData || []).map(profile => {
        const enrolledCourses = enrollmentsByUser.get(profile.user_id) || [];
        return {
          id: profile.user_id,
          email: '',
          profile: {
            full_name: profile.full_name,
            department: profile.department,
          },
          enrollments: enrolledCourses.length,
          enrolledCourses,
        };
      });
      setUsers(usersWithEnrollments);

      // Calculate enhanced stats
      const { count: totalEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .is('completed_at', null); // Active (not completed) enrollments

      const { count: upcomingSessions } = await supabase
        .from('practical_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('session_date', new Date().toISOString());

      const { count: certificatesCount } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalLearners: profilesData?.length || 0,
        activeEnrollments: totalEnrollments || 0,
        upcomingSessions: upcomingSessions || 0,
        certificatesIssued: certificatesCount || 0,
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    fetchData();
  };

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    let result = [...courses];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.category.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter((course) => course.category === categoryFilter);
    }
    
    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'category':
        result.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }
    
    return result;
  }, [courses, searchQuery, categoryFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCourses.slice(start, start + itemsPerPage);
  }, [filteredCourses, currentPage, itemsPerPage]);

  // Get unique categories for filter
  const categoryOptions = useMemo(() => {
    const categories = [...new Set(courses.map((c) => c.category))];
    return categories.map((cat) => ({ label: cat, value: cat }));
  }, [courses]);

  const handleCreateCourse = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      level: 'New Joiner',
      duration_minutes: 0,
      is_published: false,
      requires_practical_signoff: false,
      delivery_type: 'online',
    });
    setCourseDialogOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      category: course.category,
      level: course.level,
      duration_minutes: course.duration_minutes,
      is_published: course.is_published,
      requires_practical_signoff: course.requires_practical_signoff || false,
      delivery_type: course.delivery_type || 'online',
    });
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!formData.title || !formData.category) {
      toast.error('Title and category are required');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            level: formData.level,
            duration_minutes: formData.duration_minutes,
            is_published: formData.is_published,
            requires_practical_signoff: formData.requires_practical_signoff,
            delivery_type: formData.delivery_type,
          })
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast.success('Course updated');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            level: formData.level,
            duration_minutes: formData.duration_minutes,
            is_published: formData.is_published,
            requires_practical_signoff: formData.requires_practical_signoff,
            delivery_type: formData.delivery_type,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Course created');
      }

      setCourseDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Course deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);

      if (error) throw error;
      toast.success(course.is_published ? 'Course unpublished' : 'Course published');
      fetchData();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  // Lesson management functions
  const handleManageLessons = async (course: Course) => {
    setSelectedCourseForLessons(course);
    setLessonsLoading(true);
    setLessonDialogOpen(true);
    
    try {
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index');
      
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLessonsLoading(false);
    }
  };

  const handleAddLesson = () => {
    setEditingLesson(null);
    setLessonFormData({
      title: '',
      description: '',
      video_url: '',
      duration_minutes: 0,
      order_index: lessons.length,
    });
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonFormData({
      title: lesson.title,
      description: lesson.description || '',
      video_url: lesson.video_url || '',
      duration_minutes: lesson.duration_minutes,
      order_index: lesson.order_index,
    });
  };

  const handleSaveLesson = async () => {
    if (!lessonFormData.title || !selectedCourseForLessons) {
      toast.error('Lesson title is required');
      return;
    }

    setSaving(true);
    try {
      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonFormData.title,
            description: lessonFormData.description,
            video_url: lessonFormData.video_url,
            duration_minutes: lessonFormData.duration_minutes,
            order_index: lessonFormData.order_index,
          })
          .eq('id', editingLesson.id);

        if (error) throw error;
        toast.success('Lesson updated');
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert({
            course_id: selectedCourseForLessons.id,
            title: lessonFormData.title,
            description: lessonFormData.description,
            video_url: lessonFormData.video_url,
            duration_minutes: lessonFormData.duration_minutes,
            order_index: lessonFormData.order_index,
          });

        if (error) throw error;
        toast.success('Lesson added');
      }

      // Refresh lessons
      handleManageLessons(selectedCourseForLessons);
      setEditingLesson(null);
      setLessonFormData({
        title: '',
        description: '',
        video_url: '',
        duration_minutes: 0,
        order_index: lessons.length + 1,
      });
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      toast.success('Lesson deleted');
      if (selectedCourseForLessons) {
        handleManageLessons(selectedCourseForLessons);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Failed to delete lesson');
    }
  };

  // Assign training functions
  const handleOpenAssignDialog = (u: User) => {
    setSelectedUserForAssign(u);
    setSelectedCourseIds(u.enrolledCourses);
    setAssignDialogOpen(true);
  };

  const handleToggleCourseAssignment = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedUserForAssign) return;

    setAssigning(true);
    try {
      const currentEnrolled = selectedUserForAssign.enrolledCourses;
      const toAdd = selectedCourseIds.filter(id => !currentEnrolled.includes(id));
      const toRemove = currentEnrolled.filter(id => !selectedCourseIds.includes(id));

      // Add new enrollments
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('enrollments')
          .insert(toAdd.map(courseId => ({
            user_id: selectedUserForAssign.id,
            course_id: courseId,
          })));
        
        if (error) throw error;
      }

      // Remove enrollments
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('enrollments')
          .delete()
          .eq('user_id', selectedUserForAssign.id)
          .in('course_id', toRemove);
        
        if (error) throw error;
      }

      toast.success('Training assignments updated');
      setAssignDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating assignments:', error);
      toast.error('Failed to update assignments');
    } finally {
      setAssigning(false);
    }
  };

  // Show skeleton while auth/roles are loading
  if (authLoading || rolesLoading) {
    return (
      <PortalLayout title="Admin Dashboard">
        <div className="space-y-6">
          {/* Skeleton for stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Skeleton for tabs */}
          <Skeleton className="h-10 w-full max-w-2xl" />
          {/* Skeleton for table */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Admin Dashboard">
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage courses, users, and platform settings</p>
          </div>
          <Button onClick={() => navigate('/admin-portal/staff-management')} variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Staff Management
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <AdminOverviewCards
          totalLearners={stats.totalLearners}
          activeEnrollments={stats.activeEnrollments}
          upcomingSessions={stats.upcomingSessions}
          certificatesIssued={stats.certificatesIssued}
          loading={dataLoading}
        />

        {/* Tabs */}
        <Tabs defaultValue="courses" className="w-full mt-2">
          <TabsList className="flex-wrap h-auto mb-4">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="offerings">Offerings & Pricing</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="sessions">Practical Sessions</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage Courses</CardTitle>
                <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleCreateCourse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCourse ? 'Edit Course' : 'Create New Course'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Course title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Course description"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Input
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="e.g. Safety"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="level">Level</Label>
                          <Select
                            value={formData.level}
                            onValueChange={(value) => setFormData({ ...formData, level: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Awareness">Awareness</SelectItem>
                              <SelectItem value="New Joiner">New Joiner</SelectItem>
                              <SelectItem value="Enhanced">Enhanced</SelectItem>
                              <SelectItem value="Complex">Complex</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration (minutes)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={formData.duration_minutes}
                            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="delivery_type">Delivery Type</Label>
                          <Select
                            value={formData.delivery_type}
                            onValueChange={(value) => setFormData({ ...formData, delivery_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="online">Online Only</SelectItem>
                              <SelectItem value="blended">Blended (Online + Practical)</SelectItem>
                              <SelectItem value="classroom">Classroom Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {(formData.delivery_type === 'blended' || formData.delivery_type === 'classroom') && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor="practical_signoff">Require Practical Sign-off</Label>
                            <p className="text-xs text-muted-foreground">
                              Learners must pass practical assessment to complete
                            </p>
                          </div>
                          <Switch
                            id="practical_signoff"
                            checked={formData.requires_practical_signoff}
                            onCheckedChange={(checked) => setFormData({ ...formData, requires_practical_signoff: checked })}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="published">Publish immediately</Label>
                        <Switch
                          id="published"
                          checked={formData.is_published}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                        />
                      </div>
                      <Button onClick={handleSaveCourse} className="w-full" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          editingCourse ? 'Update Course' : 'Create Course'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Table Controls */}
                <AdminTableControls
                  searchValue={searchQuery}
                  onSearchChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                  searchPlaceholder="Search courses..."
                  filterOptions={categoryOptions}
                  filterValue={categoryFilter}
                  onFilterChange={(value) => {
                    setCategoryFilter(value);
                    setCurrentPage(1);
                  }}
                  filterPlaceholder="Category"
                  sortOptions={[
                    { label: 'Newest', value: 'newest' },
                    { label: 'Oldest', value: 'oldest' },
                    { label: 'Title A-Z', value: 'title' },
                    { label: 'Category', value: 'category' },
                  ]}
                  sortValue={sortBy}
                  onSortChange={setSortBy}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredCourses.length}
                  itemsPerPage={itemsPerPage}
                  lastUpdated={lastUpdated}
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataLoading ? (
                      // Loading skeletons
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedCourses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchQuery || categoryFilter !== 'all' 
                            ? 'No courses match your search criteria.' 
                            : 'No courses yet. Create your first course.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              {course.title}
                              {course.requires_practical_signoff && (
                                <Badge variant="outline" className="w-fit text-xs bg-primary/10 text-primary border-primary/20">
                                  <GraduationCap className="h-3 w-3 mr-1" />
                                  Practical Required
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{course.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {course.delivery_type || 'online'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={course.is_published ? 'default' : 'secondary'}>
                              {course.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleManageLessons(course)}
                                title="Manage Lessons"
                              >
                                <Video className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePublish(course)}
                                title={course.is_published ? 'Unpublish' : 'Publish'}
                              >
                                {course.is_published ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCourse(course)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => askConfirm(
                                  'Delete course?',
                                  `This will permanently delete "${course.title}". This cannot be undone.`,
                                  () => handleDeleteCourse(course.id),
                                )}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="featured" className="mt-6">
            <FeaturedCoursesManager />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentsHealthPanel />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No users yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.profile?.full_name || 'No name'}
                          </TableCell>
                          <TableCell>{u.profile?.department || '-'}</TableCell>
                          <TableCell>{u.enrollments}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAssignDialog(u)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign Training
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="mt-6">
            <PracticalSessionsManager />
          </TabsContent>

          <TabsContent value="certificates" className="mt-6">
            <CertificateReporting />
          </TabsContent>

          <TabsContent value="offerings" className="mt-6">
            <CourseOfferingsManager />
          </TabsContent>
        </Tabs>

        {/* Lesson Management Dialog */}
        <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Manage Lessons - {selectedCourseForLessons?.title}
              </DialogTitle>
            </DialogHeader>
            
            {lessonsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Lesson Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={lessonFormData.title}
                          onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                          placeholder="Lesson title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={lessonFormData.duration_minutes}
                          onChange={(e) => setLessonFormData({ ...lessonFormData, duration_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={lessonFormData.description}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                        placeholder="Lesson description"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Video URL (YouTube embed URL)</Label>
                      <Input
                        value={lessonFormData.video_url}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, video_url: e.target.value })}
                        placeholder="https://www.youtube.com/embed/..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveLesson} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          editingLesson ? 'Update Lesson' : 'Add Lesson'
                        )}
                      </Button>
                      {editingLesson && (
                        <Button variant="outline" onClick={handleAddLesson}>
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Lessons List */}
                <div className="space-y-2">
                  <h3 className="font-medium">Lessons ({lessons.length})</h3>
                  {lessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No lessons yet. Add your first lesson above.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <div>
                              <p className="font-medium">{lesson.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {lesson.duration_minutes} min
                                {lesson.video_url && ' • Video included'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditLesson(lesson)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => askConfirm(
                                'Delete lesson?',
                                `This will permanently delete "${lesson.title}". This cannot be undone.`,
                                () => handleDeleteLesson(lesson.id),
                              )}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Training Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Assign Training
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign courses to <span className="font-medium text-foreground">{selectedUserForAssign?.profile?.full_name || 'this user'}</span>
              </p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {courses.filter(c => c.is_published).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No published courses available
                  </p>
                ) : (
                  courses.filter(c => c.is_published).map((course) => (
                    <div
                      key={course.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCourseIds.includes(course.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggleCourseAssignment(course.id)}
                    >
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">{course.category} • {course.level}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedCourseIds.includes(course.id) ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {selectedCourseIds.includes(course.id) && (
                          <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button onClick={handleSaveAssignments} className="w-full" disabled={assigning}>
                {assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save Assignments (${selectedCourseIds.length} courses)`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
