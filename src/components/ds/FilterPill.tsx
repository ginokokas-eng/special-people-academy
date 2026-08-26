/** Catalogue facet — selected inverts to the ink fill. Extracted from src/pages/Courses.tsx. */
export const FilterPill = ({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-violet-bright)] focus-visible:ring-offset-2 ${
      selected
        ? 'border-[var(--sp-ink)] bg-[var(--sp-ink)] text-white'
        : 'border-[var(--sp-line)] bg-white text-[var(--sp-ink)] hover:border-[var(--sp-line-hover)]'
    }`}
  >
    {label}
    {count != null && (
      <span className={`text-[11px] font-medium tabular-nums ${selected ? 'text-white/70' : 'text-[var(--sp-ink-soft)]'}`}>
        {count}
      </span>
    )}
  </button>
);
