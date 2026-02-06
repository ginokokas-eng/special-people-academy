interface StatCardProps {
  value: string;
  label: string;
  trend?: string;
}

const StatCard = ({ value, label, trend }: StatCardProps) => (
  <div className="p-6 bg-card rounded-xl shadow-card hover:shadow-card-hover transition-shadow duration-300">
    <p className="text-3xl font-bold text-primary">{value}</p>
    <p className="text-sm text-foreground font-medium mt-1">{label}</p>
    {trend && (
      <p className="text-xs text-accent-green font-medium mt-2">{trend}</p>
    )}
  </div>
);

export const StatsSection = () => {
  const stats = [
    {
      value: "48",
      label: "Active Courses",
      trend: "+12 this month",
    },
    {
      value: "1,247",
      label: "Team Members",
      trend: "+89 enrolled",
    },
    {
      value: "3,892",
      label: "Certificates Earned",
      trend: "+156 this week",
    },
    {
      value: "94%",
      label: "Completion Rate",
      trend: "+5% vs last quarter",
    },
  ];

  return (
    <section className="py-16 px-6 bg-background">
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
