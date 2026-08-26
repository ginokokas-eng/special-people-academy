/**
 * The dashboard's headline achievement moment: an SVG ring that draws on once,
 * with the compliance percentage in the middle. r=54 → circumference 339.3.
 */
export const ComplianceRing = ({
  value,
  size = 150,
  label = 'Compliant',
}: {
  /** 0–100. */
  value: number;
  size?: number;
  label?: string;
}) => {
  const C = 339.3;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" width={size} height={size} className="-rotate-90">
        <circle cx="64" cy="64" r="54" fill="none" strokeWidth="8" stroke="hsl(var(--muted))" />
        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="hsl(var(--primary))"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - value / 100)}
          className="[transition:stroke-dashoffset_1.4s_cubic-bezier(0.32,0.72,0,1)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-[34px] font-bold leading-none tabular-nums text-foreground">
          {value}
          <span className="text-base text-muted-foreground">%</span>
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};
