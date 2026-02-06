import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  Award 
} from 'lucide-react';

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
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    },
    { 
      title: 'Certificates Issued', 
      value: certificatesIssued, 
      icon: Award, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
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
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                <p className="text-2xl font-bold tracking-tight">{card.value.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
