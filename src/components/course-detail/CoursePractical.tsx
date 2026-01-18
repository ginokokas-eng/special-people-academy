import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

interface PracticalSession {
  id: string;
  session_date?: string;
  location?: string;
  max_attendees?: number;
  notes?: string;
}

interface CoursePracticalProps {
  practicalDetails?: string;
  sessions: PracticalSession[];
}

export function CoursePractical({ practicalDetails, sessions }: CoursePracticalProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const upcomingSessions = sessions.filter(
    s => s.session_date && new Date(s.session_date) > new Date()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Practical session details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {practicalDetails && (
          <p className="text-sm text-muted-foreground">{practicalDetails}</p>
        )}

        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Upcoming sessions</h4>
            {upcomingSessions.map((session) => (
              <div 
                key={session.id} 
                className="p-4 rounded-lg border bg-muted/30 space-y-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">{formatDate(session.session_date)}</span>
                </div>
                {session.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{session.location}</span>
                  </div>
                )}
                {session.max_attendees && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Max {session.max_attendees} attendees</span>
                  </div>
                )}
                {session.notes && (
                  <p className="text-xs text-muted-foreground pt-1">{session.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed bg-muted/20 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">To be confirmed</p>
            <p className="text-xs text-muted-foreground mt-1">
              Practical session dates will be announced soon
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}