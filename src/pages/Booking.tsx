import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  User,
  Monitor,
  Building2,
  GraduationCap,
  Award,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

type DeliveryMethod = 'online' | 'face-to-face';
type CustomerType = 'individual' | 'organization';

interface CourseOption {
  id: string;
  title: string;
  price_online: number;
  price_face_to_face: number;
  price_group: number;
  group_max_participants: number;
  regulated_cert_available: boolean;
  regulated_cert_fee: number;
  delivery_type: string;
}

export default function Booking() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('online');
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [participants, setParticipants] = useState(1);
  const [includeRegulatedCert, setIncludeRegulatedCert] = useState(false);

  // Fetch courses with pricing
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['booking-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, price_online, price_face_to_face, price_group, group_max_participants, regulated_cert_available, regulated_cert_fee, delivery_type')
        .eq('is_published', true)
        .eq('is_internal', false)
        .order('title');
      
      if (error) throw error;
      return data as CourseOption[];
    },
  });

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  // Determine available delivery methods based on course
  const availableDeliveryMethods = useMemo(() => {
    if (!selectedCourse) return { online: true, faceToFace: true };
    
    const hasOnline = selectedCourse.price_online > 0;
    const hasFaceToFace = selectedCourse.price_face_to_face > 0 || selectedCourse.price_group > 0;
    
    return { online: hasOnline, faceToFace: hasFaceToFace };
  }, [selectedCourse]);

  // Reset delivery method if not available
  useEffect(() => {
    if (selectedCourse) {
      if (deliveryMethod === 'online' && !availableDeliveryMethods.online) {
        setDeliveryMethod('face-to-face');
      } else if (deliveryMethod === 'face-to-face' && !availableDeliveryMethods.faceToFace) {
        setDeliveryMethod('online');
      }
    }
  }, [selectedCourse, availableDeliveryMethods]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedCourse) {
      return { unitPrice: 0, subtotal: 0, certFee: 0, total: 0, participantCount: 0 };
    }

    let unitPrice = 0;
    let participantCount = 1;

    if (customerType === 'organization') {
      // Organization = flat group rate
      unitPrice = deliveryMethod === 'online' 
        ? selectedCourse.price_online * 12 // If online, multiply individual by max participants
        : selectedCourse.price_group;
      participantCount = selectedCourse.group_max_participants;
    } else {
      // Individual pricing
      unitPrice = deliveryMethod === 'online' 
        ? selectedCourse.price_online 
        : selectedCourse.price_face_to_face;
      participantCount = participants;
    }

    const subtotal = customerType === 'organization' 
      ? unitPrice 
      : unitPrice * participants;
    
    const certFee = includeRegulatedCert && selectedCourse.regulated_cert_available
      ? selectedCourse.regulated_cert_fee * participantCount
      : 0;

    return {
      unitPrice,
      subtotal,
      certFee,
      total: subtotal + certFee,
      participantCount,
    };
  }, [selectedCourse, deliveryMethod, customerType, participants, includeRegulatedCert]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmitBooking = () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }
    
    toast.success('Booking request submitted! Our team will contact you shortly.');
    // TODO: Integrate with backend booking system
  };

  const maxParticipants = selectedCourse?.group_max_participants || 12;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Book a Course</h1>
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
                  Choose your course and booking preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Course Selection */}
                <div className="space-y-2">
                  <Label htmlFor="course">Select Course</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Choose a course..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCourse && (
                  <>
                    {/* Customer Type */}
                    <div className="space-y-3">
                      <Label>Customer Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCustomerType('individual')}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                            customerType === 'individual'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <User className={`h-5 w-5 ${customerType === 'individual' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="text-left">
                            <p className="font-medium">Individual</p>
                            <p className="text-xs text-muted-foreground">Personal booking</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerType('organization')}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                            customerType === 'organization'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Building2 className={`h-5 w-5 ${customerType === 'organization' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="text-left">
                            <p className="font-medium">Organization</p>
                            <p className="text-xs text-muted-foreground">Group training</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Delivery Method */}
                    <div className="space-y-3">
                      <Label>Delivery Method</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {availableDeliveryMethods.online && (
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('online')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                              deliveryMethod === 'online'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Monitor className={`h-5 w-5 ${deliveryMethod === 'online' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div className="text-left">
                              <p className="font-medium">Online</p>
                              <p className="text-xs text-muted-foreground">Self-paced learning</p>
                            </div>
                          </button>
                        )}
                        {availableDeliveryMethods.faceToFace && (
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('face-to-face')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                              deliveryMethod === 'face-to-face'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Users className={`h-5 w-5 ${deliveryMethod === 'face-to-face' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div className="text-left">
                              <p className="font-medium">Face-to-Face</p>
                              <p className="text-xs text-muted-foreground">In-person training</p>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Participants (Individual only) */}
                    {customerType === 'individual' && (
                      <div className="space-y-2">
                        <Label htmlFor="participants">Number of Participants</Label>
                        <Input
                          id="participants"
                          type="number"
                          min={1}
                          max={maxParticipants}
                          value={participants}
                          onChange={(e) => setParticipants(Math.min(Math.max(1, parseInt(e.target.value) || 1), maxParticipants))}
                        />
                        <p className="text-xs text-muted-foreground">
                          For groups larger than {maxParticipants}, please select "Organization"
                        </p>
                      </div>
                    )}

                    {/* Organization Note */}
                    {customerType === 'organization' && (
                      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Group Booking</p>
                          <p className="text-sm text-muted-foreground">
                            This is a flat rate for up to <strong>{maxParticipants} participants</strong>. 
                            Perfect for team training sessions.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Regulated Certification Toggle */}
                    {selectedCourse.regulated_cert_available && (
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
                            <p className="text-xs text-muted-foreground">
                              +{formatPrice(selectedCourse.regulated_cert_fee)} per person
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Right: Price Summary */}
            <Card className="md:col-span-2 h-fit sticky top-24">
              <CardHeader>
                <CardTitle>Price Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCourse ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Select a course to see pricing
                  </p>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Course</span>
                        <span className="font-medium text-right max-w-[150px] truncate">
                          {selectedCourse.title}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <Badge variant="secondary" className="capitalize">
                          {deliveryMethod.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Customer</span>
                        <Badge variant="outline" className="capitalize">
                          {customerType}
                        </Badge>
                      </div>
                      {customerType === 'individual' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Participants</span>
                          <span>{participants}</span>
                        </div>
                      )}
                      {customerType === 'organization' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Max Participants</span>
                          <span>{maxParticipants}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      {customerType === 'individual' ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatPrice(pricing.unitPrice)} × {participants}
                          </span>
                          <span>{formatPrice(pricing.subtotal)}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Group rate</span>
                          <span>{formatPrice(pricing.subtotal)}</span>
                        </div>
                      )}
                      
                      {includeRegulatedCert && pricing.certFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Certification ({pricing.participantCount} × {formatPrice(selectedCourse.regulated_cert_fee)})
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
                      onClick={handleSubmitBooking}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Request Booking
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Our team will contact you to confirm availability
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
