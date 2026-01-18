import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Award, Download, Loader2, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
}

interface CertificateRecord {
  id: string;
  certificate_number: string;
  issued_at: string;
  user_id: string;
  profile: {
    full_name: string | null;
  } | null;
  course: {
    id: string;
    title: string;
  } | null;
}

export function CertificateReporting() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  
  // Filters
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchCourses();
    fetchCertificates();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    setCourses(data || []);
  };

  const fetchCertificates = async () => {
    setFilterLoading(true);
    try {
      let query = supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          issued_at,
          user_id,
          course:courses(id, title)
        `)
        .order('issued_at', { ascending: false });

      if (selectedCourse && selectedCourse !== 'all') {
        query = query.eq('course_id', selectedCourse);
      }

      if (startDate) {
        query = query.gte('issued_at', startDate);
      }

      if (endDate) {
        // Add one day to include the end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query = query.lt('issued_at', end.toISOString());
      }

      const { data: certsData, error } = await query;

      if (error) {
        console.error('Error fetching certificates:', error);
        toast.error('Failed to fetch certificates');
        return;
      }

      // Fetch profiles for all users
      const userIds = [...new Set((certsData || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedCerts: CertificateRecord[] = (certsData || []).map(cert => ({
        ...cert,
        profile: profileMap.get(cert.user_id) || null,
        course: cert.course as { id: string; title: string } | null,
      }));

      setCertificates(enrichedCerts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchCertificates();
  };

  const handleClearFilters = () => {
    setSelectedCourse('all');
    setStartDate('');
    setEndDate('');
    // Refetch after state updates
    setTimeout(fetchCertificates, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleExportCSV = () => {
    if (certificates.length === 0) {
      toast.error('No certificates to export');
      return;
    }

    const headers = ['Certificate Number', 'Learner Name', 'Course', 'Issue Date'];
    const rows = certificates.map(cert => [
      cert.certificate_number,
      cert.profile?.full_name || 'Unknown',
      cert.course?.title || 'Unknown Course',
      formatDate(cert.issued_at),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `certificates_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  // Group certificates by course for summary
  const courseStats = certificates.reduce((acc, cert) => {
    const courseTitle = cert.course?.title || 'Unknown';
    acc[courseTitle] = (acc[courseTitle] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Certificates</p>
                <p className="text-3xl font-bold">{certificates.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Courses with Certificates</p>
                <p className="text-3xl font-bold">{Object.keys(courseStats).length}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/10">
                <FileText className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold">
                  {certificates.filter(c => {
                    const issued = new Date(c.issued_at);
                    const now = new Date();
                    return issued.getMonth() === now.getMonth() && 
                           issued.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilters} disabled={filterLoading}>
                {filterLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Apply
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificates Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Certificates Issued</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate ID</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Issue Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No certificates found matching the filters
                  </TableCell>
                </TableRow>
              ) : (
                certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm">
                      {cert.certificate_number}
                    </TableCell>
                    <TableCell>{cert.profile?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{cert.course?.title || 'Unknown Course'}</TableCell>
                    <TableCell>{formatDate(cert.issued_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Course Breakdown */}
      {Object.keys(courseStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Certificates by Course</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(courseStats)
                .sort((a, b) => b[1] - a[1])
                .map(([course, count]) => (
                  <div key={course} className="flex items-center justify-between">
                    <span className="text-sm">{course}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(count / certificates.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
