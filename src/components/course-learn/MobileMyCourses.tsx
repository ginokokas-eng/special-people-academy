import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Search,
  ShoppingCart,
  Heart,
  GraduationCap,
  User,
  CheckCircle2,
  Award,
  ClipboardCheck,
  PlayCircle,
  X,
} from 'lucide-react';

export interface MobileCourseItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  progress: number;
  completedAt: string | null;
  hasCertificate: boolean;
  certificateEarned: boolean;
  requiresPracticalSignoff: boolean;
}

type StatusKey = 'not-started' | 'in-progress' | 'completed' | 'certificate' | 'practical';

function getStatus(c: MobileCourseItem): { key: StatusKey; label: string } | null {
  if (c.certificateEarned) return { key: 'certificate', label: 'Certificate available' };
  if (c.progress >= 100 || c.completedAt) {
    if (c.requiresPracticalSignoff) return { key: 'practical', label: 'Practical sign-off pending' };
    return { key: 'completed', label: 'Completed' };
  }
  if (c.progress > 0) return { key: 'in-progress', label: 'In progress' };
  return null;
}

const FAV_KEY = 'spt_favourite_courses';

function loadFavourites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

type ChipKey = 'all' | 'in-progress' | 'completed' | 'favourites';

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'favourites', label: 'Favourites' },
];

interface MobileMyCoursesProps {
  courses: MobileCourseItem[];
  providerName: string;
  cartCount: number;
  cartEnabled: boolean;
}

export function MobileMyCourses({ courses, providerName, cartCount, cartEnabled }: MobileMyCoursesProps) {
  const navigate = useNavigate();
  const [activeChip, setActiveChip] = useState<ChipKey>('all');
  const [favourites, setFavourites] = useState<string[]>(() => loadFavourites());
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const toggleFavourite = (id: string) => {
    setFavourites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = courses;
    if (activeChip === 'in-progress') list = list.filter((c) => c.progress > 0 && c.progress < 100);
    else if (activeChip === 'completed') list = list.filter((c) => c.progress >= 100 || c.completedAt);
    else if (activeChip === 'favourites') list = list.filter((c) => favourites.includes(c.id));

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q));
    return list;
  }, [courses, activeChip, favourites, search]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-xl font-bold text-foreground">My courses</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Search courses"
              onClick={() => setSearchOpen((v) => !v)}
              className="h-10 w-10 flex items-center justify-center rounded-full text-foreground active:bg-muted"
            >
              <Search className="h-5 w-5" />
            </button>
            {cartEnabled && (
              <button
                type="button"
                aria-label="Basket"
                onClick={() => navigate('/cart')}
                className="relative h-10 w-10 flex items-center justify-center rounded-full text-foreground active:bg-muted"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {searchOpen && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search my courses..."
                className="pl-10 pr-10 h-11"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveChip(chip.key)}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
                activeChip === chip.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border active:bg-muted',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </header>

      {/* Course list */}
      <div className="px-4 py-4 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState chip={activeChip} onBrowse={() => navigate('/courses')} />
        ) : (
          filtered.map((course) => {
            const status = getStatus(course);
            const isFav = favourites.includes(course.id);
            return (
              <div
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}/learn`)}
                className="flex gap-3 rounded-xl border border-border bg-card p-3 active:bg-muted/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <BookOpen className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                      {course.title}
                    </h2>
                    <button
                      type="button"
                      aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(course.id);
                      }}
                      className="-mr-1 -mt-1 h-8 w-8 flex flex-shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                    >
                      <Heart className={cn('h-4 w-4', isFav && 'fill-primary text-primary')} />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{providerName}</p>

                  <div className="mt-auto pt-2">
                    <div className="flex items-center gap-2">
                      <Progress value={course.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-foreground">{course.progress}%</span>
                    </div>
                    {status && <StatusPill status={status} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-5">
          <BottomItem icon={BookOpen} label="Catalogue" onClick={() => navigate('/courses')} />
          <BottomItem
            icon={Search}
            label="Search"
            onClick={() => {
              setSearchOpen(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          <BottomItem icon={GraduationCap} label="My learning" active onClick={() => navigate('/my-courses')} />
          <BottomItem
            icon={Heart}
            label="Favourites"
            onClick={() => {
              setActiveChip('favourites');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          <BottomItem icon={User} label="Account" onClick={() => navigate('/profile')} />
        </div>
      </nav>
    </div>
  );
}

function StatusPill({ status }: { status: { key: StatusKey; label: string } }) {
  const config: Record<StatusKey, { icon: typeof CheckCircle2; className: string }> = {
    'not-started': { icon: PlayCircle, className: 'text-muted-foreground' },
    'in-progress': { icon: PlayCircle, className: 'text-primary' },
    completed: { icon: CheckCircle2, className: 'text-[hsl(152_55%_42%)]' },
    certificate: { icon: Award, className: 'text-[hsl(152_55%_42%)]' },
    practical: { icon: ClipboardCheck, className: 'text-amber-600' },
  };
  const { icon: Icon, className } = config[status.key];
  return (
    <div className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium', className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{status.label}</span>
    </div>
  );
}

function BottomItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof BookOpen;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground active:text-foreground',
      )}
    >
      <Icon className={cn('h-5 w-5', active && 'text-primary')} />
      <span>{label}</span>
    </button>
  );
}

function EmptyState({ chip, onBrowse }: { chip: ChipKey; onBrowse: () => void }) {
  const messages: Record<ChipKey, string> = {
    all: "You haven't been assigned or purchased any courses yet.",
    'in-progress': 'No courses in progress. Start a course to see it here.',
    completed: 'No completed courses yet. Keep learning!',
    favourites: 'No favourites yet. Tap the heart on a course to save it here.',
  };
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">{messages[chip]}</p>
      {chip === 'all' && (
        <button
          type="button"
          onClick={onBrowse}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground active:opacity-90"
        >
          Browse courses
        </button>
      )}
    </div>
  );
}
