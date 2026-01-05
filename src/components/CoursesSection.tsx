import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Play, BookOpen, ArrowRight } from "lucide-react";

interface CourseCardProps {
  title: string;
  category: string;
  duration: string;
  students: number;
  rating: number;
  progress?: number;
  image: string;
  level: "New Joiner" | "Enhanced" | "Complex";
  price: number;
}

const CourseCard = ({
  title,
  category,
  duration,
  students,
  rating,
  progress,
  image,
  level,
  price,
}: CourseCardProps) => {
  const levelColors = {
    "New Joiner": "bg-success/10 text-success",
    "Enhanced": "bg-warning/10 text-warning",
    "Complex": "bg-destructive/10 text-destructive",
  };

  return (
    <div className="group bg-card rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
      <div className="relative aspect-video bg-muted overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
            <Play className="h-6 w-6 text-foreground ml-0.5" />
          </div>
        </div>
        <span className={`absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-medium ${levelColors[level]}`}>
          {level}
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium text-primary mb-2">{category}</p>
        <h3 className="font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {duration}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {students.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-warning fill-warning" />
            {rating.toFixed(1)}
          </span>
        </div>

        {progress !== undefined ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">£{price}</span>
              {price === 0 && <span className="text-sm text-success font-medium">Free</span>}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Contact Sales
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const CoursesSection = () => {
  const courses: CourseCardProps[] = [
    {
      title: "Workplace Safety Fundamentals",
      category: "Safety & Compliance",
      duration: "2h 30m",
      students: 1234,
      rating: 4.8,
      progress: 75,
      image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop",
      level: "New Joiner",
      price: 99,
    },
    {
      title: "Leadership Skills for New Managers",
      category: "Leadership",
      duration: "4h 15m",
      students: 892,
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
      level: "Enhanced",
      price: 199,
    },
    {
      title: "Advanced Data Analysis with Excel",
      category: "Technical Skills",
      duration: "6h 45m",
      students: 2156,
      rating: 4.7,
      progress: 30,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
      level: "Complex",
      price: 249,
    },
    {
      title: "Effective Communication Strategies",
      category: "Soft Skills",
      duration: "3h 20m",
      students: 1567,
      rating: 4.6,
      image: "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=600&h=400&fit=crop",
      level: "New Joiner",
      price: 149,
    },
    {
      title: "Project Management Essentials",
      category: "Management",
      duration: "5h 10m",
      students: 3421,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
      level: "Enhanced",
      price: 179,
    },
    {
      title: "Cybersecurity Awareness Training",
      category: "IT & Security",
      duration: "1h 45m",
      students: 4892,
      rating: 4.5,
      progress: 100,
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
      level: "New Joiner",
      price: 79,
    },
  ];

  return (
    <section id="courses" className="py-20 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-3">
              <BookOpen className="h-4 w-4" />
              Course Catalog
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Featured Courses
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg">
              Explore our most popular training programs designed to help your team develop essential skills.
            </p>
          </div>
          <Button variant="outline" className="self-start md:self-auto">
            View All Courses
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <div
              key={index}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CourseCard {...course} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
