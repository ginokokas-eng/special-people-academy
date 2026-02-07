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
    title: "Enteral Feeding Awareness (PEG/PEJ/NG)",
    slug: "enteral-feeding-awareness",
    category: "Complex Needs & Specialist Care",
    delivery: "In-person / Blended",
    duration: "3–4h",
    practicalSignOff: true,
    kb: {
      title: "Enteral feeding: safety checks & red flags",
      summary:
        "A safety-first outline of preparation, hygiene, observation, and escalation for enteral feeding support.",
      bullets: [
        "Preparation, hygiene, and equipment checks",
        "Observe tolerance and recognise red flags",
        "Escalate promptly and record accurately",
      ],
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