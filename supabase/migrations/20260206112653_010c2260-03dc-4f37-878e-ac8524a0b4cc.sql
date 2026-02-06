-- Drop old delivery_type constraint
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_delivery_type_check;

-- Add new constraint with standardized delivery types
ALTER TABLE public.courses ADD CONSTRAINT courses_delivery_type_check 
CHECK (delivery_type = ANY (ARRAY['online'::text, 'blended'::text, 'in-person'::text, 'online_self_paced'::text, 'live_online'::text, 'in_person_practical'::text]));