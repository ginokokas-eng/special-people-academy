import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from '@/components/icons';
import { LESSON_TEMPLATES, type LessonTemplate } from './templates';

interface TemplatePickerProps {
  onPick: (template: LessonTemplate) => void;
}

/** Empty-state helper: seed a lesson from a pre-built, fully editable sequence. */
export function TemplatePicker({ onPick }: TemplatePickerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">No blocks yet — start from a template</CardTitle>
        <CardDescription>
          Templates add ready-made blocks with guidance text you replace with your own words. You can
          delete, reorder or change anything afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LESSON_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onPick(template)}
              aria-label={`Start from the ${template.name} template`}
              className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                {template.name}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {template.description}
              </span>
              <span className="mt-2 block text-xs font-medium text-primary">
                {template.outline}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
