ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id),
  ADD COLUMN IF NOT EXISTS verification_code text;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_verification_code_key
  ON public.certificates (verification_code)
  WHERE verification_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS certificates_organisation_id_idx
  ON public.certificates (organisation_id);

GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

-- Public verification: the code itself is the credential. Returns the minimum
-- needed to confirm a certificate and nothing else (no email, no ids).
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE(
  learner_name text,
  course_title text,
  certificate_number text,
  certificate_type text,
  issued_at timestamptz,
  expires_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.full_name, 'Learner') AS learner_name,
         c.title AS course_title,
         cert.certificate_number,
         COALESCE(cert.certificate_type, 'completion') AS certificate_type,
         cert.issued_at,
         cert.expires_at,
         CASE
           WHEN cert.expires_at IS NULL THEN 'valid'
           WHEN cert.expires_at <= now() THEN 'expired'
           WHEN cert.expires_at <= now() + interval '60 days' THEN 'expiring_soon'
           ELSE 'valid'
         END AS status
  FROM public.certificates cert
  JOIN public.courses c ON c.id = cert.course_id
  LEFT JOIN public.profiles p ON p.user_id = cert.user_id
  WHERE cert.verification_code IS NOT NULL
    AND upper(cert.verification_code) = upper(trim(_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- Org admin certificate listing (org admins must not read certificates rows raw)
CREATE OR REPLACE FUNCTION public.get_org_certificates(_org uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  course_id uuid,
  course_title text,
  certificate_number text,
  certificate_type text,
  verification_code text,
  issued_at timestamptz,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not permitted to view this organisation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT cert.id,
         cert.user_id,
         p.full_name,
         u.email::text,
         cert.course_id,
         c.title AS course_title,
         cert.certificate_number,
         COALESCE(cert.certificate_type, 'completion') AS certificate_type,
         cert.verification_code,
         cert.issued_at,
         cert.expires_at,
         CASE
           WHEN cert.expires_at IS NULL THEN 'valid'
           WHEN cert.expires_at <= now() THEN 'expired'
           WHEN cert.expires_at <= now() + interval '60 days' THEN 'expiring_soon'
           ELSE 'valid'
         END AS status
  FROM public.certificates cert
  JOIN public.courses c ON c.id = cert.course_id
  LEFT JOIN public.profiles p ON p.user_id = cert.user_id
  LEFT JOIN auth.users u ON u.id = cert.user_id
  WHERE cert.organisation_id = _org
     OR cert.user_id IN (
       SELECT m.user_id FROM public.organisation_members m
       WHERE m.organisation_id = _org AND m.ended_at IS NULL
     )
  ORDER BY cert.issued_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_certificates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_certificates(uuid) TO authenticated;