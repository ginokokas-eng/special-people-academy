import { useCallback, useEffect, useRef, useState } from 'react';
import { speechLangTag } from '@/lib/translation';

/**
 * Read-aloud, using the browser's own speech synthesis.
 *
 * Nothing is sent anywhere: the text is spoken locally by the device. When the
 * browser has no speech support the hook reports `supported: false` and every
 * control is a no-op, so callers can hide the affordance entirely.
 *
 * British English voices are preferred, then any English voice, then the
 * browser default.
 */
export interface SpeechController {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  /** Speaks one passage, cancelling anything already being read. */
  speak: (text: string) => void;
  /** Speaks several passages in order (used by "read this lesson"). */
  speakQueue: (passages: string[]) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

function pickVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const wanted = tag.toLowerCase();
  const base = wanted.split('-')[0];
  return (
    voices.find((v) => v.lang?.toLowerCase().replace('_', '-') === wanted) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith(base)) ??
    voices.find((v) => v.lang?.toLowerCase() === 'en-gb') ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ??
    null
  );
}


export function useSpeech(): SpeechController {
  const supported = !!synth();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const load = () => {
      voiceRef.current = pickVoice(s.getVoices(), speechLangTag());
    };
    load();
    s.addEventListener?.('voiceschanged', load);
    return () => s.removeEventListener?.('voiceschanged', load);
  }, []);

  const stop = useCallback(() => {
    const s = synth();
    if (!s) return;
    s.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  // Never leave a voice talking after the learner navigates away.
  useEffect(() => stop, [stop]);

  const speakQueue = useCallback(
    (passages: string[]) => {
      const s = synth();
      if (!s) return;
      const usable = passages.map((p) => (p || '').trim()).filter(Boolean);
      if (!usable.length) return;
      s.cancel();
      setPaused(false);
      setSpeaking(true);
      // Re-picked at speak time so a language toggle takes effect immediately.
      const tag = speechLangTag();
      voiceRef.current = pickVoice(s.getVoices(), tag);
      usable.forEach((text, index) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceRef.current?.lang || tag;
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.rate = 1;
        if (index === usable.length - 1) {
          utterance.onend = () => {
            setSpeaking(false);
            setPaused(false);
          };
        }
        utterance.onerror = () => {
          setSpeaking(false);
          setPaused(false);
        };
        s.speak(utterance);
      });
    },
    []
  );

  const speak = useCallback((text: string) => speakQueue([text]), [speakQueue]);

  const pause = useCallback(() => {
    const s = synth();
    if (!s) return;
    s.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    const s = synth();
    if (!s) return;
    s.resume();
    setPaused(false);
  }, []);

  return { supported, speaking, paused, speak, speakQueue, pause, resume, stop };
}
