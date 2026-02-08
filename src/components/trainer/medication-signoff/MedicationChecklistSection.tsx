import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';
import type { ChecklistSection } from '../MedicationSignoffDialog';

interface MedicationChecklistSectionProps {
  section: ChecklistSection;
  checked: boolean;
  comment: string;
  onCheckChange: (checked: boolean) => void;
  onCommentChange: (value: string) => void;
  disabled: boolean;
}

export function MedicationChecklistSection({
  section,
  checked,
  comment,
  onCheckChange,
  onCommentChange,
  disabled,
}: MedicationChecklistSectionProps) {
  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        checked
          ? 'bg-success/5 border-success/30'
          : 'bg-muted/30 border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={section.id}
          checked={checked}
          onCheckedChange={(checked) => onCheckChange(checked as boolean)}
          disabled={disabled}
          className="mt-1"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={section.id}
              className={`font-medium cursor-pointer ${
                checked ? 'text-success' : ''
              }`}
            >
              {section.label}
            </Label>
            {checked && (
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
            )}
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {section.description}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Add comments or observations for this section..."
            rows={2}
            disabled={disabled}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}
