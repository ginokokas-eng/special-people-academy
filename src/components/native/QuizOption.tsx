import { haptics } from '@/hooks/useHaptics';

/**
 * One answer, one tap target — 68dp minimum, the whole row is the target.
 * Selection fires haptics.selection(); the result state is set by the parent
 * after "Check answer", which fires success or warning.
 */
export const QuizOption = ({
  letter,
  text,
  state = 'idle',
  disabled = false,
  onSelect,
}: {
  /** A, B, C, D */
  letter: string;
  text: string;
  state?: 'idle' | 'selected' | 'correct' | 'incorrect';
  /** Answer already checked — the row keeps its state but stops accepting taps. */
  disabled?: boolean;
  onSelect: () => void;
}) => {
  const ringColour =
    state === 'selected'
      ? 'hsl(268 55% 50%)'
      : state === 'correct'
        ? 'hsl(152 55% 40%)'
        : state === 'incorrect'
          ? 'hsl(0 72% 50%)'
          : null;

  const badge =
    state === 'idle'
      ? 'border-[1.5px] border-[var(--sp-line-hover)] text-[var(--sp-ink-soft)]'
      : state === 'correct'
        ? 'bg-[hsl(var(--success))] text-white'
        : state === 'incorrect'
          ? 'bg-[var(--sp-danger)] text-white'
          : 'bg-[var(--sp-violet)] text-white';

  return (
    <button
      type="button"
      onClick={() => { haptics.selection(); onSelect(); }}
      disabled={disabled}
      aria-pressed={state !== 'idle'}
      data-state={state}
      className="quiz-option pressable flex min-h-[68px] w-full items-center gap-3.5 rounded-2xl bg-card px-4 py-3.5 text-left disabled:cursor-default"
    >
      {/* The state ring is its own element rather than an outline or shadow on
          the button: the row's shadow slot is composed by Tailwind utilities and
          a ring set there was unreliable once the row is disabled. */}
      {ringColour && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl border-2"
          style={{ borderColor: ringColour }}
        />
      )}
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badge}`}>
        {letter}
      </span>
      <span className={`text-[15px] leading-snug text-foreground ${state === 'idle' ? '' : 'font-semibold'}`}>{text}</span>
    </button>
  );
};
