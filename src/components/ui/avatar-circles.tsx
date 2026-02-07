"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AvatarCirclesProps {
  className?: string;
  numPeople?: number;
  avatarUrls: string[];
  href?: string;
}

const AvatarCircles = ({
  numPeople = 0,
  className,
  avatarUrls,
  href = "/contact",
}: AvatarCirclesProps) => {
  return (
    <div className={cn("z-10 flex -space-x-4 rtl:space-x-reverse", className)}>
      {avatarUrls.map((url, index) => (
        <img
          key={index}
          className="h-10 w-10 rounded-full border-2 border-background object-cover"
          src={url}
          width={40}
          height={40}
          alt={`Avatar ${index + 1}`}
        />
      ))}

      {numPeople > 0 && (
        <a
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-center text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          href={href}
        >
          +{numPeople}
        </a>
      )}
    </div>
  );
};

export { AvatarCircles };
