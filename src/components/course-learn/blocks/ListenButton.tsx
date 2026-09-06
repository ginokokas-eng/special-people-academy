import { Button } from '@/components/ui/button';
import { Pause, Play, Volume2, X } from '@/components/icons';
import { useSpeech } from '@/hooks/useSpeech';

interface ListenButtonProps {
  /** Passages read in order. Answers and feedback are excluded by the caller. */
  passages: string[];
  /** Wording on the button when nothing is being read. */
  label?: string;
  className?: string;
}

/**
 * Read-aloud affordance. Hidden entirely when the browser cannot speak, so no
 * one is offered a control that does nothing.
 */
export function ListenButton({ passages, label = 'Listen', className }: ListenButtonProps) {
  const speech = useSpeech();
  const usable = passages.map((p) => (p || '').trim()).filter(Boolean);
  if (!speech.supported || !usable.length) return null;

  if (!speech.speaking) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => speech.speakQueue(usable)}
      >
        <Volume2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    );
  }

  return (
    <span className={className}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => (speech.paused ? speech.resume() : speech.pause())}
      >
        {speech.paused ? (
          <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
        ) : (
          <Pause className="mr-1.5 h-4 w-4" aria-hidden="true" />
        )}
        {speech.paused ? 'Continue' : 'Pause'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={speech.stop} aria-label="Stop reading">
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </span>
  );
}
