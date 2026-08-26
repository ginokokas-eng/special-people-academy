import { Card, CardContent } from '@/components/ui/card';
import { ApertureIcon } from './ApertureIcon';

const TONES = {
  violet: 'text-[var(--sp-violet)]',
  green: 'text-[var(--sp-success)]',
  amber: 'text-[var(--sp-warning)]',
  teal: 'text-[var(--sp-teal-kicker)]',
} as const;

/** Dashboard metric. Replaces the inline stat card in src/pages/Dashboard.tsx. */
export const StatCard = ({
  label,
  value,
  icon,
  tone = 'violet',
}: {
  label: string;
  value: string;
  icon: string;
  tone?: keyof typeof TONES;
}) => (
  <Card className="transition-shadow hover:shadow-md">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-heading text-3xl font-bold tabular-nums">{value}</p>
        </div>
        <div className={`shrink-0 rounded-lg bg-muted p-3 ${TONES[tone]}`}>
          <ApertureIcon name={icon} size={24} />
        </div>
      </div>
    </CardContent>
  </Card>
);
