
-- Create a general-purpose notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- System/admins/trainers can insert notifications for any user
CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'trainer'::app_role)
  OR auth.uid() = user_id
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Seed notification settings into platform_settings
INSERT INTO public.platform_settings (section, settings)
VALUES ('notifications', '{
  "enableInAppNotifications": true,
  "enableEmailNotifications": true,
  "fromName": "Special People Academy",
  "fromEmail": "training@specialpeople.org.uk",
  "replyToEmail": "training@specialpeople.org.uk",
  "notifyLearnerCourseAssigned": true,
  "notifyLearnerCourseCompleted": true,
  "notifyLearnerCertificateIssued": true,
  "notifyLearnerCertificateExpiring": true,
  "notifyAdminNewPurchase": true,
  "notifyTrainerPracticalSignoffRequired": true,
  "notifyAdminComplianceExpired": true,
  "certificateExpiryReminderDays": [30, 14, 7],
  "practicalSignoffReminderDays": [7, 1]
}'::jsonb)
ON CONFLICT DO NOTHING;
