import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Download, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface Course { id: string; title: string; }

interface ReportRow {
  user_id: string;
  full_name: string | null;
  lessons_completed: number;
  lessons_total: number;
  final_quiz_best_score: number | null;
  final_quiz_attempts_used: number;
  final_quiz_attempts_allowed: number | null;
  final_quiz_passed: boolean;
  completion_certificate_number: string | null;
  completion_certificate_issued_at: string | null;
  completion_certificate_expires_at: string | null;
  practical_signoff_outcome: string | null;
  practical_signoff_at: string | null;
  competency_certificate_number: string | null;
  competency_certificate_issued_at: string | null;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function CourseProgressReport() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [finalQuizPass, setFinalQuizPass] = useState<number>(80);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      setCourses(data || []);
      // Default to the Enteral Feeding course if present
      const enteral = (data || []).find(c => /enteral feeding/i.test(c.title));
      if (enteral) {
        setSelectedCourse(enteral.id);
        await fetchReport(enteral.id);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReport = async (courseId: string) => {
    if (!courseId) return;
    setReportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('course-progress-report', {
        body: { course_id: courseId },
      });
      if (error) throw error;
      setRows(data.rows || []);
      setFinalQuizPass(data.finalQuizPass || 80);
    } catch (e) {
      console.error('Report error:', e);
      toast.error('Failed to load progress report');
      setRows([]);
    } finally {
      setReportLoading(false);
    }
  };

  const handleCourseChange = (value: string) => {
    setSelectedCourse(value);
    fetchReport(value);
  };

  const signoffBadge = (outcome: string | null) => {
    if (outcome === 'competent') return <Badge className="bg-success/15 text-success">Competent</Badge>;
    if (outcome === 'not_yet_competent' || outcome === 'not_yet') return <Badge variant="secondary">Not yet</Badge>;
    return <span className="text-muted-foreground">Pending</span>;
  };

  const handleExportCSV = () => {
    if (rows.length === 0) { toast.error('No data to export'); return; }
    const headers = [
      'Learner', 'Lessons Completed', 'Lessons Total', 'Final Quiz Best %',
      'Quiz Attempts Used', 'Quiz Attempts Allowed', 'Final Quiz Passed',
      'Completion Certificate', 'Completion Issued', 'Completion Expires',
      'Practical Sign-off', 'Sign-off Date', 'Competency Certificate', 'Competency Issued',
    ];
    const csvRows = rows.map(r => [
      r.full_name || 'Unknown',
      r.lessons_completed, r.lessons_total,
      r.final_quiz_best_score ?? '',
      r.final_quiz_attempts_used,
      r.final_quiz_attempts_allowed ?? '∞',
      r.final_quiz_passed ? 'Yes' : 'No',
      r.completion_certificate_number || '',
      fmtDate(r.completion_certificate_issued_at),
      fmtDate(r.completion_certificate_expires_at),
      r.practical_signoff_outcome || 'Pending',
      fmtDate(r.practical_signoff_at),
      r.competency_certificate_number || '',
      fmtDate(r.competency_certificate_issued_at),
    ]);
    const csv = [headers, ...csvRows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `course_progress_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  if (loading) {
    return (
      <Card><CardContent className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Learner Progress Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="space-y-2 md:w-96">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExportCSV} disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {reportLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Final Quiz</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Completion Cert</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Practical Sign-off</TableHead>
                  <TableHead>Competency Cert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No enrolled learners for this course
                    </TableCell>
                  </TableRow>
                ) : rows.map(r => {
                  const lessonsDone = r.lessons_total > 0 && r.lessons_completed >= r.lessons_total;
                  return (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">{r.full_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <span className={lessonsDone ? 'text-success font-medium' : ''}>
                          {r.lessons_completed}/{r.lessons_total}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.final_quiz_best_score === null ? (
                          <span className="text-muted-foreground">Not attempted</span>
                        ) : (
                          <span className={r.final_quiz_passed ? 'text-success font-medium' : 'text-destructive'}>
                            {r.final_quiz_best_score}% {r.final_quiz_passed ? '(Pass)' : `(< ${finalQuizPass}%)`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.final_quiz_attempts_used}
                        {r.final_quiz_attempts_allowed !== null ? `/${r.final_quiz_attempts_allowed}` : ''}
                      </TableCell>
                      <TableCell>
                        {r.completion_certificate_number ? (
                          <Badge className="bg-success/15 text-success">Issued</Badge>
                        ) : <span className="text-muted-foreground">Not issued</span>}
                      </TableCell>
                      <TableCell>{fmtDate(r.completion_certificate_expires_at)}</TableCell>
                      <TableCell>{signoffBadge(r.practical_signoff_outcome)}</TableCell>
                      <TableCell>
                        {r.competency_certificate_number ? (
                          <Badge className="bg-success/15 text-success">Issued</Badge>
                        ) : <span className="text-muted-foreground">Not issued</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
