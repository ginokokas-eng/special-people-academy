import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MobileBottomCTAProps {
  isLoggedIn: boolean;
  isEnrolled: boolean;
  isInternal: boolean;
  progress: number;
  onStart: () => void;
  onEnroll: () => void;
  enrolling: boolean;
  // Access control props
  canAccessCourse: boolean;
  requiresSubscription: boolean;
  hasActiveSubscription: boolean;
}

export function MobileBottomCTA({
  isLoggedIn,
  isEnrolled,
  isInternal,
  progress,
  onStart,
  onEnroll,
  enrolling,
  canAccessCourse,
  requiresSubscription,
  hasActiveSubscription,
}: MobileBottomCTAProps) {
  const navigate = useNavigate();

  const getButtonContent = () => {
    if (!isLoggedIn) {
      return isInternal ? 'Sign in to access' : 'Sign in to subscribe';
    }
    
    // External course - needs subscription
    if (!isInternal && !hasActiveSubscription) {
      return 'Subscribe to access';
    }
    
    if (!isEnrolled) {
      return 'Start course';
    }
    return progress > 0 ? 'Continue learning' : 'Start course';
  };

  const handleClick = () => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }
    
    // External course without subscription
    if (!isInternal && !hasActiveSubscription) {
      navigate('/contact?reason=subscription');
      return;
    }
    
    if (!isEnrolled) {
      onEnroll();
    } else {
      onStart();
    }
  };

  const showSubscriptionCTA = !isInternal && !hasActiveSubscription && isLoggedIn;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 lg:hidden z-50 shadow-lg">
      <div className="container flex items-center gap-4">
        {isEnrolled && canAccessCourse && progress > 0 && (
          <div className="flex-1 max-w-[100px]">
            <Progress value={progress} className="h-2" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
        
        {showSubscriptionCTA && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>From £9.99/mo</span>
          </div>
        )}
        
        <Button 
          onClick={handleClick}
          disabled={enrolling}
          className={`flex-1 h-12 font-semibold ${
            showSubscriptionCTA ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90' : ''
          }`}
        >
          {showSubscriptionCTA && <CreditCard className="h-4 w-4 mr-2" />}
          {enrolling ? 'Processing...' : getButtonContent()}
        </Button>
      </div>
    </div>
  );
}
