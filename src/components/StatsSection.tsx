import { BookOpen, Users, Trophy, TrendingUp } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  trend?: string;
}

const StatCard = ({ icon, value, label, trend }: StatCardProps) => (
  <div className="flex items-center gap-4 p-6 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-shadow duration-300">
    <div className="p-3 rounded-lg gradient-primary text-primary-foreground">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {trend && (
        <p className="text-xs text-success font-medium mt-1">{trend}</p>
      )}
    </div>
  </div>
);

export const StatsSection = () => {
  const stats = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      value: "48",
      label: "Active Courses",
      trend: "+12 this month",
    },
    {
      icon: <Users className="h-5 w-5" />,
      value: "1,247",
      label: "Team Members",
      trend: "+89 enrolled",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      value: "3,892",
      label: "Certificates Earned",
      trend: "+156 this week",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      value: "94%",
      label: "Completion Rate",
      trend: "+5% vs last quarter",
    },
  ];

  return (
    <section className="py-16 px-6 bg-secondary/50">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <StatCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
