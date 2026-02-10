import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CompetencySignoffDialog } from '@/components/trainer/CompetencySignoffDialog';
import { BLSSignoffDialog } from '@/components/trainer/BLSSignoffDialog';
import { RespiratorySignoffDialog } from '@/components/trainer/RespiratorySignoffDialog';

const BLS_COURSE_ID = 'b1500001-0001-0001-0001-000000000001';
const RESPIRATORY_COURSE_ID = '0c51cead-3b6f-4dea-97eb-f632305e566b';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PracticalSession {
  id: string;
  session_date: string | null;
  location: string | null;
  max_attendees: number | null;
  notes: string | null;
  course_id: string;
  course_title: string;
}

interface EnrolledLearner {
  user_id: string;
  full_name: string | null;
  email: string;
  attendance?: {
    id: string;
    attended: boolean | null;
    competency_outcome: string | null;
    notes: string | null;
  };
}

export default function TrainerPortal() {
  const { user, loading: authLoading, rolesLoading, isTrainer } = useAuth();
  const { canSignOffCompetency, loading: permissionsLoading } = useRoles();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PracticalSession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PracticalSession | null>(null);
  const [learners, setLearners] = useState<EnrolledLearner[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [competencyDialogOpen, setCompetencyDialogOpen] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState<EnrolledLearner | null>(null);
  const [saving, setSaving] = useState(false);

  // Attendance form state
  const [attendanceForm, setAttendanceForm] = useState({
    attended: '' as '' | 'yes' | 'no',
    competency_outcome: '' as '' | 'pass' | 'needs_practice',
    notes: '',
  });

  const openCompetencyDialog = (learner: EnrolledLearner) => {
    setSelectedLearner(learner);
    setCompetencyDialogOpen(true);
  };

  // Auth guard - wait for both auth and roles to be resolved
  useEffect(() => {
    if (authLoading || rolesLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!isTrainer) {
      navigate('/dashboard');
      toast.error('Access denied. Trainers only.');
      return;
    }
    
    if (!initialLoadDone) {
      setInitialLoadDone(true);
      fetchSessions();
    }
  }, [user, authLoading, rolesLoading, isTrainer, navigate, initialLoadDone]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('practical_sessions')
        .select(`
          id,
          session_date,
          location,
          max_attendees,
          notes,
          course_id,
          courses!inner(title)
        `)
        .eq('trainer_id', user?.id)
        .gte('session_date', new Date().toISOString())
        .order('session_date', { ascending: true });

      if (error) throw error;

      const formattedSessions = (data || []).map(session => ({
        id: session.id,
        session_date: session.session_date,
        location: session.location,
        max_attendees: session.max_attendees,
        notes: session.notes,
        course_id: session.course_id,
        course_title: (session.courses as any)?.title || 'Unknown Course',
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchLearners = async (session: PracticalSession) => {
    setSelectedSession(session);
    setLearnersLoading(true);
    
    try {
      // Get enrolled learners for this course
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          profiles!inner(full_name, user_id)
        `)
        .eq('course_id', session.course_id);

      if (enrollError) throw enrollError;

      // Get attendance records for this session
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('practical_attendance')
        .select('*')
        .eq('session_id', session.id);

      if (attendanceError) throw attendanceError;

      const learnersWithAttendance: EnrolledLearner[] = (enrollments || []).map(enrollment => {
        const attendance = attendanceData?.find(a => a.user_id === enrollment.user_id);
        return {
          user_id: enrollment.user_id,
          full_name: (enrollment.profiles as any)?.full_name || null,
          email: '', // We don't have access to auth.users emails
          attendance: attendance ? {
            id: attendance.id,
            attended: attendance.attended,
            competency_outcome: attendance.competency_outcome,
            notes: attendance.notes,
          } : undefined,
        };
      });

      setLearners(learnersWithAttendance);
    } catch (error) {
      console.error('Error fetching learners:', error);
      toast.error('Failed to load learners');
    } finally {
      setLearnersLoading(false);
    }
  };

  const openAttendanceDialog = (learner: EnrolledLearner) => {
    setSelectedLearner(learner);
    setAttendanceForm({
      attended: learner.attendance?.attended === true ? 'yes' : learner.attendance?.attended === false ? 'no' : '',
      competency_outcome: (learner.attendance?.competency_outcome as 'pass' | 'needs_practice') || '',
      notes: learner.attendance?.notes || '',
    });
    setAttendanceDialogOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedLearner || !selectedSession) return;

    // Validate notes required for needs_practice
    if (attendanceForm.competency_outcome === 'needs_practice' && !attendanceForm.notes.trim()) {
      toast.error('Notes are required when marking "Needs Practice"');
      return;
    }

    // Backend validation: Block competency sign-off if user doesn't have permission
    if (attendanceForm.competency_outcome === 'pass' && !canSignOffCompetency) {
      toast.error('You do not have permission to sign off competency. Please contact an authorized trainer.');
      return;
    }

    setSaving(true);
    try {
      const attendanceData = {
        session_id: selectedSession.id,
        user_id: selectedLearner.user_id,
        attended: attendanceForm.attended === 'yes' ? true : attendanceForm.attended === 'no' ? false : null,
        // Only set competency outcome if user has permission to sign off
        competency_outcome: canSignOffCompetency ? (attendanceForm.competency_outcome || null) : null,
        notes: attendanceForm.notes || null,
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
      };

      if (selectedLearner.attendance?.id) {
        // Update existing record
        const { error } = await supabase
          .from('practical_attendance')
          .update(attendanceData)
          .eq('id', selectedLearner.attendance.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('practical_attendance')
          .insert(attendanceData);

        if (error) throw error;
      }

      // Send notification if needs practice
      if (attendanceForm.competency_outcome === 'needs_practice') {
        await supabase
          .from('learner_notifications')
          .insert({
            user_id: selectedLearner.user_id,
            title: 'Practical Session: Further Practice Required',
            message: `Your practical assessment for "${selectedSession.course_title}" has been marked as "Needs Practice". Trainer notes: ${attendanceForm.notes}. Please contact your trainer to arrange another session.`,
            related_session_id: selectedSession.id,
            related_course_id: selectedSession.course_id,
          });
      }

      // If passed, send congratulations and trigger certificate check (via edge function)
      if (attendanceForm.competency_outcome === 'pass') {
        // Send success notification to learner
        await supabase
          .from('learner_notifications')
          .insert({
            user_id: selectedLearner.user_id,
            title: 'Practical Assessment Passed!',
            message: `Congratulations! You have successfully passed the practical assessment for "${selectedSession.course_title}". Your competency has been signed off.`,
            related_session_id: selectedSession.id,
            related_course_id: selectedSession.course_id,
          });
      }

      toast.success('Attendance updated successfully');
      setAttendanceDialogOpen(false);
      fetchLearners(selectedSession);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (learner: EnrolledLearner) => {
    if (!learner.attendance) {
      return <Badge variant="outline" className="text-muted-foreground">Not marked</Badge>;
    }

    if (learner.attendance.attended === false) {
      return <Badge variant="destructive">Absent</Badge>;
    }

    if (learner.attendance.competency_outcome === 'pass') {
      return <Badge className="bg-success text-success-foreground">Pass</Badge>;
    }

    if (learner.attendance.competency_outcome === 'needs_practice') {
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Needs Practice</Badge>;
    }

    if (learner.attendance.attended === true) {
      return <Badge variant="outline" className="text-primary border-primary">Attended - Pending</Badge>;
    }

    return <Badge variant="outline" className="text-muted-foreground">Not marked</Badge>;
  };

  if (authLoading || rolesLoading || permissionsLoading) {
    return (
      <PortalLayout title="Trainer Portal">
        <div className="p-6 space-y-6">
          {/* Skeleton for sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Skeleton className="h-6 w-40" />
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Trainer Portal">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trainer Portal</h1>
          <p className="text-muted-foreground mt-1">Manage your practical sessions and learner attendance</p>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Sessions
            </h2>
            
            {sessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No upcoming sessions assigned
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <Card 
                    key={session.id} 
                    className={`cursor-pointer transition-all hover:shadow-card-hover ${
                      selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => fetchLearners(session)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-medium text-foreground mb-2">{session.course_title}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {session.session_date 
                            ? format(new Date(session.session_date), 'PPp')
                            : 'Date TBC'
                          }
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {session.location || 'Location TBC'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Max {session.max_attendees || 20} attendees
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Learners Panel */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    {selectedSession.course_title}
                  </CardTitle>
                  <CardDescription>
                    {selectedSession.session_date 
                      ? format(new Date(selectedSession.session_date), 'PPPP')
                      : 'Date TBC'
                    } • {selectedSession.location || 'Location TBC'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {learnersLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : learners.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No learners enrolled in this course
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Learner</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {learners.map(learner => (
                          <TableRow key={learner.user_id}>
                            <TableCell className="font-medium">
                              {learner.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(learner)}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                              {learner.attendance?.notes || '-'}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openAttendanceDialog(learner)}
                              >
                                Mark Attendance
                              </Button>
                              {learner.attendance?.attended === true && (
                                <Button 
                                  size="sm" 
                                  variant={canSignOffCompetency ? "default" : "outline"}
                                  onClick={() => openCompetencyDialog(learner)}
                                >
                                  <ShieldCheck className="h-4 w-4 mr-1" />
                                  {canSignOffCompetency ? 'Competency Sign-off' : 'View Checklist'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full min-h-[300px] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a session to view enrolled learners</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              {selectedLearner?.full_name || 'Learner'} - {selectedSession?.course_title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Attended</Label>
              <Select
                value={attendanceForm.attended}
                onValueChange={(value) => setAttendanceForm(prev => ({ 
                  ...prev, 
                  attended: value as 'yes' | 'no' | '',
                  competency_outcome: value === 'no' ? '' : prev.competency_outcome,
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select attendance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Yes - Attended
                    </span>
                  </SelectItem>
                  <SelectItem value="no">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      No - Absent
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {attendanceForm.attended === 'yes' && canSignOffCompetency && (
              <div className="space-y-2">
                <Label>Competency Outcome</Label>
                <Select
                  value={attendanceForm.competency_outcome}
                  onValueChange={(value) => setAttendanceForm(prev => ({ 
                    ...prev, 
                    competency_outcome: value as 'pass' | 'needs_practice' | '',
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Pass - Competent
                      </span>
                    </SelectItem>
                    <SelectItem value="needs_practice">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" />
                        Needs Practice
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {attendanceForm.attended === 'yes' && !canSignOffCompetency && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                You can mark attendance, but you do not have permission to sign off competency. 
                An authorized trainer will need to complete the competency assessment.
              </p>
            )}

            <div className="space-y-2">
              <Label>
                Notes {attendanceForm.competency_outcome === 'needs_practice' && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Textarea
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={
                  attendanceForm.competency_outcome === 'needs_practice'
                    ? 'Required: Explain areas for improvement...'
                    : 'Optional notes about the learner\'s performance...'
                }
                rows={3}
              />
              {attendanceForm.competency_outcome === 'needs_practice' && (
                <p className="text-xs text-muted-foreground">
                  Notes are required when marking "Needs Practice". The learner will receive a notification.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAttendance} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Competency Sign-off Dialog — route BLS course to its own checklist */}
      {selectedLearner && selectedSession && (
        selectedSession.course_id === BLS_COURSE_ID ? (
          <BLSSignoffDialog
            open={competencyDialogOpen}
            onOpenChange={setCompetencyDialogOpen}
            learnerId={selectedLearner.user_id}
            learnerName={selectedLearner.full_name || 'Unknown Learner'}
            courseId={selectedSession.course_id}
            courseTitle={selectedSession.course_title}
            onSuccess={() => fetchLearners(selectedSession)}
          />
        ) : selectedSession.course_id === RESPIRATORY_COURSE_ID ? (
          <RespiratorySignoffDialog
            open={competencyDialogOpen}
            onOpenChange={setCompetencyDialogOpen}
            learnerId={selectedLearner.user_id}
            learnerName={selectedLearner.full_name || 'Unknown Learner'}
            courseId={selectedSession.course_id}
            courseTitle={selectedSession.course_title}
            onSuccess={() => fetchLearners(selectedSession)}
          />
        ) : (
          <CompetencySignoffDialog
            open={competencyDialogOpen}
            onOpenChange={setCompetencyDialogOpen}
            learnerId={selectedLearner.user_id}
            learnerName={selectedLearner.full_name || 'Unknown Learner'}
            courseId={selectedSession.course_id}
            courseTitle={selectedSession.course_title}
            onSuccess={() => fetchLearners(selectedSession)}
          />
        )
      )}
    </PortalLayout>
  );
}
