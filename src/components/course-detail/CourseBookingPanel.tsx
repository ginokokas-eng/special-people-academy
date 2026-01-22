import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Users, 
  User, 
  Monitor, 
  GraduationCap,
  Award,
  Info,
  CheckCircle2,
  Loader2,
  Layers
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CourseOffering {
  id: string;
  offering_type: string;
  base_price_gbp: number;
  max_participants: number | null;
  active: boolean;
}

interface CourseBookingPanelProps {
  courseId: string;
  courseTitle: string;
}

const offeringTypeLabels: Record<string, string> = {
  individual_online: 'Individual Online',
  individual_blended: 'Individual Blended',
  individual_face_to_face: 'Individual Face-to-Face',
  group_face_to_face: 'Group Face-to-Face',
};

const offeringTypeIcons: Record<string, React.ReactNode> = {
  individual_online: <Monitor className="h-4 w-4 text-muted-foreground" />,
  individual_blended: <Layers className="h-4 w-4 text-muted-foreground" />,
  individual_face_to_face: <User className="h-4 w-4 text-muted-foreground" />,
  group_face_to_face: <Users className="h-4 w-4 text-muted-foreground" />,
};

const REGULATED_CERT_FEE = 15;

export function CourseBookingPanel({ courseId, courseTitle }: CourseBookingPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [participantsCount, setParticipantsCount] = useState(1);
  const [includeRegulatedCert, setIncludeRegulatedCert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch offerings on mount
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const { data, error } = await supabase
          .from('course_offerings')
          .select('*')
          .eq('course_id', courseId)
          .eq('active', true)
          .order('base_price_gbp', { ascending: true });

        if (error) throw error;
        
        setOfferings(data || []);
        if (data && data.length > 0) {
          setSelectedOfferingId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching offerings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOfferings();
  }, [courseId]);

  // Get selected offering
  const selectedOffering = useMemo(() => {
    return offerings.find(o => o.id === selectedOfferingId);
  }, [offerings, selectedOfferingId]);

  // Check if group offering
  const isGroupOffering = selectedOffering?.offering_type === 'group_face_to_face';
  const maxParticipants = selectedOffering?.max_participants || 12;

  // Reset participants when offering changes
  useEffect(() => {
    if (isGroupOffering) {
      setParticipantsCount(Math.min(Math.max(1, participantsCount), maxParticipants));
    } else {
      setParticipantsCount(1);
    }
  }, [selectedOfferingId, isGroupOffering, maxParticipants]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedOffering) {
      return { basePrice: 0, regulatedFee: 0, total: 0 };
    }

    const basePrice = selectedOffering.base_price_gbp;
    const regulatedFee = includeRegulatedCert ? participantsCount * REGULATED_CERT_FEE : 0;
    const total = basePrice + regulatedFee;

    return { basePrice, regulatedFee, total };
  }, [selectedOffering, participantsCount, includeRegulatedCert]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleParticipantsChange = (value: string) => {
    const num = parseInt(value) || 1;
    // Hard validation: 1-12 for groups
    const validated = Math.min(Math.max(1, num), maxParticipants);
    setParticipantsCount(validated);
  };

  const handleBookNow = async () => {
    if (!user) {
      toast.error('Please sign in to book');
      navigate('/auth');
      return;
    }

    if (!selectedOffering) {
      toast.error('Please select a training option');
      return;
    }

    setSubmitting(true);
    try {
      const bookingType = selectedOffering.offering_type.startsWith('individual') 
        ? 'individual' as const
        : 'group' as const;

      const { error } = await supabase
        .from('bookings')
        .insert([{
          user_id: user.id,
          course_id: courseId,
          offering_id: selectedOffering.id,
          booking_type: bookingType,
          participants_count: participantsCount,
          regulated_certification: includeRegulatedCert,
          regulated_fee_per_person_gbp: REGULATED_CERT_FEE,
          subtotal_gbp: pricing.basePrice,
          regulated_fee_total_gbp: pricing.regulatedFee,
          total_gbp: pricing.total,
          status: 'draft' as const,
        }]);

      if (error) throw error;

      toast.success('Booking request submitted! Our team will contact you shortly.');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (offerings.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Choose Training Option
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Offering Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Delivery Method</Label>
          <RadioGroup
            value={selectedOfferingId}
            onValueChange={setSelectedOfferingId}
            className="space-y-2"
          >
            {offerings.map((offering) => (
              <div 
                key={offering.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedOfferingId === offering.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={offering.id} id={offering.id} />
                  <Label htmlFor={offering.id} className="flex items-center gap-2 cursor-pointer">
                    {offeringTypeIcons[offering.offering_type]}
                    <span>{offeringTypeLabels[offering.offering_type] || offering.offering_type}</span>
                    {offering.offering_type === 'group_face_to_face' && (
                      <Badge variant="secondary" className="text-xs">
                        Max {offering.max_participants || 12}
                      </Badge>
                    )}
                  </Label>
                </div>
                <span className="font-semibold">{formatPrice(offering.base_price_gbp)}</span>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Participants Count - only for group */}
        {isGroupOffering && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="participants" className="text-sm font-medium">
                Number of Participants
              </Label>
              <span className="text-sm text-muted-foreground">
                Max {maxParticipants}
              </span>
            </div>
            <Input
              id="participants"
              type="number"
              min={1}
              max={maxParticipants}
              value={participantsCount}
              onChange={(e) => handleParticipantsChange(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Group price covers training for up to {maxParticipants} participants
            </p>
          </div>
        )}

        {/* Individual info */}
        {!isGroupOffering && selectedOffering && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Individual booking (1 participant)
            </p>
          </div>
        )}

        {/* Regulated Certification Toggle */}
        <div className="flex items-start justify-between p-4 bg-accent/10 rounded-lg border border-accent/20">
          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-accent mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="regulated-cert" className="font-medium cursor-pointer">
                  Regulated Certification
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Add an officially regulated certificate recognised by employers and regulatory bodies.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                +{formatPrice(REGULATED_CERT_FEE)} per person
                {isGroupOffering && participantsCount > 1 && (
                  <span className="text-primary ml-1">
                    ({participantsCount} × {formatPrice(REGULATED_CERT_FEE)} = {formatPrice(participantsCount * REGULATED_CERT_FEE)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <Switch
            id="regulated-cert"
            checked={includeRegulatedCert}
            onCheckedChange={setIncludeRegulatedCert}
          />
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base price</span>
            <span>{formatPrice(pricing.basePrice)}</span>
          </div>
          {includeRegulatedCert && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Regulated cert ({participantsCount} × {formatPrice(REGULATED_CERT_FEE)})
              </span>
              <span>{formatPrice(pricing.regulatedFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">{formatPrice(pricing.total)}</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleBookNow}
          disabled={submitting || !selectedOffering}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Book Now
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Our team will contact you to confirm availability and complete your booking.
        </p>
      </CardContent>
    </Card>
  );
}
