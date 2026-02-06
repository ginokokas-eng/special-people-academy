import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageShell } from '@/components/layout/PageShell';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Award,
  Monitor,
  User,
  Users,
  Layers,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

const REGULATED_CERT_FEE = 15;

const offeringTypeLabels: Record<string, string> = {
  individual_online: 'Online',
  individual_blended: 'Blended',
  individual_face_to_face: 'Face-to-Face',
  group_face_to_face: 'Group Face-to-Face',
};

const offeringTypeIcons: Record<string, React.ReactNode> = {
  individual_online: <Monitor className="h-4 w-4" />,
  individual_blended: <Layers className="h-4 w-4" />,
  individual_face_to_face: <User className="h-4 w-4" />,
  group_face_to_face: <Users className="h-4 w-4" />,
};

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, loading, removeFromCart, updateItem, getTotal, clearCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const { subtotal, regulatedFees, total } = getTotal();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/auth');
      return;
    }

    if (items.length === 0) {
      toast.error('Your basket is empty');
      return;
    }

    setCheckingOut(true);
    try {
      const cartData = items.map(item => ({
        course_id: item.course_id,
        offering_id: item.offering_id,
        course_title: item.course?.title || 'Course',
        offering_type: item.offering?.offering_type || 'individual_online',
        base_price: item.offering?.base_price_gbp || 0,
        participants_count: item.participants_count,
        regulated_certification: item.regulated_certification,
        regulated_fee: item.regulated_certification ? item.participants_count * REGULATED_CERT_FEE : 0,
      }));

      const { data, error } = await supabase.functions.invoke('create-cart-checkout', {
        body: { cart_items: cartData },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (!user) {
    return (
      <PageShell>
        <EmptyState
          icon={<ShoppingCart className="h-16 w-16" />}
          title="Your Basket"
          description="Please sign in to view your basket"
          action={{
            label: 'Sign In',
            onClick: () => navigate('/auth'),
          }}
        />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Your Basket
          </h1>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="h-16 w-16" />}
            title="Your basket is empty"
            description="Browse our courses and add some to your basket"
            action={{
              label: 'Browse Courses',
              onClick: () => navigate('/courses'),
            }}
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="bg-card border-border/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Course Thumbnail */}
                      <div className="w-full sm:w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.course?.thumbnail_url ? (
                          <img
                            src={item.course.thumbnail_url}
                            alt={item.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <GraduationCap className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Course Details */}
                      <div className="flex-grow min-w-0">
                        <Link 
                          to={`/courses/${item.course_id}`}
                          className="font-heading font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.course?.title || 'Course'}
                        </Link>

                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {item.offering && offeringTypeIcons[item.offering.offering_type]}
                          <span>
                            {item.offering
                              ? offeringTypeLabels[item.offering.offering_type]
                              : 'Training'}
                          </span>
                        </div>

                        {/* Regulated Cert Toggle */}
                        <div className="flex items-center gap-2 mt-4">
                          <Switch
                            id={`cert-${item.id}`}
                            checked={item.regulated_certification}
                            onCheckedChange={(checked) =>
                              updateItem(item.id, { regulated_certification: checked })
                            }
                          />
                          <Label htmlFor={`cert-${item.id}`} className="text-sm cursor-pointer flex items-center gap-1">
                            <Award className="h-3 w-3 text-accent-yellow" />
                            Regulated Certificate (+{formatPrice(REGULATED_CERT_FEE)})
                          </Label>
                        </div>
                      </div>

                      {/* Price & Actions */}
                      <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between">
                        <div>
                          <p className="font-bold text-xl text-foreground">
                            {formatPrice(
                              (item.offering?.base_price_gbp || 0) +
                                (item.regulated_certification
                                  ? item.participants_count * REGULATED_CERT_FEE
                                  : 0)
                            )}
                          </p>
                          {item.regulated_certification && (
                            <p className="text-xs text-muted-foreground">
                              incl. certificate fee
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="font-heading">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Courses ({items.length})
                      </span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {regulatedFees > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Regulated Certificates
                        </span>
                        <span>{formatPrice(regulatedFees)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={checkingOut || items.length === 0}
                  >
                    {checkingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure checkout powered by Stripe</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
