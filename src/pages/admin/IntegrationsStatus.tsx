import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw, 
  Loader2,
  Mail,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PracticalSession {
  id: string;
  session_date: string | null;
  location: string | null;
  calendar_sync_status: string | null;
  outlook_event_id: string | null;
  outlook_calendar_owner: string | null;
  last_synced_at: string | null;
  calendar_last_error: string | null;
  course_title: string;
}

interface SyncStats {
  total: number;
  synced: number;
  failed: number;
  notSynced: number;
  lastSuccessfulSync: string | null;
  mostRecentError: string | null;
}

export default function IntegrationsStatus() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: rolesLoading } = useRoles();
  const [sessions, setSessions] = useState<PracticalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!rolesLoading && !isSuperAdmin) {
      navigate('/access-denied');
    }
  }, [rolesLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSessions();
    }
  }, [isSuperAdmin]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('practical_sessions')
        .select(`
          id,
          session_date,
          location,
          calendar_sync_status,
          outlook_event_id,
          outlook_calendar_owner,
          last_synced_at,
          calendar_last_error,
          courses!inner(title)
        `)
        .order('session_date', { ascending: false });

      if (error) throw error;

      const formattedSessions = (data || []).map(session => ({
        id: session.id,
        session_date: session.session_date,
        location: session.location,
        calendar_sync_status: session.calendar_sync_status,
        outlook_event_id: session.outlook_event_id,
        outlook_calendar_owner: session.outlook_calendar_owner,
        last_synced_at: session.last_synced_at,
        calendar_last_error: session.calendar_last_error,
        course_title: (session.courses as any)?.title || 'Unknown Course',
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const getStats = (): SyncStats => {
    const synced = sessions.filter(s => s.calendar_sync_status === 'ok').length;
    const failed = sessions.filter(s => s.calendar_sync_status === 'failed').length;
    const notSynced = sessions.filter(s => !s.calendar_sync_status || s.calendar_sync_status === 'not_synced' || s.calendar_sync_status === 'not_configured').length;
    
    const syncedSessions = sessions.filter(s => s.last_synced_at);
    const lastSuccessfulSync = syncedSessions.length > 0 
      ? syncedSessions.sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0].last_synced_at
      : null;

    const failedSessions = sessions.filter(s => s.calendar_sync_status === 'failed' && s.calendar_last_error);
    const mostRecentError = failedSessions.length > 0 ? failedSessions[0].calendar_last_error : null;

    return {
      total: sessions.length,
      synced,
      failed,
      notSynced,
      lastSuccessfulSync,
      mostRecentError,
    };
  };

  const retrySync = async (sessionId: string) => {
    setRetryingIds(prev => new Set(prev).add(sessionId));
    
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Determine whether to create or update
      const functionName = session.outlook_event_id ? 'outlook-update-event' : 'outlook-create-event';
      
      const { error } = await supabase.functions.invoke(functionName, {
        body: { sessionId },
      });

      if (error) throw error;
      
      toast.success('Sync initiated successfully');
      await fetchSessions();
    } catch (error: any) {
      console.error('Error retrying sync:', error);
      toast.error(error.message || 'Failed to retry sync');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const retryAllFailed = async () => {
    const failedSessions = sessions.filter(s => s.calendar_sync_status === 'failed');
    if (failedSessions.length === 0) {
      toast.info('No failed sessions to retry');
      return;
    }

    setRetryingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const session of failedSessions) {
      try {
        const functionName = session.outlook_event_id ? 'outlook-update-event' : 'outlook-create-event';
        
        const { error } = await supabase.functions.invoke(functionName, {
          body: { sessionId: session.id },
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to sync session ${session.id}:`, error);
        failCount++;
      }
    }

    setRetryingAll(false);
    await fetchSessions();

    if (successCount > 0 && failCount === 0) {
      toast.success(`Successfully retried ${successCount} session(s)`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`Retried ${successCount} session(s), ${failCount} still failed`);
    } else {
      toast.error(`All ${failCount} retries failed`);
    }
  };

  const stats = getStats();
  const failedSessions = sessions.filter(s => s.calendar_sync_status === 'failed');

  if (rolesLoading || loading) {
    return (
      <PortalLayout title="Integrations Status">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Integrations Status">
      <div className="space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold">Integrations Status</h1>
          <p className="text-muted-foreground">Monitor and manage external service integrations</p>
        </div>

        {/* Outlook Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Outlook Calendar</CardTitle>
                  <CardDescription>Microsoft 365 calendar sync for practical sessions</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuration */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Mail className="h-4 w-4" />
                  Calendar Owner
                </div>
                <p className="font-medium">training@specialpeople.org.uk</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Sessions Synced
                </div>
                <p className="text-2xl font-bold text-success">{stats.synced}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Failed to Sync
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  Last Successful Sync
                </div>
                <p className="font-medium">
                  {stats.lastSuccessfulSync 
                    ? format(new Date(stats.lastSuccessfulSync), 'PPp')
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            {/* Most Recent Error */}
            {stats.mostRecentError && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Most Recent Error</p>
                    <p className="text-sm text-muted-foreground mt-1">{stats.mostRecentError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Failed Sessions Table */}
            {failedSessions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Failed Sessions</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={retryAllFailed}
                    disabled={retryingAll}
                  >
                    {retryingAll ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Retry All Failed ({failedSessions.length})
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Session Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.course_title}</TableCell>
                          <TableCell>
                            {session.session_date 
                              ? format(new Date(session.session_date), 'PPp')
                              : 'TBC'
                            }
                          </TableCell>
                          <TableCell>{session.location || 'TBC'}</TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm text-destructive truncate block max-w-[200px] cursor-help">
                                    {session.calendar_last_error || 'Unknown error'}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm">
                                  <p>{session.calendar_last_error || 'Unknown error'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retrySync(session.id)}
                              disabled={retryingIds.has(session.id)}
                            >
                              {retryingIds.has(session.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* No Failed Sessions */}
            {failedSessions.length === 0 && stats.synced > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="font-medium">All sessions synced successfully</p>
                <p className="text-sm">{stats.synced} session(s) synced to Outlook calendar</p>
              </div>
            )}

            {/* No Synced Sessions */}
            {stats.synced === 0 && stats.failed === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No calendar syncs yet</p>
                <p className="text-sm">Sessions will sync when calendar sync is enabled</p>
              </div>
            )}

            {/* Quick Links */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://outlook.office.com/calendar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Outlook Calendar
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchSessions}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
