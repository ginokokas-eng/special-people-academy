# ariadne-api

Read/write API exposed by the special-people-academy to the Ariadne app.

Single endpoint, switched by `?resource=`. Authentication is a shared secret
sent in the `x-ariadne-secret` header, matching the `ARIADNE_SYNC_SECRET`
project secret (the same one used by `training-status`).

## Resources

### `GET ?resource=catalog[&since=ISO]`
Lists published courses (the academy curriculum).

Response:
```json
{ "data": [{
  "id": "uuid",
  "title": "...",
  "subtitle": "...",
  "description": "...",
  "category": "...",
  "level": "...",
  "thumbnail_url": "...",
  "duration_minutes": 60,
  "cpd_hours": 1.0,
  "is_mandatory": false,
  "is_internal": true,
  "is_published": true,
  "has_certificate": true,
  "pass_mark": 70,
  "language": "English",
  "delivery_type": "online",
  "updated_at": "...",
  "lesson_count": 12
}] }
```

### `POST ?resource=enroll`
Assigns a carer to a course. Idempotent.

Body:
```json
{
  "fountain_applicant_id": "string",
  "course_id": "uuid",
  "assigned_by": "string (optional)",
  "due_date": "ISO date (optional, not yet persisted)"
}
```

Response: `{ data: { enrollment, course, assigned_by, due_date } }`

Errors: `404` if the learner or course is not found, `409` if the course is unpublished.

### `POST ?resource=progress`
Per-carer enrollment + progress, with `progress_percent` derived from
`lesson_progress`.

Body:
```json
{
  "fountain_applicant_ids": ["..."],
  "emails": ["..."]
}
```
Either or both. Also accepts query params:
`GET ?resource=progress&fountain_applicant_ids=a,b&emails=x@y.com,z@w.com`.

Response:
```json
{ "learners": [{
  "user_id": "uuid",
  "email": "...",
  "full_name": "...",
  "fountain_applicant_id": "...",
  "external_id": "...",
  "enrollments_total": 3,
  "enrollments_completed": 1,
  "enrollments": [{
    "course_id": "uuid",
    "status": "not_started | in_progress | completed",
    "enrolled_at": "...",
    "completed_at": null,
    "progress_percent": 42,
    "lessons_completed": 5,
    "lessons_total": 12
  }],
  "certificates": [{
    "course_id": "uuid",
    "certificate_number": "...",
    "certificate_type": "completion | competency",
    "issued_at": "...",
    "has_pdf": true
  }],
  "last_activity_at": "..."
}] }
```

### `GET ?resource=certificate&course_id=UUID&(user_id=UUID|fountain_applicant_id=STR)`
Returns a 5-minute signed URL to the certificate PDF in the `certificates`
storage bucket.

Response:
```json
{ "data": {
  "certificate_number": "...",
  "certificate_type": "completion | competency",
  "issued_at": "...",
  "signed_url": "https://...",
  "expires_at": "..."
} }
```

Errors: `404` if the certificate row does not exist; `409` if the PDF has
not been generated yet (call `generate-certificate` first).

## Required Supabase secrets

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — provided automatically by Supabase.
- `ARIADNE_SYNC_SECRET` — shared with Ariadne for the `x-ariadne-secret` header.

## Notes

- User mapping uses `profiles.fountain_applicant_id` (academy) ↔ Ariadne `workers.external_id`.
- `training-status` (legacy) remains for back-compat; new integrations should use
  `ariadne-api?resource=progress`.
