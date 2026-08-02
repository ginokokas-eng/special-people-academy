/**
 * Aperture icon library
 * ---------------------
 * Ariadne · My Care "Aperture" system: one sweeping arc, a minimal core and a
 * single live dot. Grid 24x24, 2px stroke, round caps and joins — never rescale
 * the stroke.
 *
 * All glyphs inherit `currentColor`, so platform semantic tokens
 * (text-primary, text-destructive, text-muted-foreground, …) drive the colour.
 */
import { cn } from '@/lib/utils';

export interface ApertureIconProps extends React.SVGProps<SVGSVGElement> {
  /** Rendered size in px (defaults to 24, matching lucide-react). */
  size?: number | string;
  strokeWidth?: number;
}

type GlyphProps = ApertureIconProps;

function Svg({ size = 24, strokeWidth = 2, className, children, ...rest }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** The live dot: filled, always inherits currentColor. */
function Dot({ cx, cy, r = 1.5 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
}

/* ------------------------------------------------------------------ */
/* 01 · Navigation                                                     */
/* ------------------------------------------------------------------ */

export const ApertureHome = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M3.6 12.4a8.4 8.4 0 0 1 16.8 0" />
    <path d="M7.4 12.6v7.2h9.2v-7.2" />
    <Dot cx={12} cy={16.4} />
  </Svg>
);

/** Home without its live dot — used for content/context rows. */
export const ApertureHomeQuiet = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M3.6 12.4a8.4 8.4 0 0 1 16.8 0" />
    <path d="M7.4 12.6v7.2h9.2v-7.2" />
  </Svg>
);

export const ApertureSchedule = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M6.6 4.4A8.6 8.6 0 0 0 6.6 19.6" />
    <path d="M11 7.4h8.4M11 12h6M11 16.6h8.4" />
    <Dot cx={20.2} cy={12} />
  </Svg>
);

export const ApertureFunding = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M17.6 5.4a8.6 8.6 0 1 0 1.2 12.4" />
    <path d="M14 9.2a2.5 2.5 0 0 0-4.4 1.7v2.4c0 1-.4 1.9-1 2.5h6.5" />
    <path d="M9.4 12.6h3.2" />
  </Svg>
);

export const ApertureCareTeam = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M12 19.4c-4.6-3.1-6.9-5.8-6.9-8.5A4 4 0 0 1 12 8.7a4 4 0 0 1 6.9 2.2c0 2.7-2.3 5.4-6.9 8.5z" />
    <path d="M2.6 8.2a10 10 0 0 1 4-4.6" />
    <Dot cx={19.6} cy={4.6} r={1.6} />
  </Svg>
);

export const ApertureMore = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M4.6 15.6a8.6 8.6 0 0 1 14.8 0" />
    <Dot cx={6.6} cy={10.6} r={1.4} />
    <Dot cx={12} cy={8.4} r={1.4} />
    <Dot cx={17.4} cy={10.6} r={1.4} />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* 02 · Header                                                         */
/* ------------------------------------------------------------------ */

export const ApertureNotifications = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M6.2 16.4a5.8 5.8 0 0 0 1.3-3.7v-2a4.5 4.5 0 0 1 9 0v2a5.8 5.8 0 0 0 1.3 3.7z" />
    <path d="M10.3 19.2a2 2 0 0 0 3.4 0" />
  </Svg>
);

/** Notifications with the live dot — quiet hours / unread settings. */
export const ApertureNotificationSettings = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M5.8 16.6a6.2 6.2 0 0 0 1.4-3.9v-2a4.8 4.8 0 0 1 9.6 0v2a6.2 6.2 0 0 0 1.4 3.9z" />
    <path d="M10.2 19.4a2 2 0 0 0 3.6 0" />
    <Dot cx={18.4} cy={5.6} r={1.7} />
  </Svg>
);

export const ApertureUrgentHelp = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M20.6 12a8.6 8.6 0 1 1-3.4-6.8" />
    <path d="M12 7.8v4.8" />
    <Dot cx={12} cy={16.6} r={1.3} />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* 03 · Sections & routes                                              */
/* ------------------------------------------------------------------ */

export const AperturePlan = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M5.2 8.4a6.8 6.8 0 0 1 13.6 0v9.4A2.8 2.8 0 0 1 16 20.6H8a2.8 2.8 0 0 1-2.8-2.8z" />
    <path d="M9 11.8h6M9 15.4h4" />
  </Svg>
);

export const ApertureGoals = (p: GlyphProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12.6} r={7} />
    <circle cx={12} cy={12.6} r={3} />
    <path d="m16.9 7.7 3.5-3.5" />
    <Dot cx={12} cy={12.6} r={1.2} />
  </Svg>
);

export const ApertureMessages = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M20.6 12a8.6 8.6 0 1 1-4.2-7.4" />
    <path d="m7.6 10.2 3.4 2.6a1.6 1.6 0 0 0 2 0l3-2.3" />
    <Dot cx={19.8} cy={5.2} r={1.7} />
  </Svg>
);

export const ApertureDocuments = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M18.6 8.6v9.6a2.6 2.6 0 0 1-2.6 2.6H8a2.6 2.6 0 0 1-2.6-2.6V5.8A2.6 2.6 0 0 1 8 3.2h5" />
    <path d="M13 3.2v5.4h5.6" />
    <path d="M9 13.6h6" />
    <Dot cx={9} cy={17} r={1.4} />
  </Svg>
);

export const ApertureAccessibility = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M3.4 11.6a9.6 9.6 0 0 1 17.2 0" />
    <circle cx={12} cy={12.2} r={3.2} />
    <path d="M6.6 18.2a8 8 0 0 0 10.8 0" />
  </Svg>
);

export const ApertureCareCircle = (p: GlyphProps) => (
  <Svg {...p}>
    <circle cx={12} cy={9.4} r={3} />
    <path d="M6.2 19.8a5.9 5.9 0 0 1 11.6 0" />
    <path d="M20.6 12a8.8 8.8 0 0 0-2.4-6.1" />
    <Dot cx={4.2} cy={8.6} r={1.6} />
  </Svg>
);

export const AperturePrivacy = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M12 3.2 5.2 6.1v5.2c0 4 2.8 7.5 6.8 9.3 4-1.8 6.8-5.3 6.8-9.3V6.1z" />
    <path d="M9.9 12.2v-1.4a2.1 2.1 0 0 1 4.2 0v1.4" />
    <rect x={9.1} y={12.2} width={5.8} height={4.4} rx={1.4} />
  </Svg>
);

export const ApertureAccount = (p: GlyphProps) => (
  <Svg {...p}>
    <rect x={7} y={2.9} width={10} height={18.2} rx={2.8} />
    <path d="M10.4 5.9h3.2" />
    <Dot cx={12} cy={17.6} r={1.4} />
  </Svg>
);

export const ApertureLock = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M8 10.6V8.4a4 4 0 0 1 8 0v2.2" />
    <rect x={5.2} y={10.6} width={13.6} height={9.8} rx={3} />
  </Svg>
);

export const ApertureMilestone = (p: GlyphProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={2.6} />
    <path d="M6.6 6.6a8 8 0 0 0 0 10.8M17.4 6.6a8 8 0 0 1 0 10.8" />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* 04 · Wellbeing & activity                                           */
/* ------------------------------------------------------------------ */

export const ApertureMood = (p: GlyphProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={8.6} />
    <path d="M8.4 14.2a4.6 4.6 0 0 0 7.2 0" />
    <Dot cx={9.2} cy={9.8} r={1.1} />
    <Dot cx={14.8} cy={9.8} r={1.1} />
  </Svg>
);

export const ApertureEnergy = (p: GlyphProps) => (
  <Svg {...p}>
    <rect x={2.8} y={7.4} width={16.4} height={9.2} rx={3} />
    <path d="M21.8 10.8v2.4" />
    <path d="M6.4 11.2v1.6" />
  </Svg>
);

export const ApertureFoodDrink = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M6.4 6.4h11.2l-1.2 12.2a2.4 2.4 0 0 1-2.4 2.2h-4a2.4 2.4 0 0 1-2.4-2.2z" />
    <path d="M6.8 10.6h10.4" />
    <path d="M10.6 6.4 12 2.6" />
  </Svg>
);

export const ApertureMobility = (p: GlyphProps) => (
  <Svg {...p}>
    <circle cx={12.6} cy={5.4} r={2.3} />
    <path d="M12.6 8.6v4.8l3.2 3M12.6 13.4l-3 3.6-1 3.4M15.8 16.4l1 4" />
    <path d="M4.4 19.6a8.4 8.4 0 0 1 2.2-5.6" />
  </Svg>
);

export const ApertureOutdoors = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M20.4 3.6C10.6 3.6 4.6 7.8 4.6 14.4a5.8 5.8 0 0 0 5.8 5.8c6.6 0 10-6.4 10-16.6z" />
    <path d="M4.6 20.4C7 15.6 10.8 11.8 15.6 9.4" />
  </Svg>
);

export const ApertureCreative = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M12 3.4a8.6 8.6 0 0 0 0 17.2c1.3 0 2-.8 2-1.8 0-1.3-1-1.7-1-2.8 0-.9.7-1.6 1.6-1.6h1.5a4.4 4.4 0 0 0 4.4-4.4c0-3.6-3.7-6.6-8.5-6.6z" />
    <Dot cx={8.4} cy={9.8} r={1.1} />
    <Dot cx={12} cy={7.6} r={1.1} />
  </Svg>
);

export const AperturePhotoConsent = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M4.6 8.4h3L9 6.2h6l1.4 2.2h3a2 2 0 0 1 2 2v6.8a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2v-6.8a2 2 0 0 1 2-2z" />
    <circle cx={12} cy={13.8} r={3.2} />
  </Svg>
);

export const ApertureActivityRequest = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M5 8.6A3.4 3.4 0 0 1 8.4 5.2h7.2A3.4 3.4 0 0 1 19 8.6v7.8a3.4 3.4 0 0 1-3.4 3.4H8.4A3.4 3.4 0 0 1 5 16.4z" />
    <path d="M5 9.8h14M8.8 3.4v3.4M15.2 3.4v3.4" />
    <Dot cx={12} cy={14.6} />
  </Svg>
);

export const ApertureDriver = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M4.2 16.2v-3.4l2-4.8a2.4 2.4 0 0 1 2.2-1.4h7.2a2.4 2.4 0 0 1 2.2 1.4l2 4.8v3.4" />
    <path d="M4.2 12.8h15.6" />
    <circle cx={7.6} cy={16.4} r={1.5} />
    <circle cx={16.4} cy={16.4} r={1.5} />
  </Svg>
);

export const ApertureLanguages = (p: GlyphProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={8.6} />
    <path d="M3.4 12h17.2" />
    <path d="M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2z" />
  </Svg>
);

export const ApertureAttachment = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M17.6 8.2 9.4 16.4a2.9 2.9 0 0 0 4.2 4.1l8.2-8.2a5 5 0 0 0-7-7.1L6 14a7.1 7.1 0 0 0 10 10" />
  </Svg>
);

export const ApertureOk = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M20.6 12a8.6 8.6 0 1 1-3.6-7" />
    <path d="m8.4 11.8 2.6 2.6 5.6-6" />
  </Svg>
);

export const ApertureHelpful = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M6.6 10.8v9.6" />
    <path d="M6.6 11.4 11 3.8a2.4 2.4 0 0 1 3.4 3l-1.4 3.4h4.7a2.4 2.4 0 0 1 2.3 3l-1.5 5.8a2.4 2.4 0 0 1-2.3 1.8H6.6" />
  </Svg>
);

/* ------------------------------------------------------------------ */
/* 05 · Support & safety                                               */
/* ------------------------------------------------------------------ */

export const ApertureOffice = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M5.4 20.6V5.6A2.4 2.4 0 0 1 7.8 3.2h5.8a2.4 2.4 0 0 1 2.4 2.4v15" />
    <path d="M16 9.6h2.2a2.4 2.4 0 0 1 2.4 2.4v8.6M3.4 20.6h17.2" />
    <path d="M8.8 7.6h3M8.8 11.4h3M8.8 15.2h3" />
  </Svg>
);

export const ApertureOnCall = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M19.4 14.4A8.4 8.4 0 0 1 9.6 4.6a8.4 8.4 0 1 0 9.8 9.8z" />
    <Dot cx={17.4} cy={5.8} />
  </Svg>
);

export const ApertureEmergency = (p: GlyphProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={8.6} />
    <path d="M12 7.8v8.4M7.8 12h8.4" />
  </Svg>
);

export const ApertureSafeguarding = (p: GlyphProps) => (
  <Svg {...p}>
    <path d="M12 3.2 5.2 6.1v5.2c0 4 2.8 7.5 6.8 9.3 4-1.8 6.8-5.3 6.8-9.3V6.1z" />
    <path d="m9.4 12 2 2 3.4-3.6" />
  </Svg>
);

export const apertureIcons = {
  home: ApertureHome,
  homeQuiet: ApertureHomeQuiet,
  schedule: ApertureSchedule,
  funding: ApertureFunding,
  careTeam: ApertureCareTeam,
  more: ApertureMore,
  notifications: ApertureNotifications,
  notificationSettings: ApertureNotificationSettings,
  urgentHelp: ApertureUrgentHelp,
  plan: AperturePlan,
  goals: ApertureGoals,
  messages: ApertureMessages,
  documents: ApertureDocuments,
  accessibility: ApertureAccessibility,
  careCircle: ApertureCareCircle,
  privacy: AperturePrivacy,
  account: ApertureAccount,
  lock: ApertureLock,
  milestone: ApertureMilestone,
  mood: ApertureMood,
  energy: ApertureEnergy,
  foodDrink: ApertureFoodDrink,
  mobility: ApertureMobility,
  outdoors: ApertureOutdoors,
  creative: ApertureCreative,
  photoConsent: AperturePhotoConsent,
  activityRequest: ApertureActivityRequest,
  driver: ApertureDriver,
  languages: ApertureLanguages,
  attachment: ApertureAttachment,
  ok: ApertureOk,
  helpful: ApertureHelpful,
  office: ApertureOffice,
  onCall: ApertureOnCall,
  emergency: ApertureEmergency,
  safeguarding: ApertureSafeguarding,
} as const;

export type ApertureIconName = keyof typeof apertureIcons;
