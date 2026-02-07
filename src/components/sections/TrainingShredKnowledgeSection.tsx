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
      ctaLabel: "Open Help Center article",
      ctaHref: "/help-center",
    },
  },
  {
    id: "epilepsy-rescue-meds",
    title: "Epilepsy Awareness & Emergency Seizure Support",
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
      ctaLabel: "Open Help Center article",
      ctaHref: "/help-center",
    },
  },
  {
    id: "anaphylaxis-epipen",
    title: "Anaphylaxis Awareness & Adrenaline Auto-Injector (EpiPen)",
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
      ctaLabel: "Open Help Center article",
      ctaHref: "/help-center",
    },
  },
  {
    id: "ipc",
    title: "Infection Prevention & Control",
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
      ctaLabel: "Open Help Center article",
      ctaHref: "/help-center",
    },
  },
  {
    id: "enteral-feeding",
    title: "Enteral Feeding Awareness (PEG/PEJ/NG)",
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
      ctaLabel: "Open Help Center article",
      ctaHref: "/help-center",
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
            Training that turns into practical guidance
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            As each course is "verified," the platform reveals the knowledge-base
            guidance teams use day-to-day.
          </p>
        </div>

        <div className="mb-10">
          <TrainingKnowledgeShredStream
            items={trainings}
            onActiveChange={setActive}
            showControls={false}
            speed={100}
          />
        </div>

        {/* Knowledge panel (readable, accessible) */}
        <div className="rounded-xl p-6 md:p-8 bg-primary text-primary-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Knowledge base
          </span>
          <h3 className="text-xl md:text-2xl font-bold mt-2">
            {active.kb.title}
          </h3>
          <p className="text-sm md:text-base mt-3 opacity-90">
            {active.kb.summary}
          </p>

          <ul className="mt-4 space-y-2">
            {active.kb.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm opacity-90"
              >
                <span className="text-accent">•</span>
                {b}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/courses">View courses</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to={active.kb.ctaHref ?? "/help-center"}>
                {active.kb.ctaLabel ?? "Open Help Center"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}