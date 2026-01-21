-- Create enum types for the new schema
DO $$ BEGIN
  CREATE TYPE booking_offering_type AS ENUM ('individual_online', 'individual_face_to_face', 'individual_blended', 'group_face_to_face');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_type AS ENUM ('individual', 'group');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('draft', 'pending_payment', 'confirmed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create course_offerings table
CREATE TABLE IF NOT EXISTS public.course_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  offering_type booking_offering_type NOT NULL,
  base_price_gbp integer NOT NULL,
  max_participants integer,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(course_id, offering_type)
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  offering_id uuid NOT NULL REFERENCES public.course_offerings(id) ON DELETE RESTRICT,
  booking_type booking_type NOT NULL,
  participants_count integer NOT NULL DEFAULT 1,
  regulated_certification boolean DEFAULT false,
  regulated_fee_per_person_gbp integer DEFAULT 15,
  subtotal_gbp integer NOT NULL,
  regulated_fee_total_gbp integer DEFAULT 0,
  total_gbp integer NOT NULL,
  status booking_status DEFAULT 'draft',
  contact_name text,
  contact_email text,
  contact_phone text,
  organization_name text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT positive_participants CHECK (participants_count > 0),
  CONSTRAINT group_max_participants CHECK (
    (booking_type = 'individual' AND participants_count = 1) OR
    (booking_type = 'group' AND participants_count <= 12)
  ),
  CONSTRAINT non_negative_amounts CHECK (
    subtotal_gbp >= 0 AND 
    regulated_fee_total_gbp >= 0 AND 
    total_gbp >= 0
  )
);

-- Create booking_participants table
CREATE TABLE IF NOT EXISTS public.booking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_offerings
CREATE POLICY "Anyone can view active offerings" ON public.course_offerings
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage offerings" ON public.course_offerings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own draft bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for booking_participants
CREATE POLICY "Users can view participants of own bookings" ON public.booking_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = booking_participants.booking_id 
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage participants of own draft bookings" ON public.booking_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = booking_participants.booking_id 
      AND bookings.user_id = auth.uid()
      AND bookings.status = 'draft'
    )
  );

CREATE POLICY "Admins can manage all participants" ON public.booking_participants
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_course_offerings_updated_at
  BEFORE UPDATE ON public.course_offerings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();