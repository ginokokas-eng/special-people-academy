"use client";

import React from "react";
import {
  TrainingKnowledgeShredStream,
  TrainingShredItem,
} from "@/components/ui/training-knowledge-shred-stream";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const trainings: TrainingShredItem[] = [
  {
    id: "paediatric-first-aid",
    title: "Paediatric First Aid",
    slug: "paediatric-first-aid",
    category: "Clinical & Emergency Care",
    delivery: "In-person / Blended",
    duration: "6h",
    practicalSignOff: true,
    kb: {
      title: "Paediatric First Aid: key actions & documentation",
      summary:
        "A quick guide to immediate response steps, escalation, and what to record after an incident.",
      bullets: [
        "Assess danger, response, airway, breathing, circulation",
        "Choking: back blows + chest thrusts (age-appropriate)",
        "Record incident details and outcomes clearly",
      ],
    },
  },
  {
    id: "epilepsy-rescue-meds",
    title: "Epilepsy Awareness & Emergency Seizure Support",
    slug: "epilepsy-awareness-emergency-seizure-support",
    category: "Clinical & Emergency Care",
    delivery: "In-person / Blended",
    duration: "3h",
    practicalSignOff: true,
    kb: {
      title: "Seizure support: timing, positioning, escalation",
      summary:
        "Recognise seizure types, support safely, follow the care plan, and document accurately.",
      bullets: [
        "Time the seizure and follow the individual's plan",
        "Protect from injury; recovery position when safe",
        "Escalate when thresholds/red flags are met",
      ],
    },
  },
  {
    id: "anaphylaxis-epipen",
    title: "Anaphylaxis Awareness & Adrenaline Auto-Injector (EpiPen)",
    slug: "anaphylaxis-awareness-adrenaline-auto-injector",
    category: "Clinical & Emergency Care",
    delivery: "In-person / Blended",
    duration: "2–3h",
    practicalSignOff: true,
    kb: {
      title: "Anaphylaxis: recognition and emergency steps",
      summary:
        "A practical checklist for recognising anaphylaxis and acting fast while following policy and care plans.",
      bullets: [
        "Recognise symptoms: airway/breathing/circulation changes",
        "Administer auto-injector per training & care plan",
        "Call emergency services; document actions taken",
      ],
    },
  },
  {
    id: "ipc",
    title: "Infection Prevention & Control",
    slug: "infection-prevention-control",
    category: "Clinical & Emergency Care",
    delivery: "Online (Self-paced)",
    duration: "60–90m",
    practicalSignOff: false,
    kb: {
      title: "IPC essentials: hand hygiene, PPE, cleaning",
      summary:
        "Core IPC standards for daily practice, including what to do and what to record.",
      bullets: [
        "When to use PPE and how to dispose safely",
        "Hand hygiene moments and technique",
        "Cleaning routines and escalation pathways",
      ],
    },
  },
  {
    id: "enteral-feeding",
    title: "Enteral Feeding Tubes: Management and Competency Guide (PEG/PEJ/NG)",
    slug: "enteral-feeding-tubes-management-competency-guide",
    category: "Complex Needs & Specialist Care",
    delivery: "In-person / Blended",
    duration: "4h",
    practicalSignOff: true,
    kb: {
      title: "Enteral feeding: scope, safety, and competency essentials",
      summary:
        "A comprehensive guide covering tube types, daily safety checks, feed and medication support, troubleshooting, and documentation for enteral feeding.",
      bullets: [
        "Scope of practice: support workers follow care plans and escalate concerns to healthcare professionals",
        "Tube types: PEG (stomach), PEJ (jejunum), and NG (nasogastric) – each with specific considerations",
        "Daily safety checks: tube position markers, site observation, equipment readiness, and expiry dates",
        "Feed support: correct positioning (30-45°), bolus vs continuous methods, monitor tolerance and red flags",
        "Medicines via tube: policy-led only, flush before/after, never crush without guidance, document on MAR",
        "Troubleshooting: blockages, leakage, tube displacement – stop and escalate, never attempt to reposition",
        "Red flags requiring immediate escalation: vomiting, breathing difficulty, severe pain, tube migration",
        "Documentation: feed charts, handover notes, incident records – accurate and contemporaneous",
      ],
      sections: [
        {
          heading: "Overview & Scope of Practice",
          content: "Enteral feeding provides nutrition directly to the stomach or intestine when oral intake is unsafe or insufficient. Support workers assist individuals safely by following their care plan, maintaining hygiene, observing for concerns, and escalating appropriately to healthcare professionals."
        },
        {
          heading: "Tube Types (PEG/PEJ/NG)",
          content: "PEG (Percutaneous Endoscopic Gastrostomy) tubes are placed directly into the stomach through the abdominal wall. PEJ (Percutaneous Endoscopic Jejunostomy) tubes bypass the stomach and enter the jejunum. NG (Nasogastric) tubes are passed through the nose into the stomach. Each type has specific care requirements outlined in individual care plans."
        },
        {
          heading: "Daily Safety Checks & What to Report",
          content: "Before each feed: verify correct person, check care plan, confirm tube position marker hasn't changed, inspect the site for redness/swelling/discharge, ensure equipment is in date and clean. Report immediately: tube appears shorter/longer, site inflammation, equipment concerns, or anything unusual."
        },
        {
          heading: "Supporting Feed Administration",
          content: "Position the person upright (30-45 degrees minimum). Check feed type, volume, and expiry. Prime giving set and connect securely. Monitor throughout for signs of discomfort, nausea, or breathing changes. Maintain upright position for 30-60 minutes post-feed as per care plan. Follow specific rates and volumes prescribed."
        },
        {
          heading: "Supporting Medicines via Tube",
          content: "Only administer medications as prescribed and per organisational policy. Flush the tube with water before and after administration. Never crush tablets without explicit guidance from pharmacy. Give medications separately unless advised otherwise. Document accurately on the MAR. Escalate any concerns or refusals immediately."
        },
        {
          heading: "Troubleshooting, Red Flags & Escalation",
          content: "Common issues include tube blockages (from inadequate flushing), site leakage, and equipment concerns. Never attempt to force-flush a blocked tube or reposition a displaced tube. Red flags requiring immediate escalation: vomiting, severe abdominal pain, difficulty breathing, significant tube migration, suspected aspiration, or site infection signs."
        },
        {
          heading: "Documentation & Handover Essentials",
          content: "Complete feed charts after every feed: time, volume, any concerns. Document site observations, equipment changes, and incidents. Handover must include: feeds given, next feed due, any concerns observed, tube position status, and outstanding actions. Accurate contemporaneous records are essential for continuity and safety."
        },
        {
          heading: "Competency Checklist Summary",
          content: "Practical sign-off covers 7 key areas: (1) Pre-support checks – identity, care plan, equipment; (2) Hygiene and PPE; (3) Equipment setup and safe handling; (4) Safe positioning and monitoring; (5) Flushing and maintenance principles; (6) Identifying red flags and escalation routes; (7) Documentation and handover. All criteria must be demonstrated to an authorised trainer."
        }
      ]
    },
  },
];

export default function TrainingShredKnowledgeSection() {
  const [active, setActive] = React.useState<TrainingShredItem>(trainings[0]);

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

        {/* Key guidance panel - lighter styling */}
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
            {active.kb.bullets.map((b, i) => (
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
      </div>
    </section>
  );
}