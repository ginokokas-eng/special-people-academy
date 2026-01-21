import { useState, useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CoursePricingProps {
  priceOnline: number;
  priceFaceToFace: number;
  priceGroup: number;
  groupMaxParticipants: number;
  regulatedCertAvailable: boolean;
  regulatedCertFee: number;
  deliveryType: string;
  onBookingRequest?: (booking: BookingDetails) => void;
}

export interface BookingDetails {
  bookingType: 'online' | 'face-to-face' | 'group';
  participants: number;
  includeRegulatedCert: boolean;
  basePrice: number;
  certFee: number;
  totalPrice: number;
}

export function CoursePricing({
  priceOnline,
  priceFaceToFace,
  priceGroup,
  groupMaxParticipants,
  regulatedCertAvailable,
  regulatedCertFee,
  deliveryType,
  onBookingRequest,
}: CoursePricingProps) {
  const [bookingType, setBookingType] = useState<'online' | 'face-to-face' | 'group'>('online');
  const [groupSize, setGroupSize] = useState(6);
  const [includeRegulatedCert, setIncludeRegulatedCert] = useState(false);

  // Determine which options are available based on delivery type
  const availableOptions = useMemo(() => {
    switch (deliveryType) {
      case 'online':
        return { online: true, faceToFace: false, group: false };
      case 'practical':
      case 'classroom':
        return { online: false, faceToFace: true, group: true };
      case 'blended':
      default:
        return { online: true, faceToFace: true, group: true };
    }
  }, [deliveryType]);

  // Calculate pricing
  const pricing = useMemo(() => {
    let basePrice = 0;
    let participants = 1;

    switch (bookingType) {
      case 'online':
        basePrice = priceOnline;
        participants = 1;
        break;
      case 'face-to-face':
        basePrice = priceFaceToFace;
        participants = 1;
        break;
      case 'group':
        basePrice = priceGroup;
        participants = groupSize;
        break;
    }

    const certFee = includeRegulatedCert ? regulatedCertFee * participants : 0;
    const totalPrice = basePrice + certFee;

    return {
      bookingType,
      participants,
      includeRegulatedCert,
      basePrice,
      certFee,
      totalPrice,
    };
  }, [bookingType, groupSize, includeRegulatedCert, priceOnline, priceFaceToFace, priceGroup, regulatedCertFee]);

  const handleBookingRequest = () => {
    if (onBookingRequest) {
      onBookingRequest(pricing);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // If no pricing is set, don't render
  if (priceOnline === 0 && priceFaceToFace === 0 && priceGroup === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Book This Course
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Booking Type</Label>
          <RadioGroup
            value={bookingType}
            onValueChange={(v) => setBookingType(v as typeof bookingType)}
            className="space-y-2"
          >
            {availableOptions.online && priceOnline > 0 && (
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                bookingType === 'online' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span>Individual Online</span>
                  </Label>
                </div>
                <span className="font-semibold">{formatPrice(priceOnline)}</span>
              </div>
            )}

            {availableOptions.faceToFace && priceFaceToFace > 0 && (
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                bookingType === 'face-to-face' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="face-to-face" id="face-to-face" />
                  <Label htmlFor="face-to-face" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Individual Face-to-Face</span>
                  </Label>
                </div>
                <span className="font-semibold">{formatPrice(priceFaceToFace)}</span>
              </div>
            )}

            {availableOptions.group && priceGroup > 0 && (
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                bookingType === 'group' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="group" id="group" />
                  <Label htmlFor="group" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Group Booking</span>
                    <Badge variant="secondary" className="text-xs">
                      Up to {groupMaxParticipants}
                    </Badge>
                  </Label>
                </div>
                <span className="font-semibold">{formatPrice(priceGroup)}</span>
              </div>
            )}
          </RadioGroup>
        </div>

        {/* Group Size Selector */}
        {bookingType === 'group' && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="group-size" className="text-sm">Number of Participants</Label>
              <span className="text-sm text-muted-foreground">
                Max {groupMaxParticipants}
              </span>
            </div>
            <Input
              id="group-size"
              type="number"
              min={2}
              max={groupMaxParticipants}
              value={groupSize}
              onChange={(e) => setGroupSize(Math.min(Math.max(2, parseInt(e.target.value) || 2), groupMaxParticipants))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Group price includes training for up to {groupMaxParticipants} participants
            </p>
          </div>
        )}

        {/* Regulated Certification Toggle */}
        {regulatedCertAvailable && (
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
                  +{formatPrice(regulatedCertFee)} per person
                </p>
              </div>
            </div>
            <Switch
              id="regulated-cert"
              checked={includeRegulatedCert}
              onCheckedChange={setIncludeRegulatedCert}
            />
          </div>
        )}

        {/* Price Summary */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base price</span>
            <span>{formatPrice(pricing.basePrice)}</span>
          </div>
          {includeRegulatedCert && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Regulated cert ({pricing.participants} × {formatPrice(regulatedCertFee)})
              </span>
              <span>{formatPrice(pricing.certFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">{formatPrice(pricing.totalPrice)}</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleBookingRequest}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Request Booking
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Our team will contact you to confirm availability and complete your booking.
        </p>
      </CardContent>
    </Card>
  );
}
