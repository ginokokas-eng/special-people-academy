import { createContext, useContext, type ReactNode } from 'react';

/**
 * Language override for the staff preview frame.
 *
 * Learners store their chosen lesson language on their own device
 * (`storedLang()`); the preview frame instead picks a language from its query
 * string, and read-aloud inside the frame must follow that choice. Anything
 * outside a provider keeps today's behaviour.
 */
interface PreviewLanguageValue {
  /** Language code being previewed, or null for English. */
  lang: string | null;
  /** SpeechSynthesis voice tag for that language. */
  voice: string;
}

const PreviewLanguageContext = createContext<PreviewLanguageValue | null>(null);

export function PreviewLanguageProvider({
  value,
  children,
}: {
  value: PreviewLanguageValue;
  children: ReactNode;
}) {
  return <PreviewLanguageContext.Provider value={value}>{children}</PreviewLanguageContext.Provider>;
}

/** The previewed voice tag, or null when not inside a preview frame. */
export function usePreviewVoice(): string | null {
  return useContext(PreviewLanguageContext)?.voice ?? null;
}
