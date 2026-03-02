import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Circle, ExternalLink } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationsSheet = ({ open, onOpenChange }: NotificationsSheetProps) => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = async (notification: typeof notifications[0]) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[400px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="text-xs">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see updates about your courses and certificates here.
              </p>
            </div>
          ) : (
            <div className="space-y-1 mt-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left rounded-lg p-3 transition-colors ${
                    !n.read_at
                      ? 'bg-primary/5 hover:bg-primary/10'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="pt-1">
                      {!n.read_at ? (
                        <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                      ) : (
                        <Circle className="h-2.5 w-2.5 text-transparent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-tight ${!n.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </p>
                        {n.link && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
