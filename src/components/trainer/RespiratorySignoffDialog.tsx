import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ClipboardCheck,
  Eye,
  Calendar,
  MapPin,
} from 'lucide-react';

interface RespiratorySignoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

interface ChecklistState {
  scope_boundaries: boolean;
  respiratory_red_flags: boolean;
  pulse_oximetry: boolean;
  oxygen_safety: boolean;
  oxygen_support: boolean;
  oral_suction: boolean;
  infection_prevention: boolean;
  equipment_checks: boolean;
  documentation_handover: boolean;
}

interface CommentsState {
  scope_boundaries_comments: string;
  respiratory_red_flags_comments: string;
  pulse_oximetry_comments: string;
  oxygen_safety_comments: string;
  oxygen_support_comments: string;
  oral_suction_comments: string;
  infection_prevention_comments: string;
  equipment_checks_comments: string;
  documentation_handover_comments: string;
}

interface ChecklistSection {
  id: string;
  label: string;
  description: string;
  checkField: keyof ChecklistState;
  commentField: keyof CommentsState;
}

const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'scope_boundaries',
    label: '1. Scope & Boundaries',
    description:
      '• Explains course scope correctly (non-tracheostomy)\n• Identifies what is excluded (advanced ventilation, CPAP/BiPAP)\n• Understands when to stop and escalate',
    checkField: 'scope_boundaries',
    commentField: 'scope_boundaries_comments',
  },
  {
    id: 'respiratory_red_flags',
    label: '2. Respiratory Red Flags & Escalation',
    description:
      '• Recognises signs of respiratory distress\n• Follows ABCDE escalation pathway correctly\n• Knows when and how to call for emergency help',
    checkField: 'respiratory_red_flags',
    commentField: 'respiratory_red_flags_comments',
  },
  {
    id: 'pulse_oximetry',
    label: '3. Pulse Oximetry Awareness',
    description:
      '• Demonstrates correct probe placement\n• Understands target range is care-plan led\n• Knows when readings require escalation',
    checkField: 'pulse_oximetry',
    commentField: 'pulse_oximetry_comments',
  },
  {
    id: 'oxygen_safety',
    label: '4. Oxygen Safety',
    description:
      '• Demonstrates safe handling and storage principles\n• Understands fire-risk awareness (oxygen supports combustion)\n• Knows cylinder storage and transport rules',
    checkField: 'oxygen_safety',
    commentField: 'oxygen_safety_comments',
  },
  {
    id: 'oxygen_support',
    label: '5. Oxygen Support (Awareness + Policy-led)',
    description:
      '• Follows prescription/care plan for oxygen delivery\n• Documents flow rate, duration, SpO₂ readings\n• Escalates discrepancies appropriately',
    checkField: 'oxygen_support',
    commentField: 'oxygen_support_comments',
  },
  {
    id: 'oral_suction',
    label: '6. Oral Suction Awareness',
    description:
      '• Demonstrates safe approach on mannequin/trainer simulation\n• Time-limited suctioning (~10 seconds)\n• Indication-led; stops immediately if distress occurs',
    checkField: 'oral_suction',
    commentField: 'oral_suction_comments',
  },
  {
    id: 'infection_prevention',
    label: '7. Infection Prevention',
    description:
      '• Uses correct PPE (gloves, apron, eye/face protection)\n• Demonstrates clean technique\n• Correct disposal of single-use items',
    checkField: 'infection_prevention',
    commentField: 'infection_prevention_comments',
  },
  {
    id: 'equipment_checks',
    label: '8. Equipment Checks & Troubleshooting',
    description:
      '• Checks equipment at start of shift and before use\n• Basic troubleshooting (battery, filters, tubing) within policy\n• Reports faults correctly',
    checkField: 'equipment_checks',
    commentField: 'equipment_checks_comments',
  },
  {
    id: 'documentation_handover',
    label: '9. Documentation & Handover',
    description:
      '• Accurate recording of actions, times, observations\n• Escalation notes completed correctly\n• Structured handover information provided',
    checkField: 'documentation_handover',
    commentField: 'documentation_handover_comments',
  },
];

const INITIAL_CHECKLIST: ChecklistState = {
  scope_boundaries: false,
  respiratory_red_flags: false,
  pulse_oximetry: false,
  oxygen_safety: false,
  oxygen_support: false,
  oral_suction: false,
  infection_prevention: false,
  equipment_checks: false,
  documentation_handover: false,
};

const INITIAL_COMMENTS: CommentsState = {
  scope_boundaries_comments: '',
  respiratory_red_flags_comments: '',
  pulse_oximetry_comments: '',
  oxygen_safety_comments: '',
  oxygen_support_comments: '',
  oral_suction_comments: '',
  infection_prevention_comments: '',
  equipment_checks_comments: '',
  documentation_handover_comments: '',
};

export function RespiratorySignoffDialog({
  open,
  onOpenChange,
  learnerId,
  learnerName,
  courseId,
  courseTitle,
  onSuccess,
}: RespiratorySignoffDialogProps) {
  const { user } = useAuth();
  const { canSignOffCompetency } = useRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingSignoff, setExistingSignoff] = useState<any>(null);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  const [checklist, setChecklist] = useState<ChecklistState>({ ...INITIAL_CHECKLIST });
  const [comments, setComments] = useState<CommentsState>({ ...INITIAL_COMMENTS });
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [reassessmentDate, setReassessmentDate] = useState('');

  const allChecked = Object.values(checklist).every(Boolean);
  const checkedCount = Object.values(checklist).filter(Boolean).length;

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user, learnerId, courseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      setStaffProfileId(staffData?.id || null);

      const { data: latestAttempt } = await supabase
        .from('respiratory_competency_signoffs' as any)
        .select('attempt_number, outcome')
        .eq('user_id', learnerId)
        .eq('course_id', courseId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentAttempt = 1;
      if (latestAttempt) {
        const attempt = latestAttempt as any;
        if (attempt.outcome === 'competent') {
          currentAttempt = attempt.attempt_number;
        } else if (attempt.outcome === 'not_yet_competent') {
          currentAttempt = attempt.attempt_number + 1;
        } else {
          currentAttempt = attempt.attempt_number;
        }
      }
      setAttemptNumber(currentAttempt);

      const { data: signoffData } = await supabase
        .from('respiratory_competency_signoffs' as any)
        .select('*')
        .eq('user_id', learnerId)
        .eq('course_id', courseId)
        .eq('attempt_number', currentAttempt)
        .maybeSingle();

      if (signoffData) {
        const d = signoffData as any;
        setExistingSignoff(d);
        setChecklist({
          scope_boundaries: d.scope_boundaries || false,
          respiratory_red_flags: d.respiratory_red_flags || false,
          pulse_oximetry: d.pulse_oximetry || false,
          oxygen_safety: d.oxygen_safety || false,
          oxygen_support: d.oxygen_support || false,
          oral_suction: d.oral_suction || false,
          infection_prevention: d.infection_prevention || false,
          equipment_checks: d.equipment_checks || false,
          documentation_handover: d.documentation_handover || false,
        });
        setComments({
          scope_boundaries_comments: d.scope_boundaries_comments || '',
          respiratory_red_flags_comments: d.respiratory_red_flags_comments || '',
          pulse_oximetry_comments: d.pulse_oximetry_comments || '',
          oxygen_safety_comments: d.oxygen_safety_comments || '',
          oxygen_support_comments: d.oxygen_support_comments || '',
          oral_suction_comments: d.oral_suction_comments || '',
          infection_prevention_comments: d.infection_prevention_comments || '',
          equipment_checks_comments: d.equipment_checks_comments || '',
          documentation_handover_comments: d.documentation_handover_comments || '',
        });
        setLocation(d.location || '');
        setNotes(d.assessor_notes || '');
        setActionPlan(d.action_plan || '');
        setReassessmentDate(d.reassessment_date || '');
      } else {
        resetForm();
      }
    } catch (error) {
      console.error('Error fetching respiratory sign-off data:', error);
      toast.error('Failed to load sign-off data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExistingSignoff(null);
    setChecklist({ ...INITIAL_CHECKLIST });
    setComments({ ...INITIAL_COMMENTS });
    setLocation('');
    setNotes('');
    setActionPlan('');
    setReassessmentDate('');
  };

  const handleCheckboxChange = (field: keyof ChecklistState, checked: boolean) => {
    if (!canSignOffCompetency) return;
    setChecklist((prev) => ({ ...prev, [field]: checked }));
  };

  const handleCommentChange = (field: keyof CommentsState, value: string) => {
    if (!canSignOffCompetency) return;
    setComments((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = (outcome: string) => ({
    user_id: learnerId,
    course_id: courseId,
    assessor_id: staffProfileId!,
    attempt_number: attemptNumber,
    location,
    ...checklist,
    ...comments,
    assessor_notes: notes || null,
    outcome,
    action_plan: outcome === 'not_yet_competent' ? actionPlan : null,
    reassessment_date: outcome === 'not_yet_competent' ? reassessmentDate : null,
    assessed_at: outcome !== 'pending' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });

  const handleSaveProgress = async () => {
    if (!staffProfileId) { toast.error('Staff profile not found'); return; }
    if (!location.trim()) { toast.error('Please enter the assessment location'); return; }

    setSaving(true);
    try {
      const payload = buildPayload('pending');
      if (existingSignoff) {
        const { error } = await supabase
          .from('respiratory_competency_signoffs' as any)
          .update(payload)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('respiratory_competency_signoffs' as any)
          .insert(payload);
        if (error) throw error;
      }
      toast.success('Progress saved');
      onSuccess?.();
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOff = async (outcome: 'competent' | 'not_yet_competent') => {
    if (!canSignOffCompetency) { toast.error('You do not have permission to sign off competency'); return; }
    if (!staffProfileId) { toast.error('Staff profile not found'); return; }
    if (!location.trim()) { toast.error('Please enter the assessment location'); return; }
    if (outcome === 'competent' && !allChecked) { toast.error('All checklist items must be completed to mark as competent'); return; }
    if (outcome === 'not_yet_competent') {
      if (!actionPlan.trim()) { toast.error('Action plan is required when marking as Not Yet Competent'); return; }
      if (!reassessmentDate) { toast.error('Reassessment date is required when marking as Not Yet Competent'); return; }
    }

    setSaving(true);
    try {
      const payload = buildPayload(outcome);
      if (existingSignoff) {
        const { error } = await supabase
          .from('respiratory_competency_signoffs' as any)
          .update(payload)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('respiratory_competency_signoffs' as any)
          .insert(payload);
        if (error) throw error;
      }

      // Notify learner
      const notificationTitle = outcome === 'competent'
        ? 'Respiratory Practical Assessment Passed!'
        : 'Respiratory Practical Assessment: Further Practice Required';
      const notificationMessage = outcome === 'competent'
        ? `Congratulations! You have been signed off as competent for "${courseTitle}". Your Competency Sign-off Certificate is now available.`
        : `Your practical assessment for "${courseTitle}" requires further practice. Action Plan: ${actionPlan}. Reassessment scheduled for ${reassessmentDate}.`;

      await supabase.from('learner_notifications').insert({
        user_id: learnerId,
        title: notificationTitle,
        message: notificationMessage,
        related_course_id: courseId,
      });

      // Issue certificate if competent
      if (outcome === 'competent') {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          await supabase.functions.invoke('issue-competency-certificate', {
            body: { user_id: learnerId, course_id: courseId },
            headers: { Authorization: `Bearer ${session.session.access_token}` },
          });
        }
      }

      toast.success(
        outcome === 'competent'
          ? 'Learner signed off as competent!'
          : 'Assessment saved – learner notified of action plan'
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error signing off:', error);
      toast.error('Failed to complete sign-off');
    } finally {
      setSaving(false);
    }
  };

  const isAlreadySigned = existingSignoff?.outcome === 'competent';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Respiratory Management — Practical Sign-off Checklist
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span>{learnerName}</span>
            <Badge variant="outline">Attempt #{attemptNumber}</Badge>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {!canSignOffCompetency && (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  You can view this checklist but cannot submit the final sign-off.
                  Only authorized assessors (Tamar or Marina) can complete sign-offs.
                </AlertDescription>
              </Alert>
            )}

            {isAlreadySigned && (
              <Alert className="border-success bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  This learner has already been signed off as competent.
                </AlertDescription>
              </Alert>
            )}

            {/* Assessment metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Assessment Location
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Head Office, Training Room 2"
                  disabled={!canSignOffCompetency || isAlreadySigned}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Assessment Date
                </Label>
                <Input
                  type="date"
                  value={existingSignoff?.assessed_at?.split('T')[0] || new Date().toISOString().split('T')[0]}
                  disabled
                />
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Checklist Progress</span>
              <Badge variant={allChecked ? 'default' : 'secondary'}>
                {checkedCount} / {CHECKLIST_SECTIONS.length} Complete
              </Badge>
            </div>

            <Separator />

            {/* Checklist items */}
            <div className="space-y-4">
              {CHECKLIST_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    checklist[section.checkField]
                      ? 'bg-success/5 border-success/30'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={section.id}
                      checked={checklist[section.checkField]}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(section.checkField, checked as boolean)
                      }
                      disabled={!canSignOffCompetency || isAlreadySigned}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={section.id}
                        className={`font-medium cursor-pointer ${
                          checklist[section.checkField] ? 'text-success' : ''
                        }`}
                      >
                        {section.label}
                      </Label>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {section.description}
                      </p>
                    </div>
                    {checklist[section.checkField] && (
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    )}
                  </div>
                  <div className="mt-3 ml-7">
                    <Textarea
                      value={comments[section.commentField]}
                      onChange={(e) =>
                        handleCommentChange(section.commentField, e.target.value)
                      }
                      placeholder="Optional comments for this section..."
                      rows={2}
                      className="text-sm"
                      disabled={!canSignOffCompetency || isAlreadySigned}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Assessor Notes */}
            <div className="space-y-2">
              <Label htmlFor="resp-notes">Assessor Notes</Label>
              <Textarea
                id="resp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Overall observations, areas of strength or improvement..."
                rows={3}
                disabled={!canSignOffCompetency || isAlreadySigned}
              />
            </div>

            {/* Action plan */}
            {canSignOffCompetency && !isAlreadySigned && (
              <div className="space-y-4 p-4 rounded-lg border border-dashed border-warning/50 bg-warning/5">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  If Not Yet Competent
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="resp-action-plan">
                    Action Plan <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="resp-action-plan"
                    value={actionPlan}
                    onChange={(e) => setActionPlan(e.target.value)}
                    placeholder="Describe areas for improvement and recommended practice..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resp-reassessment">
                    Reassessment Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="resp-reassessment"
                    type="date"
                    value={reassessmentDate}
                    onChange={(e) => setReassessmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          {canSignOffCompetency && !isAlreadySigned && (
            <>
              <Button variant="outline" onClick={handleSaveProgress} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Progress
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleSignOff('not_yet_competent')}
                disabled={saving}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Not Yet Competent
              </Button>
              <Button
                onClick={() => handleSignOff('competent')}
                disabled={saving || !allChecked}
                className="bg-success hover:bg-success/90"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Sign Off as Competent
              </Button>
            </>
          )}
          {(!canSignOffCompetency || isAlreadySigned) && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
