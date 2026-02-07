"use client";

import React from "react";
import { ScannerCard } from "@/components/ui/scanner-card";

export default function VerificationScanSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Verified training—ready for audits
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg">
              Demonstrate completion and competency sign-off with clear evidence and exportable records.
            </p>
          </div>

          <div className="space-y-6">
            <ScannerCard className="bg-card border shadow-lg">
              <div className="p-6 space-y-4">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Compliance evidence
                </span>
                <h3 className="text-xl font-semibold text-card-foreground">
                  Epilepsy Awareness & Emergency Seizure Support
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Completion tracked per module
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Practical sign-off recorded by trainer
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Certificate downloadable anytime
                  </li>
                </ul>
              </div>
            </ScannerCard>

            <div className="rounded-xl bg-secondary/50 p-5">
              <p className="text-sm font-medium text-secondary-foreground mb-2">
                Use this section on the homepage to visually reinforce:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• CQC/Ofsted-aligned evidence support</li>
                <li>• Competency sign-off for practical training</li>
                <li>• Verified certificates & audit packs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
