import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface MedicationActionPlanSectionProps {
  actionPlan: string;
  reassessmentDate: string;
  onActionPlanChange: (value: string) => void;
  onReassessmentDateChange: (value: string) => void;
  disabled: boolean;
  isVisible: boolean;
}

export function MedicationActionPlanSection({
  actionPlan,
  reassessmentDate,
  onActionPlanChange,
  onReassessmentDateChange,
  disabled,
  isVisible,
}: MedicationActionPlanSectionProps) {
  if (!isVisible) return null;

  return (
    <div className="space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">If Not Yet Competent</span>
      </div>
      
      <Alert variant="destructive" className="bg-transparent border-0 p-0">
        <AlertDescription className="text-sm">
          The following fields are required if marking as "Not Yet Competent"
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="action-plan">Action Plan *</Label>
        <Textarea
          id="action-plan"
          value={actionPlan}
          onChange={(e) => onActionPlanChange(e.target.value)}
          placeholder="Describe specific areas for improvement and recommended actions..."
          rows={4}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reassessment-date">Reassessment Date *</Label>
        <Input
          id="reassessment-date"
          type="date"
          value={reassessmentDate}
          onChange={(e) => onReassessmentDateChange(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
