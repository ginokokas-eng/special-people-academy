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
    title: "Enteral feeding: scope, safety, and competency essentials",
    summary:
      "A comprehensive guide covering tube types, daily safety checks, feed and medication support, troubleshooting, and documentation for enteral feeding.",
    bullets: [
      "Scope of practice: follow care plans, escalate concerns to healthcare professionals",
      "Tube types: PEG (stomach), PEJ (jejunum), NG (nasogastric)",
      "Daily safety checks: tube position, site observation, equipment readiness",
      "Feed support: positioning (30-45°), monitor tolerance and red flags",
      "Medicines via tube: policy-led, flush before/after, document on MAR",
      "Troubleshooting: blockages, leakage – stop and escalate immediately",
      "Red flags: vomiting, breathing difficulty, severe pain, tube migration",
      "Documentation: feed charts, handover notes, accurate records",
    ],
    sections: [
      {
        heading: "Overview & Scope of Practice",
        content: "Enteral feeding provides nutrition directly to the stomach or intestine when oral intake is unsafe or insufficient. Support workers assist individuals safely by following their care plan, maintaining hygiene, observing for concerns, and escalating appropriately to healthcare professionals."
      },
      {
        heading: "Tube Types (PEG/PEJ/NG)",
        content: "PEG (Percutaneous Endoscopic Gastrostomy) tubes are placed directly into the stomach through the abdominal wall. PEJ (Percutaneous Endoscopic Jejunostomy) tubes bypass the stomach and enter the jejunum. NG (Nasogastric) tubes are passed through the nose into the stomach."
      },
      {
        heading: "Daily Safety Checks & What to Report",
        content: "Before each feed: verify correct person, check care plan, confirm tube position marker hasn't changed, inspect the site for redness/swelling/discharge, ensure equipment is in date and clean. Report immediately: tube appears shorter/longer, site inflammation, equipment concerns."
      },
      {
        heading: "Supporting Feed Administration",
        content: "Position the person upright (30-45 degrees minimum). Check feed type, volume, and expiry. Prime giving set and connect securely. Monitor throughout for signs of discomfort, nausea, or breathing changes. Maintain upright position for 30-60 minutes post-feed."
      },
      {
        heading: "Supporting Medicines via Tube",
        content: "Only administer medications as prescribed and per organisational policy. Flush the tube with water before and after administration. Never crush tablets without explicit guidance from pharmacy. Document accurately on the MAR."
      },
      {
        heading: "Troubleshooting, Red Flags & Escalation",
        content: "Common issues include tube blockages, site leakage, and equipment concerns. Never attempt to force-flush a blocked tube or reposition a displaced tube. Red flags requiring immediate escalation: vomiting, severe pain, difficulty breathing, tube migration."
      },
      {
        heading: "Documentation & Handover Essentials",
        content: "Complete feed charts after every feed. Document site observations, equipment changes, and incidents. Handover must include: feeds given, next feed due, any concerns, tube position status, and outstanding actions."
      },
      {
        heading: "Competency Checklist Summary",
        content: "Practical sign-off covers 7 key areas: Pre-support checks, Hygiene and PPE, Equipment setup, Safe positioning, Flushing principles, Red flags and escalation, Documentation and handover."
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
