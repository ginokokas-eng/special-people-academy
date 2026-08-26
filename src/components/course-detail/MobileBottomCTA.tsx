import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, CreditCard } from '@/components/icons';
import { useNavigate } from 'react-router-dom';
import { useIsNative } from '@/lib/native';

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
  const native = useIsNative();

  const getButtonContent = () => {
    if (!isLoggedIn) {
      return isInternal ? 'Sign in to access' : 'Sign in to subscribe';
    }
    
    // External course - needs subscription. Digital-content purchases stay on
    // the web entirely (Play policy), so the app never sells or prices.
    if (!isInternal && !hasActiveSubscription) {
      return native ? 'Not in your plan yet' : 'Subscribe to access';
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
      if (native) return; // no purchase route in the app
      navigate('/contact?reason=subscription');
      return;
    }
    
    if (!isEnrolled) {
      onEnroll();
    } else {
      onStart();
    }
  };

  const showSubscriptionCTA = !isInternal && !hasActiveSubscription && isLoggedIn && !native;
  const showPlanNotice = !isInternal && !hasActiveSubscription && isLoggedIn && native;

  return (
    <div className={`fixed bottom-0 left-0 right-0 p-4 lg:hidden z-40 ${native ? 'native-above-tabbar material-chrome' : 'bg-background border-t shadow-lg'}`}>
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
        
        {showPlanNotice && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Ask your organisation for access</span>
          </div>
        )}

        <Button 
          onClick={handleClick}
          disabled={enrolling || showPlanNotice}
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
