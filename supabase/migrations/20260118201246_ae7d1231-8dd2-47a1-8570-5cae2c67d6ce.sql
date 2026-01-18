-- Create private storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false);

-- Policy: Users can view their own certificates
CREATE POLICY "Users can view own certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: System (via service role) can upload certificates
CREATE POLICY "Service role can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificates');

-- Policy: Admins can view all certificates
CREATE POLICY "Admins can view all certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add pdf_url column to certificates table to track generated PDFs
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS pdf_path text;