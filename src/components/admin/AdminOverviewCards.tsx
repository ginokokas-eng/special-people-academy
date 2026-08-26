import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  Award 
} from '@/components/icons';

interface AdminOverviewCardsProps {
  totalLearners: number;
  activeEnrollments: number;
  upcomingSessions: number;
  certificatesIssued: number;
  loading?: boolean;
}

export function AdminOverviewCards({
  totalLearners,
  activeEnrollments,
  upcomingSessions,
  certificatesIssued,
  loading = false,
}: AdminOverviewCardsProps) {
  const cards = [
    {
      title: 'Total Learners',
      value: totalLearners,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Enrollments',
      value: activeEnrollments,
      icon: GraduationCap,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Upcoming Sessions',
      value: upcomingSessions,
      icon: Calendar,
      color: 'text-[hsl(var(--warning-ink))]',
      bgColor: 'bg-[hsl(var(--warning)/0.12)]',
    },
    {
      title: 'Certificates Issued',
      value: certificatesIssued,
      icon: Award,
      color: 'text-[hsl(var(--success-ink))]',
      bgColor: 'bg-[hsl(var(--success)/0.12)]',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card
          key={card.title}
          className="settle-in transition-shadow hover:shadow-md"
          style={index ? { animationDelay: `${index * 40}ms` } : undefined}
        >
          <CardContent className="pb-4 pt-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${card.bgColor}`} aria-hidden="true">
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none tracking-tight tabular-nums">
                  {card.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{card.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
