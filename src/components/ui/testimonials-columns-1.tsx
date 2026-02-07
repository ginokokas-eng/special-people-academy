"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export function TestimonialsColumn(props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  const { testimonials, duration = 20, className } = props;

  return (
    <div className={cn("relative h-full overflow-hidden", className)}>
      <motion.div
        animate={{
          y: [0, "-50%"],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
        }}
        className="flex flex-col gap-6"
      >
        {/* Duplicate testimonials for seamless loop */}
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-6">
            {testimonials.map(({ text, image, name, role }, i) => (
              <div
                key={`${index}-${i}`}
                className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  "{text}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover border-2 border-primary/20"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
