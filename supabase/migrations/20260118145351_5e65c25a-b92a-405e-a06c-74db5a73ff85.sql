-- Add trainer_id to practical_sessions to assign trainers
ALTER TABLE public.practical_sessions 
ADD COLUMN IF NOT EXISTS trainer_id uuid REFERENCES auth.users(id);

-- Create practical_attendance table for tracking learner outcomes
CREATE TABLE public.practical_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.practical_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended boolean DEFAULT NULL,
  competency_outcome text CHECK (competency_outcome IN ('pass', 'needs_practice') OR competency_outcome IS NULL),
  notes text,
  marked_by uuid REFERENCES auth.users(id),
  marked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id),
  CONSTRAINT notes_required_for_needs_practice CHECK (
    competency_outcome != 'needs_practice' OR notes IS NOT NULL
  )
);

-- Create learner_notifications table for automated messages
CREATE TABLE public.learner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_session_id uuid REFERENCES public.practical_sessions(id) ON DELETE SET NULL,
  related_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practical_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for practical_attendance
CREATE POLICY "Trainers can view attendance for their sessions"
ON public.practical_attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.practical_sessions ps
    WHERE ps.id = practical_attendance.session_id
    AND ps.trainer_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Trainers can insert attendance for their sessions"
ON public.practical_attendance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.practical_sessions ps
    WHERE ps.id = session_id
    AND ps.trainer_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Trainers can update attendance for their sessions"
ON public.practical_attendance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.practical_sessions ps
    WHERE ps.id = practical_attendance.session_id
    AND ps.trainer_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage all attendance"
ON public.practical_attendance FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Learners can view their own attendance"
ON public.practical_attendance FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for learner_notifications
CREATE POLICY "Users can view their own notifications"
ON public.learner_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.learner_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.learner_notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'trainer'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage all notifications"
ON public.learner_notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for performance
CREATE INDEX idx_practical_attendance_session ON public.practical_attendance(session_id);
CREATE INDEX idx_practical_attendance_user ON public.practical_attendance(user_id);
CREATE INDEX idx_learner_notifications_user ON public.learner_notifications(user_id);
CREATE INDEX idx_practical_sessions_trainer ON public.practical_sessions(trainer_id);