import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  RefreshCw,
  ExternalLink 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CalendarSyncStatusProps {
  status: string | null;
  outlookEventId: string | null;
  lastSyncedAt: string | null;
  lastError?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
}

export function CalendarSyncStatus({
  status,
  outlookEventId,
  lastSyncedAt,
  lastError,
  onRetry,
  isRetrying,
  compact = false,
}: CalendarSyncStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'ok':
      case 'synced': // backwards compatibility
        return {
          icon: CheckCircle2,
          label: 'Synced',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'failed':
        return {
          icon: AlertCircle,
          label: 'Failed',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'not_configured':
        return {
          icon: Settings2,
          label: 'Not Configured',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
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

  // Outlook Web deep link
  const outlookWebUrl = outlookEventId
    ? `https://outlook.office.com/calendar/item/${encodeURIComponent(outlookEventId)}`
    : null;

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={config.variant} className={cn('text-xs cursor-help', config.className)}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </TooltipTrigger>
            {(lastError || lastSyncedAt) && (
              <TooltipContent className="max-w-xs">
                {lastError && (
                  <p className="text-xs text-red-600 mb-1">{lastError}</p>
                )}
                {lastSyncedAt && (status === 'ok' || status === 'synced') && (
                  <p className="text-xs">
                    Synced: {new Date(lastSyncedAt).toLocaleString('en-GB', { 
                      timeZone: 'Europe/London',
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </p>
                )}
              </TooltipContent>
            )}
          </Tooltip>
          {(status === 'failed' || status === 'not_configured') && onRetry && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRetry}
              disabled={isRetrying}
              className="h-6 px-2"
              title="Retry sync"
            >
              <RefreshCw className={cn('h-3 w-3', isRetrying && 'animate-spin')} />
            </Button>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className={config.className}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        
        {lastSyncedAt && (status === 'ok' || status === 'synced') && (
          <span className="text-xs text-muted-foreground">
            Last synced: {new Date(lastSyncedAt).toLocaleString('en-GB', { 
              timeZone: 'Europe/London',
              dateStyle: 'short',
              timeStyle: 'short'
            })}
          </span>
        )}
      </div>

      {lastError && (status === 'failed' || status === 'not_configured') && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {lastError}
        </p>
      )}

      <div className="flex items-center gap-2">
        {(status === 'failed' || status === 'not_configured') && onRetry && (
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

        {outlookWebUrl && (status === 'ok' || status === 'synced') && (
          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <a href={outlookWebUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in Outlook
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
