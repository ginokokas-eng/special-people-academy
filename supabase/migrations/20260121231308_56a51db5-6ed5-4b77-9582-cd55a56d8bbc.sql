-- Add pricing tier columns to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS price_online numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_face_to_face numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_group numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_max_participants integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS regulated_cert_available boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS regulated_cert_fee numeric DEFAULT 15;

-- Add comments for documentation
COMMENT ON COLUMN public.courses.price_online IS 'Price for individual online access';
COMMENT ON COLUMN public.courses.price_face_to_face IS 'Price for individual face-to-face training';
COMMENT ON COLUMN public.courses.price_group IS 'Price for group booking (up to group_max_participants)';
COMMENT ON COLUMN public.courses.group_max_participants IS 'Maximum participants in a group booking';
COMMENT ON COLUMN public.courses.regulated_cert_available IS 'Whether regulated certification is available for this course';
COMMENT ON COLUMN public.courses.regulated_cert_fee IS 'Additional fee per person for regulated certification';