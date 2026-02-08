"use client";

import React, { useEffect, useState } from "react";
import {
  TrainingKnowledgeShredStream,
  TrainingShredItem,
  KnowledgeBaseInfo,
} from "@/components/ui/training-knowledge-shred-stream";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// KB content lookup by course slug - rich knowledge base entries
const kbContentBySlug: Record<string, KnowledgeBaseInfo> = {
  "paediatric-first-aid": {
    title: "Paediatric First Aid: key actions & documentation",
    summary:
      "A quick guide to immediate response steps, escalation, and what to record after an incident.",
    bullets: [
      "Assess danger, response, airway, breathing, circulation",
      "Choking: back blows + chest thrusts (age-appropriate)",
      "Record incident details and outcomes clearly",
    ],
  },
  "epilepsy-awareness-emergency-seizure-support": {
    title: "Seizure support: timing, positioning, escalation",
    summary:
      "Recognise seizure types, support safely, follow the care plan, and document accurately.",
    bullets: [
      "Time the seizure and follow the individual's plan",
      "Protect from injury; recovery position when safe",
      "Escalate when thresholds/red flags are met",
    ],
  },
  "anaphylaxis-awareness-adrenaline-auto-injector": {
    title: "Anaphylaxis: recognition and emergency steps",
    summary:
      "A practical checklist for recognising anaphylaxis and acting fast while following policy and care plans.",
    bullets: [
      "Recognise symptoms: airway/breathing/circulation changes",
      "Administer auto-injector per training & care plan",
      "Call emergency services; document actions taken",
    ],
  },
  "infection-prevention-control": {
    title: "IPC essentials: hand hygiene, PPE, cleaning",
    summary:
      "Core IPC standards for daily practice, including what to do and what to record.",
    bullets: [
      "When to use PPE and how to dispose safely",
      "Hand hygiene moments and technique",
      "Cleaning routines and escalation pathways",
    ],
  },
  "enteral-feeding-tubes-management-competency-guide": {
    title: "Enteral Feeding Tubes — Key Guidance (Quick Reference)",
    summary:
      "Essential safety, technique, and troubleshooting guidance for enteral feeding tube management including NG, NJ, PEG, PEG-J, and PEJ tubes.",
    bullets: [
      "Safety: Never use 'whoosh test' – only pH testing for verification",
      "Gastric tubes (NG/PEG): bolus or pump; Jejunal (NJ/PEJ/PEG-J): pump-only",
      "Universal flush: before and after feeds, between each medication",
      "Routine care: clean/dry site; rotate PEG; never rotate PEJ or PEG-J",
      "Blockage: stop, aspirate gently, escalate – never force-flush",
      "Red flags: aspiration symptoms, infection signs – escalate immediately",
    ],
    sections: [
      {
        heading: "1. Safety Non-Negotiables",
        content: "Never use the 'whoosh test' to confirm tube placement – it is unreliable and dangerous. Always use pH testing (pH ≤5.5 for gastric tubes) to verify position before feeding. If verification fails or position is uncertain, do not feed – escalate immediately to a healthcare professional. Always check tube length markers match the care plan."
      },
      {
        heading: "2. Tube Type → Feeding Method Rules",
        content: "Gastric tubes (NG, PEG): Can use bolus (gravity/syringe) OR pump feeding. Post-pyloric/jejunal tubes (NJ, PEJ, PEG-J): Pump-only – never bolus feed. The jejunum cannot tolerate bolus volumes; only continuous pump feeding is safe. Always check the care plan to confirm tube type and prescribed method."
      },
      {
        heading: "3. Universal Flush Rules",
        content: "Flush with water before every feed to check patency. Flush after every feed to clear residue. When giving medications: flush before, between each medication, and after the final medication. Minimum flush volume is typically 30ml (or as specified in care plan). Use cooled boiled water or sterile water as directed."
      },
      {
        heading: "4. Routine Care",
        content: "Keep the stoma site clean and dry at all times. PEG tubes: rotate 360° daily (unless contraindicated) and gently push in/out to prevent buried bumper syndrome. PEJ and PEG-J tubes: NEVER rotate – the jejunal portion is fixed and rotation can cause displacement or injury. Check external tube length daily and document."
      },
      {
        heading: "5. Troubleshooting: Blockage & Dislodgement",
        content: "Blockage: Stop feeding, try gentle aspiration with a syringe, attempt warm water flush with gentle pressure. Never use force. If unresolved, escalate to healthcare professional. Dislodgement: Stop all feeding immediately, cover the site with a clean dressing, and escalate urgently – the stoma can close within hours."
      },
      {
        heading: "6. Red Flags: When to Escalate Immediately",
        content: "Aspiration symptoms: coughing, choking, wet/gurgling voice, breathing difficulty during or after feeding, unexplained respiratory distress. Infection signs: redness, swelling, warmth, discharge (especially purulent), fever, increasing pain at stoma site. Other emergencies: tube migration (longer/shorter than usual), severe abdominal pain, vomiting, significant bleeding. Stop feeding and escalate immediately."
      }
    ]
  },
  // Also support the alternative slug
  "enteral-feeding-tubes-management-competency": {
    title: "Enteral Feeding Tubes — Key Guidance (Quick Reference)",
    summary:
      "Essential safety, technique, and troubleshooting guidance for enteral feeding tube management including NG, NJ, PEG, PEG-J, and PEJ tubes.",
    bullets: [
      "Safety: Never use 'whoosh test' – only pH testing for verification",
      "Gastric tubes (NG/PEG): bolus or pump; Jejunal (NJ/PEJ/PEG-J): pump-only",
      "Universal flush: before and after feeds, between each medication",
      "Routine care: clean/dry site; rotate PEG; never rotate PEJ or PEG-J",
      "Blockage: stop, aspirate gently, escalate – never force-flush",
      "Red flags: aspiration symptoms, infection signs – escalate immediately",
    ],
    sections: [
      {
        heading: "1. Safety Non-Negotiables",
        content: "Never use the 'whoosh test' to confirm tube placement – it is unreliable and dangerous. Always use pH testing (pH ≤5.5 for gastric tubes) to verify position before feeding. If verification fails or position is uncertain, do not feed – escalate immediately to a healthcare professional. Always check tube length markers match the care plan."
      },
      {
        heading: "2. Tube Type → Feeding Method Rules",
        content: "Gastric tubes (NG, PEG): Can use bolus (gravity/syringe) OR pump feeding. Post-pyloric/jejunal tubes (NJ, PEJ, PEG-J): Pump-only – never bolus feed. The jejunum cannot tolerate bolus volumes; only continuous pump feeding is safe. Always check the care plan to confirm tube type and prescribed method."
      },
      {
        heading: "3. Universal Flush Rules",
        content: "Flush with water before every feed to check patency. Flush after every feed to clear residue. When giving medications: flush before, between each medication, and after the final medication. Minimum flush volume is typically 30ml (or as specified in care plan). Use cooled boiled water or sterile water as directed."
      },
      {
        heading: "4. Routine Care",
        content: "Keep the stoma site clean and dry at all times. PEG tubes: rotate 360° daily (unless contraindicated) and gently push in/out to prevent buried bumper syndrome. PEJ and PEG-J tubes: NEVER rotate – the jejunal portion is fixed and rotation can cause displacement or injury. Check external tube length daily and document."
      },
      {
        heading: "5. Troubleshooting: Blockage & Dislodgement",
        content: "Blockage: Stop feeding, try gentle aspiration with a syringe, attempt warm water flush with gentle pressure. Never use force. If unresolved, escalate to healthcare professional. Dislodgement: Stop all feeding immediately, cover the site with a clean dressing, and escalate urgently – the stoma can close within hours."
      },
      {
        heading: "6. Red Flags: When to Escalate Immediately",
        content: "Aspiration symptoms: coughing, choking, wet/gurgling voice, breathing difficulty during or after feeding, unexplained respiratory distress. Infection signs: redness, swelling, warmth, discharge (especially purulent), fever, increasing pain at stoma site. Other emergencies: tube migration (longer/shorter than usual), severe abdominal pain, vomiting, significant bleeding. Stop feeding and escalate immediately."
      }
    ]
  },
  "positive-behaviour-support-safe-physical-intervention": {
    title: "PBS & Safe Physical Intervention: principles and practice",
    summary:
      "Understanding behaviour as communication, prevention strategies, and last-resort physical intervention.",
    bullets: [
      "Behaviour is communication – identify triggers and functions",
      "Proactive strategies: environment, routine, relationship-building",
      "Physical intervention: last resort, proportionate, documented",
    ],
  },
  "basic-life-support": {
    title: "Basic Life Support: recognition and response",
    summary:
      "Essential life-saving skills for recognising cardiac arrest and performing effective CPR.",
    bullets: [
      "Recognise signs of cardiac arrest: unresponsive, not breathing normally",
      "Call for help immediately and start chest compressions",
      "Use AED as soon as available; continue until help arrives",
    ],
  },
  "emergency-first-aid-at-work": {
    title: "Emergency First Aid at Work: workplace response",
    summary:
      "Key skills for managing workplace emergencies safely and effectively.",
    bullets: [
      "Assess the scene for hazards before providing aid",
      "Manage common workplace injuries: cuts, burns, falls",
      "Know when to call emergency services and what to report",
    ],
  },
  "medication-administration-competency": {
    title: "Medication Administration: safe practice essentials",
    summary:
      "Core principles for safe medication administration and accurate documentation.",
    bullets: [
      "The 6 Rs: Right person, drug, dose, route, time, documentation",
      "Check MAR and care plan before every administration",
      "Report and document any errors or refusals immediately",
    ],
  },
};

// Fallback KB for courses without specific content
const defaultKb: KnowledgeBaseInfo = {
  title: "Key guidance for this training",
  summary: "Essential knowledge and practical guidance for safe, effective practice.",
  bullets: [
    "Follow the individual's care plan at all times",
    "Escalate concerns promptly to appropriate professionals",
    "Document accurately and contemporaneously",
  ],
};

// Map delivery type to display label
const getDeliveryLabel = (deliveryType: string | null, availableTypes: string[] | null): string => {
  if (availableTypes?.includes('blended') || deliveryType === 'blended') {
    return 'In-person / Blended';
  }
  if (availableTypes?.includes('in_person_practical') || deliveryType === 'in_person_practical') {
    return 'In-person Practical';
  }
  if (deliveryType === 'online' || deliveryType === 'online_self_paced') {
    return 'Online (Self-paced)';
  }
  if (deliveryType === 'live_online') {
    return 'Live Online';
  }
  return 'Online';
};

// Format duration
const formatDuration = (minutes: number | null): string => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function TrainingShredKnowledgeSection() {
  const [trainings, setTrainings] = useState<TrainingShredItem[]>([]);
  const [active, setActive] = useState<TrainingShredItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedCourses() {
      try {
        const { data: courses, error } = await supabase
          .from('courses')
          .select('id, title, slug, category, delivery_type, available_delivery_types, duration_minutes, requires_practical_signoff, is_featured, is_published')
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('featured_rank', { ascending: true })
          .limit(6);

        if (error) {
          console.error('Error fetching courses:', error);
          return;
        }

        if (courses && courses.length > 0) {
          const mappedTrainings: TrainingShredItem[] = courses.map((course) => ({
            id: course.id,
            title: course.title,
            slug: course.slug || course.id,
            category: course.category,
            delivery: getDeliveryLabel(course.delivery_type, course.available_delivery_types),
            duration: formatDuration(course.duration_minutes),
            practicalSignOff: course.requires_practical_signoff || false,
            kb: kbContentBySlug[course.slug || ''] || defaultKb,
          }));

          setTrainings(mappedTrainings);
          setActive(mappedTrainings[0]);
        }
      } catch (err) {
        console.error('Error in fetchFeaturedCourses:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedCourses();
  }, []);

  if (loading) {
    return (
      <section className="py-16 px-6 bg-background">
        <div className="container mx-auto max-w-6xl flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (trainings.length === 0) {
    return null; // Don't show section if no featured courses
  }

  return (
    <section className="py-16 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Explore our training in action
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            As each training passes through the scanner, you'll see the key guidance
            and knowledge-base notes that support real practice.
          </p>
        </div>

        <div className="mb-10">
          <TrainingKnowledgeShredStream
            items={trainings}
            onActiveChange={setActive}
            showControls={false}
            speed={60}
          />
        </div>

        {/* Key guidance panel */}
        {active && (
          <div className="rounded-xl p-6 md:p-8 bg-card border border-border/50 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Key guidance
            </span>
            <h3 className="text-xl md:text-2xl font-bold mt-2 text-foreground">
              {active.kb.title}
            </h3>
            <p className="text-sm md:text-base mt-3 text-muted-foreground">
              {active.kb.summary}
            </p>

            <ul className="mt-4 space-y-2">
              {active.kb.bullets.slice(0, 5).map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <span className="text-primary">•</span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Button asChild>
                <Link to={`/courses/${active.slug || active.id}`}>View this course</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
