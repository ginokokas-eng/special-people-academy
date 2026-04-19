import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface EditorialCourse {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  duration_minutes?: number | null;
  thumbnail_url?: string | null;
  cpd_hours?: number | null;
  course_offerings?: { id: string; base_price_gbp: number; active: boolean }[];
}

interface EditorialCourseCardProps {
  course: EditorialCourse;
  /** Optional override rating (defaults to a stable pseudo-rating) */
  rating?: number;
  /** Optional override review count */
  reviews?: number;
}

const formatDuration = (minutes?: number | null) => {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getDefaultOfferingId = (
  offerings?: { id: string; base_price_gbp: number; active: boolean }[]
): string | null => {
  const active = offerings?.filter((o) => o.active) || [];
  if (active.length === 0) return null;
  return [...active].sort((a, b) => a.base_price_gbp - b.base_price_gbp)[0]?.id || null;
};

export const EditorialCourseCard = ({ course, rating, reviews }: EditorialCourseCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  const offeringId = getDefaultOfferingId(course.course_offerings);
  const seedA = course.id.charCodeAt(0) || 0;
  const seedB = course.id.charCodeAt(1) || 0;
  const _rating = rating ?? 4.6 + ((seedA % 4) * 0.1);
  const _reviews = reviews ?? 800 + (seedB % 20) * 110;
  const cpd =
    course.cpd_hours && course.cpd_hours > 0
      ? course.cpd_hours
      : Math.max(4, Math.round((course.duration_minutes || 60) / 30));

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to add items to basket");
      navigate("/auth");
      return;
    }
    if (!offeringId) {
      toast.error("This course is not available for purchase yet");
      return;
    }
    setIsAdding(true);
    const success = await addToCart({
      courseId: course.id,
      offeringId,
      participantsCount: 1,
      regulatedCertification: false,
    });
    setIsAdding(false);
    if (success) {
      toast.success("Added to basket", {
        action: { label: "View Basket", onClick: () => navigate("/cart") },
      });
    }
  };

  return (
    <article
      className="group rounded-3xl border border-[#EEEAF8] bg-white p-5 shadow-[0_1px_2px_rgba(20,10,60,0.04)] hover:shadow-[0_18px_40px_-22px_rgba(76,29,149,0.18)] hover:border-[#E0D6F5] transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      {/* Visual frame */}
      <div className="relative rounded-2xl bg-[hsl(262_50%_97%)] border border-dashed border-[#D6CCF5] aspect-[16/10] overflow-hidden mb-5">
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm border border-[#EEEAF8] text-[10px] font-semibold uppercase tracking-wider text-[hsl(259_72%_14%)]">
          {course.category}
        </span>

        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-[hsl(259_20%_55%)] text-center px-6 leading-relaxed">
            [ ILLUSTRATION
            <br />
            {course.category.toLowerCase()}, warm tones
            <br />
            16:10 ]
          </div>
        )}

        <span className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-full bg-[hsl(259_72%_14%)] text-white text-[11px] font-semibold tabular-nums">
          {formatDuration(course.duration_minutes)}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[hsl(189_94%_30%)] mb-2">
          {course.category}
        </p>
        <h3 className="font-heading text-xl font-bold text-[hsl(259_72%_14%)] leading-snug mb-3 group-hover:text-[hsl(262_83%_45%)] transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-sm text-[hsl(259_20%_35%)] leading-relaxed line-clamp-3 mb-5">
            {course.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-[#F1ECF9] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(259_20%_35%)]">
            <Star className="h-3.5 w-3.5 fill-[hsl(38_92%_50%)] text-[hsl(38_92%_50%)]" />
            <span className="font-semibold text-[hsl(259_72%_14%)] tabular-nums">
              {_rating.toFixed(1)}
            </span>
            <span className="text-[hsl(259_20%_55%)]">·</span>
            <span className="tabular-nums">{_reviews.toLocaleString()}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[hsl(189_94%_94%)] text-[hsl(189_94%_22%)] text-[11px] font-semibold tabular-nums">
            CPD · {cpd}pts
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-full border-[#E8E4F7] text-[hsl(259_72%_14%)] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          onClick={handleAdd}
          disabled={isAdding || !offeringId}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isAdding ? "Adding..." : "Add to Basket"}
        </Button>
      </div>
    </article>
  );
};
