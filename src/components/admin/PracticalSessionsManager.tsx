import { useEffect, useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Calendar,
  MapPin,
  Users,
  UserCheck,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarSyncStatus } from './CalendarSyncStatus';
import { downloadICSFile, createSessionEventData } from '@/lib/ics-generator';

interface Course {
  id: string;
  title: string;
  delivery_type: string | null;
}

interface Trainer {
  user_id: string;
  full_name: string | null;
}

interface PracticalSession {
  id: string;
  course_id: string;
  session_date: string | null;
  location: string | null;
  max_attendees: number | null;
  notes: string | null;
  trainer_id: string | null;
  course_title: string;
  trainer_name: string | null;
  outlook_event_id: string | null;
  outlook_calendar_owner: string | null;
  calendar_sync_status: string | null;
  last_synced_at: string | null;
  calendar_last_error: string | null;
}

export function PracticalSessionsManager() {
  const [sessions, setSessions] = useState<PracticalSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PracticalSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingSessionId, setSyncingSessionId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    course_id: '',
    session_date: '',
    location: '',
    max_attendees: 20,
    notes: '',
    trainer_id: '',
    sync_to_calendar: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch blended courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, delivery_type')
        .eq('delivery_type', 'blended');

      setCourses(coursesData || []);

      // Fetch trainers (users with trainer role)
      const { data: trainerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'trainer');

      if (trainerRoles && trainerRoles.length > 0) {
        const trainerIds = trainerRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', trainerIds);

        setTrainers(profiles || []);
      }

      // Fetch sessions with course and trainer info
      const { data: sessionsData } = await supabase
        .from('practical_sessions')
        .select(`
          id,
          course_id,
          session_date,
          location,
          max_attendees,
          notes,
          trainer_id,
          outlook_event_id,
          outlook_calendar_owner,
          calendar_sync_status,
          last_synced_at,
          calendar_last_error,
          courses(title)
        `)
        .order('session_date', { ascending: true });

      // Get trainer names
      const sessionsWithTrainers: PracticalSession[] = await Promise.all(
        (sessionsData || []).map(async (session) => {
          let trainerName = null;
          if (session.trainer_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', session.trainer_id)
              .single();
            trainerName = profile?.full_name || null;
          }
          return {
            id: session.id,
            course_id: session.course_id,
            session_date: session.session_date,
            location: session.location,
            max_attendees: session.max_attendees,
            notes: session.notes,
            trainer_id: session.trainer_id,
            course_title: (session.courses as any)?.title || 'Unknown',
            trainer_name: trainerName,
            outlook_event_id: session.outlook_event_id,
            outlook_calendar_owner: session.outlook_calendar_owner,
            calendar_sync_status: session.calendar_sync_status,
            last_synced_at: session.last_synced_at,
            calendar_last_error: session.calendar_last_error,
          };
        })
      );

      setSessions(sessionsWithTrainers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSession(null);
    setFormData({
      course_id: '',
      session_date: '',
      location: '',
      max_attendees: 20,
      notes: '',
      trainer_id: '',
      sync_to_calendar: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (session: PracticalSession) => {
    setEditingSession(session);
    setFormData({
      course_id: session.course_id,
      session_date: session.session_date 
        ? format(new Date(session.session_date), "yyyy-MM-dd'T'HH:mm")
        : '',
      location: session.location || '',
      max_attendees: session.max_attendees || 20,
      notes: session.notes || '',
      trainer_id: session.trainer_id || '',
      sync_to_calendar: session.calendar_sync_status === 'synced' || session.calendar_sync_status === 'pending',
    });
    setDialogOpen(true);
  };

  const triggerCalendarSync = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-create-event', {
        body: { sessionId },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Calendar sync error:', error);
      throw error;
    }
  };

  const handleRetrySync = async (session: PracticalSession) => {
    if (!session.session_date) {
      toast.error('Cannot sync session without a date');
      return;
    }

    setSyncingSessionId(session.id);
    try {
      await triggerCalendarSync(session.id);
      toast.success('Calendar sync initiated');
      fetchData();
    } catch (error) {
      toast.error('Failed to sync to calendar');
      fetchData(); // Refresh to show error
    } finally {
      setSyncingSessionId(null);
    }
  };

  const handleSave = async () => {
    if (!formData.course_id) {
      toast.error('Please select a course');
      return;
    }

    setSaving(true);
    try {
      const sessionData = {
        course_id: formData.course_id,
        session_date: formData.session_date || null,
        location: formData.location || null,
        max_attendees: formData.max_attendees,
        notes: formData.notes || null,
        trainer_id: formData.trainer_id || null,
      };

      let savedSessionId: string;
      const courseTitle = courses.find(c => c.id === formData.course_id)?.title || 'Training Session';

      if (editingSession) {
        const { error } = await supabase
          .from('practical_sessions')
          .update(sessionData)
          .eq('id', editingSession.id);

        if (error) throw error;
        savedSessionId = editingSession.id;
        toast.success('Session updated');

        // If sync is enabled and session has a date, trigger update
        if (formData.sync_to_calendar && formData.session_date) {
          // Both create and update functions handle idempotency
          await supabase.functions.invoke('outlook-update-event', {
            body: { sessionId: savedSessionId },
          });
        }
      } else {
        const { data, error } = await supabase
          .from('practical_sessions')
          .insert(sessionData)
          .select('id')
          .single();

        if (error) throw error;
        savedSessionId = data.id;
        toast.success('Session created');

        // If sync is enabled and session has a date, trigger sync
        if (formData.sync_to_calendar && formData.session_date) {
          await triggerCalendarSync(savedSessionId);
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!(await confirmDialog({ title: 'Delete session?', description: 'This will permanently delete this practical session.' }))) return;

    try {
      const session = sessions.find(s => s.id === sessionId);
      
      // If there's a calendar event, try to cancel it
      if (session?.outlook_event_id) {
        await supabase.functions.invoke('outlook-cancel-event', {
          body: { sessionId },
        });
      }

      const { error } = await supabase
        .from('practical_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      toast.success('Session deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleDownloadICS = (session: PracticalSession) => {
    if (!session.session_date) {
      toast.error('Cannot download calendar file - session has no date');
      return;
    }

    const eventData = createSessionEventData(
      session.course_title,
      session.session_date,
      session.location || undefined,
      180, // 3 hours default
      session.notes || undefined
    );

    downloadICSFile(eventData);
    toast.success('Calendar file downloaded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Practical Sessions</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSession ? 'Edit Session' : 'Schedule New Session'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, course_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trainer</Label>
                <Select
                  value={formData.trainer_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trainer_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign a trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map(trainer => (
                      <SelectItem key={trainer.user_id} value={trainer.user_id}>
                        {trainer.full_name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date & Time (Europe/London)</Label>
                <Input
                  type="datetime-local"
                  value={formData.session_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Training Room A, Building 2"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Attendees</Label>
                <Input
                  type="number"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_attendees: parseInt(e.target.value) || 20 }))}
                  min={1}
                  max={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional session notes..."
                  rows={2}
                />
              </div>

              {/* Calendar Sync Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Sync to Admin Calendar</Label>
                  <p className="text-xs text-muted-foreground">
                    Add to SPA Training Delivery calendar
                  </p>
                </div>
                <Switch
                  checked={formData.sync_to_calendar}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_to_calendar: checked }))}
                  disabled={!formData.session_date}
                />
              </div>

              {editingSession && editingSession.calendar_sync_status && (
                <CalendarSyncStatus
                  status={editingSession.calendar_sync_status}
                  outlookEventId={editingSession.outlook_event_id}
                  lastSyncedAt={editingSession.last_synced_at}
                  lastError={editingSession.calendar_last_error}
                  onRetry={() => handleRetrySync(editingSession)}
                  isRetrying={syncingSessionId === editingSession.id}
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSession ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No practical sessions scheduled</p>
            <p className="text-sm mt-1">Create a session for blended courses</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Calendar</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(session => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.course_title}</TableCell>
                    <TableCell>
                      {session.session_date 
                        ? format(new Date(session.session_date), 'PPp')
                        : <span className="text-muted-foreground">TBC</span>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {session.location || <span className="text-muted-foreground">TBC</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.trainer_name ? (
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-primary" />
                          {session.trainer_name}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {session.max_attendees}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CalendarSyncStatus
                        status={session.calendar_sync_status}
                        outlookEventId={session.outlook_event_id}
                        lastSyncedAt={session.last_synced_at}
                        lastError={session.calendar_last_error}
                        onRetry={() => handleRetrySync(session)}
                        isRetrying={syncingSessionId === session.id}
                        compact
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {session.session_date && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDownloadICS(session)}
                            title="Download .ics file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(session)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(session.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
