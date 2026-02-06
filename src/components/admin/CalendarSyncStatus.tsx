import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  ExternalLink 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarSyncStatusProps {
  status: string | null;
  googleEventId: string | null;
  googleCalendarId: string | null;
  lastSyncedAt: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
}

export function CalendarSyncStatus({
  status,
  googleEventId,
  googleCalendarId,
  lastSyncedAt,
  onRetry,
  isRetrying,
  compact = false,
}: CalendarSyncStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle2,
          label: 'Synced',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
      case 'failed':
        return {
          icon: AlertCircle,
          label: 'Sync Failed',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      default:
        return {
          icon: Calendar,
          label: 'Not Synced',
          variant: 'outline' as const,
          className: 'text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const googleCalendarUrl = googleEventId && googleCalendarId
    ? `https://calendar.google.com/calendar/event?eid=${btoa(`${googleEventId} ${googleCalendarId}`)}`
    : googleEventId
    ? `https://calendar.google.com/calendar/r/search?q=${encodeURIComponent(googleEventId)}`
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className={cn('text-xs', config.className)}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        {status === 'failed' && onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-6 px-2"
          >
            <RefreshCw className={cn('h-3 w-3', isRetrying && 'animate-spin')} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className={config.className}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        
        {lastSyncedAt && status === 'synced' && (
          <span className="text-xs text-muted-foreground">
            Last synced: {new Date(lastSyncedAt).toLocaleString('en-GB', { 
              timeZone: 'Europe/London',
              dateStyle: 'short',
              timeStyle: 'short'
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === 'failed' && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isRetrying && 'animate-spin')} />
            Retry Sync
          </Button>
        )}

        {googleCalendarUrl && status === 'synced' && (
          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in Google Calendar
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
