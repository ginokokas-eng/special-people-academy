import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface Course {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  category: string;
  subtitle: string | null;
  overview: string | null;
  learning_outcomes: string[];
  target_audience: string[];
  requirements: string[];
  duration_minutes: number;
  delivery_type: string | null;
  available_delivery_types: string[];
  requires_practical_signoff: boolean;
  has_certificate: boolean;
  certificate_expiry_months: number | null;
  cpd_hours: number;
  cpd_eligible: boolean;
  cpd_certified: boolean;
  level: string | null;
  thumbnail_url: string | null;
}

interface CourseOverviewTabProps {
  course: Course;
  onUpdate: (updates: Partial<Course>) => void;
}

const CATEGORIES = [
  'Clinical & Emergency Care',
  'Complex Needs & Specialist Care',
  'Health & Safety',
  'Safeguarding',
  'Communication & Professional Development',
  'Mandatory Training',
  'Leadership & Management',
  'Uncategorized',
];

const LEVELS = ['Awareness', 'New Joiner', 'Foundation', 'Intermediate', 'Advanced', 'Expert', 'Complex'];

const DELIVERY_TYPES = [
  { value: 'online_self_paced', label: 'Online Self-Paced' },
  { value: 'live_online', label: 'Live Online' },
  { value: 'in_person_practical', label: 'In-Person Practical' },
  { value: 'blended', label: 'Blended' },
];

export function CourseOverviewTab({ course, onUpdate }: CourseOverviewTabProps) {
  const [newOutcome, setNewOutcome] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newRequirement, setNewRequirement] = useState('');

  const addItem = (field: 'learning_outcomes' | 'target_audience' | 'requirements', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      onUpdate({ [field]: [...course[field], value.trim()] });
      setter('');
    }
  };

  const removeItem = (field: 'learning_outcomes' | 'target_audience' | 'requirements', index: number) => {
    onUpdate({ [field]: course[field].filter((_, i) => i !== index) });
  };

  const generateSlug = () => {
    const slug = course.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    onUpdate({ slug });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Course title, description, and category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={course.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={course.slug || ''}
                onChange={(e) => onUpdate({ slug: e.target.value })}
                placeholder="course-url-slug"
              />
              <Button type="button" variant="outline" onClick={generateSlug}>
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={course.subtitle || ''}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={course.category}
              onValueChange={(value) => onUpdate({ category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select
              value={course.level || ''}
              onValueChange={(value) => onUpdate({ level: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short Description</Label>
            <Textarea
              id="description"
              value={course.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="overview">Full Overview</Label>
            <Textarea
              id="overview"
              value={course.overview || ''}
              onChange={(e) => onUpdate({ overview: e.target.value })}
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Settings</CardTitle>
            <CardDescription>Duration and delivery options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={course.duration_minutes}
                onChange={(e) => onUpdate({ duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Delivery Types</Label>
              <div className="flex flex-wrap gap-2">
                {DELIVERY_TYPES.map((type) => (
                  <Badge
                    key={type.value}
                    variant={course.available_delivery_types.includes(type.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = course.available_delivery_types;
                      const updated = current.includes(type.value)
                        ? current.filter(t => t !== type.value)
                        : [...current, type.value];
                      onUpdate({ available_delivery_types: updated });
                    }}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="practical">Requires Practical Sign-off</Label>
              <Switch
                id="practical"
                checked={course.requires_practical_signoff}
                onCheckedChange={(checked) => onUpdate({ requires_practical_signoff: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certification & CPD</CardTitle>
            <CardDescription>Certificate and CPD settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="certificate">Has Certificate</Label>
              <Switch
                id="certificate"
                checked={course.has_certificate}
                onCheckedChange={(checked) => onUpdate({ has_certificate: checked })}
              />
            </div>

            {course.has_certificate && (
              <div className="space-y-2">
                <Label htmlFor="expiry">Certificate Expiry (months)</Label>
                <Input
                  id="expiry"
                  type="number"
                  value={course.certificate_expiry_months || ''}
                  onChange={(e) => onUpdate({ certificate_expiry_months: parseInt(e.target.value) || null })}
                  placeholder="Leave empty for no expiry"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cpd">CPD Hours</Label>
              <Input
                id="cpd"
                type="number"
                step="0.5"
                value={course.cpd_hours}
                onChange={(e) => onUpdate({ cpd_hours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="cpd-eligible">CPD Eligible</Label>
              <Switch
                id="cpd-eligible"
                checked={course.cpd_eligible}
                onCheckedChange={(checked) => onUpdate({ cpd_eligible: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="cpd-certified">CPD Certified</Label>
              <Switch
                id="cpd-certified"
                checked={course.cpd_certified}
                onCheckedChange={(checked) => onUpdate({ cpd_certified: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Learning Outcomes</CardTitle>
          <CardDescription>What learners will achieve</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newOutcome}
              onChange={(e) => setNewOutcome(e.target.value)}
              placeholder="Add a learning outcome..."
              onKeyDown={(e) => e.key === 'Enter' && addItem('learning_outcomes', newOutcome, setNewOutcome)}
            />
            <Button onClick={() => addItem('learning_outcomes', newOutcome, setNewOutcome)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.learning_outcomes.map((outcome, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {outcome}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeItem('learning_outcomes', index)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Audience</CardTitle>
          <CardDescription>Who this course is for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              placeholder="Add target audience..."
              onKeyDown={(e) => e.key === 'Enter' && addItem('target_audience', newAudience, setNewAudience)}
            />
            <Button onClick={() => addItem('target_audience', newAudience, setNewAudience)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.target_audience.map((audience, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {audience}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeItem('target_audience', index)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
          <CardDescription>Prerequisites for this course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              placeholder="Add a requirement..."
              onKeyDown={(e) => e.key === 'Enter' && addItem('requirements', newRequirement, setNewRequirement)}
            />
            <Button onClick={() => addItem('requirements', newRequirement, setNewRequirement)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.requirements.map((req, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {req}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeItem('requirements', index)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
