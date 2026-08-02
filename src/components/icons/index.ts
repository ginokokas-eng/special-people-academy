/**
 * Platform icon layer
 * -------------------
 * Single import surface for every icon in the app. It re-exports the full
 * lucide-react set, then overrides the names that have an Aperture glyph so the
 * platform picks up the Aperture visual language automatically.
 *
 * Colour always comes from `currentColor`, so existing semantic classes
 * (text-primary, text-destructive, text-muted-foreground, …) keep working.
 *
 * Usage: import { Home, Bell } from '@/components/icons';
 */
import type { LucideIcon } from 'lucide-react';
import {
  ApertureAccessibility,
  ApertureAccount,
  ApertureActivityRequest,
  ApertureAttachment,
  ApertureCareCircle,
  ApertureCareTeam,
  ApertureCreative,
  ApertureDocuments,
  ApertureDriver,
  ApertureEnergy,
  ApertureFoodDrink,
  ApertureFunding,
  ApertureGoals,
  ApertureHelpful,
  ApertureHome,
  ApertureHomeQuiet,
  ApertureLanguages,
  ApertureLock,
  ApertureMessages,
  ApertureMilestone,
  ApertureMobility,
  ApertureMood,
  ApertureMore,
  ApertureNotifications,
  ApertureNotificationSettings,
  ApertureOffice,
  ApertureOk,
  ApertureOnCall,
  ApertureOutdoors,
  AperturePhotoConsent,
  AperturePlan,
  AperturePrivacy,
  ApertureSafeguarding,
  ApertureSchedule,
  ApertureUrgentHelp,
} from './aperture';

export * from 'lucide-react';
export * from './aperture';

const as = (c: unknown) => c as unknown as LucideIcon;

/* Navigation & shell */
export const Home = as(ApertureHome);
export const House = as(ApertureHome);
export const LayoutDashboard = as(ApertureHomeQuiet);
export const MoreHorizontal = as(ApertureMore);
export const MoreVertical = as(ApertureMore);

/* Header */
export const Bell = as(ApertureNotifications);
export const BellRing = as(ApertureNotificationSettings);
export const AlertCircle = as(ApertureUrgentHelp);
export const HelpCircle = as(ApertureUrgentHelp);
export const LifeBuoy = as(ApertureUrgentHelp);

/* Schedule & sessions */
export const CalendarClock = as(ApertureSchedule);
export const CalendarRange = as(ApertureSchedule);
export const Calendar = as(ApertureActivityRequest);
export const CalendarDays = as(ApertureActivityRequest);
export const CalendarCheck = as(ApertureActivityRequest);

/* Content & records */
export const ClipboardList = as(AperturePlan);
export const ClipboardCheck = as(AperturePlan);
export const Clipboard = as(AperturePlan);
export const FileText = as(ApertureDocuments);
export const Files = as(ApertureDocuments);
export const FileCheck = as(ApertureDocuments);
export const Paperclip = as(ApertureAttachment);
export const Target = as(ApertureGoals);
export const Goal = as(ApertureGoals);

/* People */
export const Users = as(ApertureCareCircle);
export const Users2 = as(ApertureCareCircle);
export const UsersRound = as(ApertureCareCircle);
export const Heart = as(ApertureCareTeam);
export const HeartHandshake = as(ApertureCareTeam);

/* Messaging */
export const MessageSquare = as(ApertureMessages);
export const MessageCircle = as(ApertureMessages);
export const MessagesSquare = as(ApertureMessages);

/* Trust & safety */
export const Shield = as(ApertureSafeguarding);
export const ShieldCheck = as(ApertureSafeguarding);
export const Lock = as(ApertureLock);
export const LockKeyhole = as(ApertureLock);
export const EyeIconAperture = as(ApertureAccessibility);
export const Eye = as(ApertureAccessibility);
export const FileLock = as(AperturePrivacy);

/* Status */
export const CheckCircle = as(ApertureOk);
export const CheckCircle2 = as(ApertureOk);
export const BadgeCheck = as(ApertureOk);
export const ThumbsUp = as(ApertureHelpful);
export const Milestone = as(ApertureMilestone);

/* Wellbeing & activity */
export const Smile = as(ApertureMood);
export const Battery = as(ApertureEnergy);
export const BatteryCharging = as(ApertureEnergy);
export const Utensils = as(ApertureFoodDrink);
export const Coffee = as(ApertureFoodDrink);
export const CupSoda = as(ApertureFoodDrink);
export const Leaf = as(ApertureOutdoors);
export const Sprout = as(ApertureOutdoors);
export const Palette = as(ApertureCreative);
export const Camera = as(AperturePhotoConsent);
export const Accessibility = as(ApertureAccessibility);
export const PersonStanding = as(ApertureMobility);

/* Places & contact */
export const Building = as(ApertureOffice);
export const Building2 = as(ApertureOffice);
export const Moon = as(ApertureOnCall);
export const Car = as(ApertureDriver);
export const Globe = as(ApertureLanguages);
export const Languages = as(ApertureLanguages);
export const Smartphone = as(ApertureAccount);

/* Money */
export const PoundSterling = as(ApertureFunding);
export const Banknote = as(ApertureFunding);
export const Wallet = as(ApertureFunding);
