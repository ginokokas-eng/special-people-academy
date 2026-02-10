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

interface BLSSignoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

interface ChecklistState {
  scene_safety: boolean;
  breathing_check: boolean;
  chest_compressions: boolean;
  rescue_breaths: boolean;
  aed_use: boolean;
  choking_response: boolean;
  recovery_position: boolean;
  handover_reporting: boolean;
}

interface CommentsState {
  scene_safety_comments: string;
  breathing_check_comments: string;
  chest_compressions_comments: string;
  rescue_breaths_comments: string;
  aed_use_comments: string;
  choking_response_comments: string;
  recovery_position_comments: string;
  handover_reporting_comments: string;
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
    id: 'scene_safety',
    label: '1. Scene Safety, Response Check & Call for Help',
    description:
      '• Checks scene is safe before approaching\n• Assesses responsiveness (tap, shout)\n• Calls 999/112, uses speakerphone if alone',
    checkField: 'scene_safety',
    commentField: 'scene_safety_comments',
  },
  {
    id: 'breathing_check',
    label: '2. Breathing Check',
    description:
      '• Performed within 10 seconds\n• Recognises normal vs abnormal breathing\n• Identifies agonal gasps as "not breathing normally"',
    checkField: 'breathing_check',
    commentField: 'breathing_check_comments',
  },
  {
    id: 'chest_compressions',
    label: '3. High-Quality Chest Compressions',
    description:
      '• Correct hand position (centre of chest)\n• Rate guidance: 100–120/min\n• Depth guidance: 5–6 cm\n• Full recoil, minimal interruptions',
    checkField: 'chest_compressions',
    commentField: 'chest_compressions_comments',
  },
  {
    id: 'rescue_breaths',
    label: '4. Rescue Breaths / Compression-Only CPR',
    description:
      '• Demonstrates rescue breaths safely (if included)\n  OR explains when compression-only CPR is appropriate\n• Head-tilt, chin-lift performed correctly',
    checkField: 'rescue_breaths',
    commentField: 'rescue_breaths_comments',
  },
  {
    id: 'aed_use',
    label: '5. AED (Defibrillator) Use',
    description:
      '• Turns on AED correctly\n• Pads applied in correct position\n• Stands clear during analysis and shock\n• Resumes CPR immediately after shock/no-shock',
    checkField: 'aed_use',
    commentField: 'aed_use_comments',
  },
  {
    id: 'choking_response',
    label: '6. Choking Response',
    description:
      '• Differentiates mild vs severe obstruction\n• Performs 5 back blows + 5 abdominal thrusts (simulation)\n• Calls for help and starts CPR if casualty becomes unresponsive',
    checkField: 'choking_response',
    commentField: 'choking_response_comments',
  },
  {
    id: 'recovery_position',
    label: '7. Recovery Position',
    description:
      '• Places unconscious, breathing casualty safely\n• Maintains open airway\n• Monitors breathing continuously',
    checkField: 'recovery_position',
    commentField: 'recovery_position_comments',
  },
  {
    id: 'handover_reporting',
    label: '8. Handover & Reporting',
    description:
      '• Provides structured handover information (e.g. ASHICE)\n• Knows what to tell emergency services / clinical team\n• Understands incident reporting and debrief requirements',
    checkField: 'handover_reporting',
    commentField: 'handover_reporting_comments',
  },
];

export function BLSSignoffDialog({
  open,
  onOpenChange,
  learnerId,
  learnerName,
  courseId,
  courseTitle,
  onSuccess,
}: BLSSignoffDialogProps) {
  const { user } = useAuth();
  const { canSignOffCompetency } = useRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingSignoff, setExistingSignoff] = useState<any>(null);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  const [checklist, setChecklist] = useState<ChecklistState>({
    scene_safety: false,
    breathing_check: false,
    chest_compressions: false,
    rescue_breaths: false,
    aed_use: false,
    choking_response: false,
    recovery_position: false,
    handover_reporting: false,
  });

  const [comments, setComments] = useState<CommentsState>({
    scene_safety_comments: '',
    breathing_check_comments: '',
    chest_compressions_comments: '',
    rescue_breaths_comments: '',
    aed_use_comments: '',
    choking_response_comments: '',
    recovery_position_comments: '',
    handover_reporting_comments: '',
  });

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

      // Get latest attempt
      const { data: latestAttempt } = await supabase
        .from('bls_competency_signoffs')
        .select('attempt_number, outcome')
        .eq('user_id', learnerId)
        .eq('course_id', courseId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentAttempt = 1;

      if (latestAttempt) {
        if (latestAttempt.outcome === 'competent') {
          currentAttempt = latestAttempt.attempt_number;
        } else if (latestAttempt.outcome === 'not_yet_competent') {
          currentAttempt = latestAttempt.attempt_number + 1;
        } else {
          currentAttempt = latestAttempt.attempt_number;
        }
      }

      setAttemptNumber(currentAttempt);

      // Fetch the current attempt data
      const { data: signoffData } = await supabase
        .from('bls_competency_signoffs')
        .select('*')
        .eq('user_id', learnerId)
        .eq('course_id', courseId)
        .eq('attempt_number', currentAttempt)
        .maybeSingle();

      if (signoffData) {
        setExistingSignoff(signoffData);
        setChecklist({
          scene_safety: signoffData.scene_safety || false,
          breathing_check: signoffData.breathing_check || false,
          chest_compressions: signoffData.chest_compressions || false,
          rescue_breaths: signoffData.rescue_breaths || false,
          aed_use: signoffData.aed_use || false,
          choking_response: signoffData.choking_response || false,
          recovery_position: signoffData.recovery_position || false,
          handover_reporting: signoffData.handover_reporting || false,
        });
        setComments({
          scene_safety_comments: signoffData.scene_safety_comments || '',
          breathing_check_comments: signoffData.breathing_check_comments || '',
          chest_compressions_comments: signoffData.chest_compressions_comments || '',
          rescue_breaths_comments: signoffData.rescue_breaths_comments || '',
          aed_use_comments: signoffData.aed_use_comments || '',
          choking_response_comments: signoffData.choking_response_comments || '',
          recovery_position_comments: signoffData.recovery_position_comments || '',
          handover_reporting_comments: signoffData.handover_reporting_comments || '',
        });
        setLocation(signoffData.location || '');
        setNotes(signoffData.assessor_notes || '');
        setActionPlan(signoffData.action_plan || '');
        setReassessmentDate(signoffData.reassessment_date || '');
      } else {
        resetForm();
      }
    } catch (error) {
      console.error('Error fetching BLS sign-off data:', error);
      toast.error('Failed to load sign-off data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExistingSignoff(null);
    setChecklist({
      scene_safety: false,
      breathing_check: false,
      chest_compressions: false,
      rescue_breaths: false,
      aed_use: false,
      choking_response: false,
      recovery_position: false,
      handover_reporting: false,
    });
    setComments({
      scene_safety_comments: '',
      breathing_check_comments: '',
      chest_compressions_comments: '',
      rescue_breaths_comments: '',
      aed_use_comments: '',
      choking_response_comments: '',
      recovery_position_comments: '',
      handover_reporting_comments: '',
    });
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

  const buildSignoffPayload = (outcome: string) => ({
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
    if (!staffProfileId) {
      toast.error('Staff profile not found');
      return;
    }
    if (!location.trim()) {
      toast.error('Please enter the assessment location');
      return;
    }

    setSaving(true);
    try {
      const payload = buildSignoffPayload('pending');

      if (existingSignoff) {
        const { error } = await supabase
          .from('bls_competency_signoffs')
          .update(payload)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bls_competency_signoffs')
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
    if (!canSignOffCompetency) {
      toast.error('You do not have permission to sign off competency');
      return;
    }
    if (!staffProfileId) {
      toast.error('Staff profile not found');
      return;
    }
    if (!location.trim()) {
      toast.error('Please enter the assessment location');
      return;
    }
    if (outcome === 'competent' && !allChecked) {
      toast.error('All checklist items must be completed to mark as competent');
      return;
    }
    if (outcome === 'not_yet_competent') {
      if (!actionPlan.trim()) {
        toast.error('Action plan is required when marking as Not Yet Competent');
        return;
      }
      if (!reassessmentDate) {
        toast.error('Reassessment date is required when marking as Not Yet Competent');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = buildSignoffPayload(outcome);

      if (existingSignoff) {
        const { error } = await supabase
          .from('bls_competency_signoffs')
          .update(payload)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bls_competency_signoffs')
          .insert(payload);
        if (error) throw error;
      }

      // Notify the learner
      const notificationTitle =
        outcome === 'competent'
          ? 'BLS Practical Assessment Passed!'
          : 'BLS Practical Assessment: Further Practice Required';

      const notificationMessage =
        outcome === 'competent'
          ? `Congratulations! You have been signed off as competent for "${courseTitle}". Your Competency Sign-off Certificate is now available.`
          : `Your BLS practical assessment for "${courseTitle}" requires further practice. Action Plan: ${actionPlan}. Reassessment scheduled for ${reassessmentDate}.`;

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
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
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
            BLS Practical Sign-off Checklist
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
            {/* Permission indicator */}
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

            {/* Progress indicator */}
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
                  {/* Comment field */}
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
              <Label htmlFor="bls-notes">Assessor Notes</Label>
              <Textarea
                id="bls-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Overall observations, areas of strength or improvement..."
                rows={3}
                disabled={!canSignOffCompetency || isAlreadySigned}
              />
            </div>

            {/* Action plan (visible when not yet competent) */}
            {canSignOffCompetency && !isAlreadySigned && (
              <div className="space-y-4 p-4 rounded-lg border border-dashed border-warning/50 bg-warning/5">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  If Not Yet Competent
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="bls-action-plan">
                    Action Plan <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="bls-action-plan"
                    value={actionPlan}
                    onChange={(e) => setActionPlan(e.target.value)}
                    placeholder="Describe areas for improvement and recommended practice..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bls-reassessment">
                    Reassessment Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bls-reassessment"
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
