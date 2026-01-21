import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { 
  Play, 
  Clock, 
  Calendar, 
  Globe, 
  Award,
  Users,
  Laptop,
  Star,
  Heart
} from 'lucide-react';

interface CourseHeroProps {
  title: string;
  subtitle?: string;
  level: string;
  deliveryType: string;
  category: string;
  isMandatory: boolean;
  isInternal: boolean;
  hasCertificate: boolean;
  durationMinutes: number;
  lastUpdated?: string;
  language: string;
  thumbnailUrl?: string;
  videoPreviewUrl?: string;
  averageRating?: number;
  reviewCount?: number;
  learnerCount?: number;
  onStart: () => void;
  isEnrolled: boolean;
  progress: number;
}

const levelColors: Record<string, string> = {
  'New Joiner': 'bg-success/10 text-success border-success/20',
  'Enhanced': 'bg-warning/10 text-warning border-warning/20',
  'Complex': 'bg-destructive/10 text-destructive border-destructive/20',
};

const categoryIcons: Record<string, React.ReactNode> = {
  'Care & Support': <Heart className="h-3.5 w-3.5" />,
};

export function CourseHero({
  title,
  subtitle,
  level,
  deliveryType,
  category,
  isMandatory,
  isInternal,
  hasCertificate,
  durationMinutes,
  lastUpdated,
  language,
  thumbnailUrl,
  videoPreviewUrl,
  averageRating,
  reviewCount = 0,
  learnerCount = 0,
  onStart,
  isEnrolled,
  progress,
}: CourseHeroProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getDeliveryIcon = () => {
    switch (deliveryType) {
      case 'blended':
        return <Users className="h-3.5 w-3.5" />;
      case 'in-person':
        return <Users className="h-3.5 w-3.5" />;
      default:
        return <Laptop className="h-3.5 w-3.5" />;
    }
  };

  const getDeliveryLabel = () => {
    switch (deliveryType) {
      case 'blended':
        return 'Blended Learning';
      case 'in-person':
        return 'In-Person';
      default:
        return 'Online';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.round(rating) ? 'text-warning fill-warning' : 'text-primary-foreground/30'
        }`}
      />
    ));
  };

  return (
    <div className="gradient-hero text-primary-foreground">
      <div className="container py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left content */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                {categoryIcons[category] || <Heart className="h-3.5 w-3.5" />}
                <span className="ml-1.5">{category}</span>
              </Badge>
              {isMandatory && (
                <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                  Mandatory {isInternal ? '(Internal)' : ''}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                {getDeliveryIcon()}
                <span className="ml-1.5">{getDeliveryLabel()}</span>
              </Badge>
              {hasCertificate && (
                <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                  <Award className="h-3.5 w-3.5 mr-1.5" />
                  Certificate included
                </Badge>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">{title}</h1>
              {subtitle && (
                <p className="text-lg text-primary-foreground/80">{subtitle}</p>
              )}
            </div>

            {/* Level badge */}
            <Badge 
              variant="outline" 
              className={`text-sm px-3 py-1 ${levelColors[level] || levelColors['New Joiner']}`}
            >
              {level} Level
            </Badge>

            {/* Rating & learner count */}
            {(averageRating || learnerCount > 0) && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {averageRating && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-warning">{averageRating.toFixed(1)}</span>
                    <div className="flex">{renderStars(averageRating)}</div>
                    <span className="text-primary-foreground/70">
                      ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
                {learnerCount > 0 && (
                  <span className="flex items-center gap-1.5 text-primary-foreground/70">
                    <Users className="h-4 w-4" />
                    {learnerCount.toLocaleString()} learners
                  </span>
                )}
              </div>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(durationMinutes)}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Updated {formatDate(lastUpdated)}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                {language}
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              {videoPreviewUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                      <Play className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl p-0">
                    <div className="aspect-video">
                      <iframe
                        src={videoPreviewUrl}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button 
                onClick={onStart} 
                className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90"
              >
                {isEnrolled ? (progress > 0 ? 'Continue Learning' : 'Start Course') : 'Start Course'}
              </Button>
            </div>
          </div>

          {/* Right - Course thumbnail */}
          <div className="hidden lg:block">
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
              {thumbnailUrl ? (
                <img 
                  src={thumbnailUrl} 
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center">
                  <Play className="h-16 w-16 text-primary-foreground/60" />
                </div>
              )}
              {videoPreviewUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="absolute inset-0 flex items-center justify-center bg-foreground/20 hover:bg-foreground/30 transition-colors group">
                      <div className="w-16 h-16 rounded-full bg-primary-foreground/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-foreground ml-1" />
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl p-0">
                    <div className="aspect-video">
                      <iframe
                        src={videoPreviewUrl}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}