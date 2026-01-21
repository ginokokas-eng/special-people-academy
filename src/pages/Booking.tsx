import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Monitor,
  GraduationCap,
  Award,
  Info,
  CheckCircle2,
  AlertCircle,
  Layers,
  Loader2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CourseOption {
  id: string;
  title: string;
  description: string | null;
}

interface CourseOffering {
  id: string;
  course_id: string;
  offering_type: string;
  base_price_gbp: number;
  max_participants: number | null;
  active: boolean;
}

const offeringTypeLabels: Record<string, string> = {
  individual_online: 'Individual Online',
  individual_face_to_face: 'Individual Face-to-Face',
  individual_blended: 'Individual Blended',
  group_face_to_face: 'Group Face-to-Face',
};

const offeringTypeIcons: Record<string, React.ReactNode> = {
  individual_online: <Monitor className="h-4 w-4" />,
  individual_face_to_face: <GraduationCap className="h-4 w-4" />,
  individual_blended: <Layers className="h-4 w-4" />,
  group_face_to_face: <Users className="h-4 w-4" />,
};

const REGULATED_CERT_FEE = 15;

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [participants, setParticipants] = useState(1);
  const [includeRegulatedCert, setIncludeRegulatedCert] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch courses that have offerings
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['booking-courses-with-offerings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description')
        .eq('is_published', true)
        .in('title', [
          'Anaphylaxis Awareness & Adrenaline Auto-Injector (EpiPen) Response',
          'Epilepsy Awareness & Seizure Support', 
          'Paediatric First Aid (Special People Academy)'
        ])
        .order('title');
      
      if (error) throw error;
      return data as CourseOption[];
    },
  });

  // Fetch offerings for selected course
  const { data: offerings = [], isLoading: offeringsLoading } = useQuery({
    queryKey: ['course-offerings', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      
      const { data, error } = await supabase
        .from('course_offerings')
        .select('*')
        .eq('course_id', selectedCourseId)
        .eq('active', true)
        .order('offering_type');
      
      if (error) throw error;
      return data as CourseOffering[];
    },
    enabled: !!selectedCourseId,
  });

  // Get selected offering details
  const selectedOffering = useMemo(() => {
    return offerings.find(o => o.id === selectedOfferingId);
  }, [offerings, selectedOfferingId]);

  // Determine if this is a group offering
  const isGroupOffering = selectedOffering?.offering_type === 'group_face_to_face';
  const maxParticipants = selectedOffering?.max_participants || 12;

  // Reset offering when course changes
  useEffect(() => {
    setSelectedOfferingId('');
    setParticipants(1);
    setValidationError(null);
  }, [selectedCourseId]);

  // Reset participants when offering changes
  useEffect(() => {
    if (selectedOffering) {
      if (!isGroupOffering) {
        setParticipants(1);
      }
    }
    setValidationError(null);
  }, [selectedOfferingId, isGroupOffering]);

  // Validate participants
  useEffect(() => {
    if (!selectedOffering) {
      setValidationError(null);
      return;
    }

    if (isGroupOffering) {
      if (participants < 1) {
        setValidationError('Participants must be at least 1');
      } else if (participants > maxParticipants) {
        setValidationError(`Group bookings are limited to ${maxParticipants} participants maximum`);
      } else {
        setValidationError(null);
      }
    } else {
      if (participants !== 1) {
        setValidationError('Individual offerings are for 1 participant only');
        setParticipants(1);
      } else {
        setValidationError(null);
      }
    }
  }, [participants, selectedOffering, isGroupOffering, maxParticipants]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedOffering) {
      return { basePrice: 0, certFee: 0, total: 0 };
    }

    const basePrice = selectedOffering.base_price_gbp;
    const certFee = includeRegulatedCert ? REGULATED_CERT_FEE * participants : 0;
    const total = basePrice + certFee;

    return { basePrice, certFee, total };
  }, [selectedOffering, includeRegulatedCert, participants]);

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!selectedOffering || !selectedCourseId) {
        throw new Error('Please select a course and offering');
      }

      if (validationError) {
        throw new Error(validationError);
      }

      const bookingType: 'group' | 'individual' = isGroupOffering ? 'group' : 'individual';

      const bookingData = {
        user_id: user?.id || null,
        course_id: selectedCourseId,
        offering_id: selectedOfferingId,
        booking_type: bookingType,
        participants_count: participants,
        regulated_certification: includeRegulatedCert,
        regulated_fee_per_person_gbp: REGULATED_CERT_FEE,
        subtotal_gbp: pricing.basePrice,
        regulated_fee_total_gbp: pricing.certFee,
        total_gbp: pricing.total,
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Quote created successfully! Our team will be in touch shortly.');
      // Reset form
      setSelectedCourseId('');
      setSelectedOfferingId('');
      setParticipants(1);
      setIncludeRegulatedCert(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create booking');
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = () => {
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }
    if (!selectedOfferingId) {
      toast.error('Please select an offering');
      return;
    }
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    createBooking.mutate();
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Get a Quote / Book Training</h1>
            <p className="text-muted-foreground">
              Select your course and preferences to get an instant quote
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Left: Selection Form */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Course Selection
                </CardTitle>
                <CardDescription>
                  Choose your training course and delivery option
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Course Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Step 1</Badge>
                    Select Course
                  </Label>
                  <Select 
                    value={selectedCourseId} 
                    onValueChange={setSelectedCourseId}
                    disabled={coursesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={coursesLoading ? "Loading courses..." : "Choose a course..."} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCourse?.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedCourse.description}
                    </p>
                  )}
                </div>

                {/* Step 2: Offering Selection */}
                {selectedCourseId && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Step 2</Badge>
                      Select Offering
                    </Label>
                    {offeringsLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading offerings...
                      </div>
                    ) : offerings.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No offerings available for this course.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2">
                        {offerings.map((offering) => (
                          <button
                            key={offering.id}
                            type="button"
                            onClick={() => setSelectedOfferingId(offering.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                              selectedOfferingId === offering.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={selectedOfferingId === offering.id ? 'text-primary' : 'text-muted-foreground'}>
                                {offeringTypeIcons[offering.offering_type]}
                              </div>
                              <div className="text-left">
                                <p className="font-medium">{offeringTypeLabels[offering.offering_type]}</p>
                                {offering.max_participants && (
                                  <p className="text-xs text-muted-foreground">
                                    Up to {offering.max_participants} participants
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-semibold">{formatPrice(offering.base_price_gbp)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Participants */}
                {selectedOffering && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Step 3</Badge>
                      Number of Participants
                    </Label>
                    {isGroupOffering ? (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          min={1}
                          max={maxParticipants}
                          value={participants}
                          onChange={(e) => setParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Info className="h-4 w-4" />
                          Maximum {maxParticipants} participants for group bookings
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Individual offerings are for <strong>1 participant</strong> only.
                        </p>
                      </div>
                    )}
                    
                    {validationError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{validationError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Step 4: Regulated Certification Toggle */}
                {selectedOffering && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Step 4</Badge>
                      Optional Add-ons
                    </Label>
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
                                <TooltipContent className="max-w-xs bg-popover">
                                  <p>Add an officially regulated certificate recognised by employers and regulatory bodies.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            +{formatPrice(REGULATED_CERT_FEE)} per person
                            {participants > 1 && (
                              <span className="ml-1">
                                ({participants} × {formatPrice(REGULATED_CERT_FEE)} = {formatPrice(REGULATED_CERT_FEE * participants)})
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Price Summary */}
            <Card className="md:col-span-2 h-fit sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Step 5</Badge>
                  Price Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedOffering ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Select a course and offering to see pricing
                  </p>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Course</span>
                        <span className="font-medium text-right max-w-[150px] text-xs">
                          {selectedCourse?.title}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <Badge variant="secondary" className="text-xs">
                          {offeringTypeLabels[selectedOffering.offering_type]}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Participants</span>
                        <span>{participants}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base price</span>
                        <span>{formatPrice(pricing.basePrice)}</span>
                      </div>
                      
                      {includeRegulatedCert && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Regulated certification
                            {participants > 1 && ` (${participants} × ${formatPrice(REGULATED_CERT_FEE)})`}
                          </span>
                          <span>{formatPrice(pricing.certFee)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold text-xl">
                        <span>Total</span>
                        <span className="text-primary">{formatPrice(pricing.total)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-4" 
                      size="lg"
                      onClick={handleSubmit}
                      disabled={!!validationError || createBooking.isPending}
                    >
                      {createBooking.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Quote...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Get Quote
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Our team will contact you to confirm availability and complete your booking.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
