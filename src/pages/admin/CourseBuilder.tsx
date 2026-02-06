import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, MoreHorizontal, Eye, Edit, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  category: string;
  status: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function CourseBuilder() {
  const navigate = useNavigate();
  const { isSuperAdmin, isOpsTrainingAdmin, loading: rolesLoading } = useRoles();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!rolesLoading && !isSuperAdmin && !isOpsTrainingAdmin) {
      navigate('/access-denied');
    }
  }, [rolesLoading, isSuperAdmin, isOpsTrainingAdmin, navigate]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, category, status, is_published, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: 'New Course',
          category: 'Uncategorized',
          status: 'draft',
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Course created');
      navigate(`/app/admin/courses/${data.id}/edit`);
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course');
    }
  };

  const handleDuplicate = async (course: Course) => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: `${course.title} (Copy)`,
          category: course.category,
          status: 'draft',
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Course duplicated');
      fetchCourses();
    } catch (error) {
      console.error('Error duplicating course:', error);
      toast.error('Failed to duplicate course');
    }
  };

  const getStatusBadge = (status: string, isPublished: boolean) => {
    if (isPublished) {
      return <Badge className="bg-green-500">Published</Badge>;
    }
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'review':
        return <Badge className="bg-yellow-500">In Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (rolesLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Course Builder</h1>
            <p className="text-muted-foreground">Create and manage training courses</p>
          </div>
          <Button onClick={handleCreateCourse}>
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Courses</CardTitle>
                <CardDescription>{courses.length} courses total</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No courses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>{course.category}</TableCell>
                      <TableCell>{getStatusBadge(course.status, course.is_published)}</TableCell>
                      <TableCell>
                        {new Date(course.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/app/admin/courses/${course.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/app/admin/courses/${course.id}/preview`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(course)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
