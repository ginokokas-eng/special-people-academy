-- Add a reading-content column for resource/reading lessons (additive, nullable)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content text;

-- Allow the new 'resource' lesson type
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_lesson_type_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_lesson_type_check
  CHECK (lesson_type = ANY (ARRAY['video'::text, 'pdf'::text, 'quiz'::text, 'practical'::text, 'text'::text, 'scenario'::text, 'scorm'::text, 'resource'::text]));

-- Convert the two "Info" items in the Enteral Feeding course into proper
-- Resource / Reading items: set the type, clear fake durations, and add the
-- on-page reading content (the short summary stays in description).
UPDATE public.lessons
SET lesson_type = 'resource',
    duration_minutes = NULL,
    content = $content$Enteral feeding is used when a person cannot safely meet their nutritional needs by mouth, but their gut still works. It delivers nutrition, fluids and medicines directly into the stomach or small bowel.

Common clinical indications include:

• Neurological conditions — stroke, advanced dementia, Parkinson's disease, motor neurone disease, brain injury or any condition causing unsafe swallowing (dysphagia) and a high risk of aspiration.
• Structural or mechanical problems — head and neck cancers, oesophageal obstruction, or surgery affecting the mouth, throat or upper digestive tract.
• Increased nutritional needs — severe illness, burns, or recovery where oral intake cannot keep pace with requirements.
• Failure to thrive — where someone is unable to maintain weight or hydration safely by mouth.

Enteral feeding is always a clinical decision made by the multidisciplinary team and recorded in the person's care plan. Your role is to support feeding safely, follow that plan, and escalate any concerns.

Remember: enteral feeding is only appropriate when the gut is working. If the gut is not functioning, intravenous (parenteral) nutrition may be required instead — that is a clinical decision, not a care decision.$content$
WHERE id = '80631a37-2bf1-4972-a697-0038007321f9';

UPDATE public.lessons
SET lesson_type = 'resource',
    duration_minutes = NULL,
    content = $content$This training is policy-led. It gives you the underpinning knowledge for safe enteral feeding, but it never replaces the individual's care plan, your local organisational policies, or the instructions of healthcare professionals.

Always follow the person-specific care plan:

• Each person has their own feeding regimen — tube type, feed type, volume, rate, flush volumes and timing. Never assume; always check the plan.
• Care plans are written by clinicians who know the individual. They take priority over general guidance, including this course.
• Tube type changes everything — what is safe for a gastric (PEG) tube may be unsafe for a jejunal (PEJ/PEG-J) tube. Confirm the route before every feed.

Follow local policy:
• Your employer's policies set out who may carry out feeding, how to document it, and when to escalate.
• Only carry out tasks you have been trained and assessed as competent to perform.

Stop and escalate whenever:
• The care plan is unclear, missing or out of date.
• The tube position, feed, equipment or the person's condition is not as expected.
• You notice any new symptoms, distress, or signs the feed is not being tolerated.

If in doubt, stop the feed and seek advice. It is always safer to ask than to assume.$content$
WHERE id = '99f13083-3b67-47e5-8c96-b00dee747877';