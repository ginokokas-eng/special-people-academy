-- Additive support for required-reading resources
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS footer_note text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS pdf_filename text;

-- Finalise the Clinical Indications resource
UPDATE public.lessons
SET title = 'Clinical Indications for Enteral Feeding',
    lesson_type = 'resource',
    is_required = true,
    duration_minutes = NULL,
    pdf_filename = 'enteral-feeding-clinical-indications.pdf',
    description = $sum$This resource explains why enteral feeding may be used, the types of situations where it may be required, and the role of care/support staff in following the agreed care plan.$sum$,
    footer_note = $foot$Training resource only. Always follow the person's care plan, local policy, and clinical guidance. Escalate if unsure.$foot$,
    content = $content$Purpose of this resource

Enteral feeding is used when a person cannot safely or adequately meet their nutritional needs by mouth, but their gastrointestinal tract is still functional. It allows nutrition, fluids, and sometimes medicines to be supported through an enteral feeding tube, according to a prescribed plan.

When enteral feeding may be considered

Enteral feeding may be used where there is:

• unsafe swallowing or high risk of aspiration
• inadequate oral intake
• neurological conditions affecting swallow or feeding ability
• structural conditions affecting eating or swallowing
• long-term nutritional support needs
• recovery from illness, surgery, or prolonged reduced intake
• complex disability or health needs requiring planned nutritional support

Common examples

A person may require enteral feeding support due to:

• dysphagia or unsafe swallow
• neurological conditions such as cerebral palsy, stroke, brain injury, or progressive neurological disorders
• severe reflux, gastroparesis, or aspiration risk where post-pyloric feeding is clinically indicated
• head, neck, or gastrointestinal conditions affecting safe oral intake
• complex care needs where nutrition and hydration must be managed through a care plan

Important care/support staff responsibilities

Care and support staff must:

• follow the person-specific care plan
• check the prescribed feed, route, method, and timing
• confirm the correct support instructions before assisting
• observe the person for discomfort, distress, coughing, vomiting, leakage, or signs of intolerance
• document support accurately
• escalate promptly if anything is unclear, unsafe, or different from the care plan

What staff must not do

Care/support staff must not:

• decide to start, stop, or change enteral feeding independently
• change feed type, rate, volume, route, or method without clinical instruction
• use a feeding tube if placement, equipment, or instructions are uncertain
• ignore signs of intolerance, aspiration, infection, or tube displacement

Key message

Enteral feeding is always person-specific. The tube type, feeding method, timing, volume, rate, flushes, and escalation plan must be followed exactly as stated in the care plan and local policy.$content$
WHERE id = '80631a37-2bf1-4972-a697-0038007321f9';