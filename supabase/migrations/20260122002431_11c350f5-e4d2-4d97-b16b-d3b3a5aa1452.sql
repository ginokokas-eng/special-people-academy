-- Create a trigger function to validate booking constraints
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS TRIGGER AS $$
DECLARE
  offering_type text;
  max_participants integer;
BEGIN
  -- Get the offering type and max participants
  SELECT co.offering_type, co.max_participants
  INTO offering_type, max_participants
  FROM course_offerings co
  WHERE co.id = NEW.offering_id;

  -- Validate participants_count based on offering type
  IF offering_type LIKE 'individual%' THEN
    IF NEW.participants_count != 1 THEN
      RAISE EXCEPTION 'Individual bookings are limited to 1 participant.';
    END IF;
  ELSIF offering_type = 'group_face_to_face' THEN
    IF NEW.participants_count < 1 OR NEW.participants_count > COALESCE(max_participants, 12) THEN
      RAISE EXCEPTION 'Group bookings are capped at % participants.', COALESCE(max_participants, 12);
    END IF;
  END IF;

  -- Enforce regulated fee calculation
  IF NEW.regulated_certification = true THEN
    NEW.regulated_fee_total_gbp := NEW.participants_count * COALESCE(NEW.regulated_fee_per_person_gbp, 15);
  ELSE
    NEW.regulated_fee_total_gbp := 0;
  END IF;

  -- Enforce total calculation
  NEW.total_gbp := COALESCE(NEW.subtotal_gbp, 0) + COALESCE(NEW.regulated_fee_total_gbp, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_booking_trigger ON public.bookings;
CREATE TRIGGER validate_booking_trigger
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking();