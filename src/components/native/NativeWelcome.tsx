import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.svg';

/**
 * Pre-session native boot screen. Deliberately minimal — never the marketing
 * homepage. "Sign in" hands off to the existing /auth flow, which lands the
 * learner on /my-learning.
 *
 * This screen CANNOT start Ariadne SSO. That exchange is one-directional and
 * begins in the Ariadne carer app, which posts its own access token to
 * sso-from-ariadne and launches us by intent at /sso (see useNativeSsoHandoff).
 * Opened cold we hold no Ariadne token, so there is nothing to exchange.
 *
 * Ariadne is also only ONE audience. Courses are sold to other care
 * organisations whose staff have no Ariadne at all — they arrive through an
 * organisation invitation. Copy here must serve both, and must not present an
 * internal system name as the way in.
 */
export const NativeWelcome = () => {
  const navigate = useNavigate();

  return (
    <div className="native-shell learner-surface min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <img src={logo} alt="Special People Academy" className="h-16 w-16 object-contain mb-6" />
      <h1 className="font-heading text-[28px] leading-tight font-bold text-foreground mb-2">
        Special People Academy
      </h1>
      <p className="text-[15px] text-muted-foreground max-w-xs mb-8">
        Your training, your certificates, and your progress — all in one place.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <Button
          className="pressable h-[52px] w-full rounded-full text-[15px] font-semibold"
          onClick={() => navigate('/auth')}
        >
          Sign in
        </Button>
        <Button
          variant="outline"
          className="pressable h-[52px] w-full rounded-full text-[15px] font-semibold"
          onClick={() => navigate('/courses')}
        >
          Browse courses
        </Button>
        <p className="px-1 pt-1 text-[12px] leading-relaxed text-muted-foreground">
          Invited by your employer? Use the link in your invitation email. If your organisation
          uses the Ariadne carer app, open Training there and you arrive already signed in.
        </p>
      </div>
    </div>
  );
};
