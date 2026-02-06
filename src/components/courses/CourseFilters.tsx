import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CourseFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  levelFilter: string;
  onLevelChange: (value: string) => void;
  deliveryFilter?: string;
  onDeliveryChange?: (value: string) => void;
  priceFilter?: string;
  onPriceChange?: (value: string) => void;
  categories: string[];
}

export const CourseFilters = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  levelFilter,
  onLevelChange,
  deliveryFilter,
  onDeliveryChange,
  priceFilter,
  onPriceChange,
  categories,
}: CourseFiltersProps) => {
  return (
    <Card className="p-4 bg-card border-border/50">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[160px] bg-background">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onDeliveryChange && (
            <Select value={deliveryFilter || 'all'} onValueChange={onDeliveryChange}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="Delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="online_self_paced">Online</SelectItem>
                <SelectItem value="blended">Blended</SelectItem>
                <SelectItem value="in_person_practical">Face-to-Face</SelectItem>
              </SelectContent>
            </Select>
          )}

          {onPriceChange && (
            <Select value={priceFilter || 'all'} onValueChange={onPriceChange}>
              <SelectTrigger className="w-[130px] bg-background">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="under50">Under £50</SelectItem>
                <SelectItem value="50to100">£50 - £100</SelectItem>
                <SelectItem value="over100">Over £100</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={levelFilter} onValueChange={onLevelChange}>
            <SelectTrigger className="w-[140px] bg-background">
              <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};
