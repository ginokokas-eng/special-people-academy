import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface MobileBottomCTAProps {
  isLoggedIn: boolean;
  isEnrolled: boolean;
  isInternal: boolean;
  progress: number;
  onStart: () => void;
  onEnroll: () => void;
  enrolling: boolean;
}

export function MobileBottomCTA({
  isLoggedIn,
  isEnrolled,
  isInternal,
  progress,
  onStart,
  onEnroll,
  enrolling,
}: MobileBottomCTAProps) {
  const getButtonContent = () => {
    if (!isLoggedIn) {
      return isInternal ? 'Sign in to access' : 'Subscribe to access';
    }
    if (!isEnrolled) {
      return 'Start course';
    }
    return progress > 0 ? 'Continue learning' : 'Start course';
  };

  const handleClick = () => {
    if (!isLoggedIn || !isEnrolled) {
      onEnroll();
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 lg:hidden z-50 shadow-lg">
      <div className="container flex items-center gap-4">
        {isEnrolled && progress > 0 && (
          <div className="flex-1 max-w-[100px]">
            <Progress value={progress} className="h-2" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
        <Button 
          onClick={handleClick}
          disabled={enrolling}
          className="flex-1 h-12 font-semibold"
        >
          {enrolling ? 'Processing...' : getButtonContent()}
        </Button>
      </div>
    </div>
  );
}