import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Bell } from 'lucide-react';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationsSheet = ({ open, onOpenChange }: NotificationsSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Your latest updates and alerts.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center h-[calc(100%-6rem)] text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            You'll see updates about your courses and certificates here.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
