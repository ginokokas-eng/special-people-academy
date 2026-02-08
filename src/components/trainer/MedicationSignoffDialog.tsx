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
  MapPin
} from 'lucide-react';
import { MedicationChecklistSection } from './medication-signoff/MedicationChecklistSection';
import { MedicationActionPlanSection } from './medication-signoff/MedicationActionPlanSection';

interface MedicationSignoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

export interface ChecklistSection {
  id: string;
  label: string;
  description: string;
  checkField: keyof ChecklistState;
  commentField: keyof CommentsState;
}

export interface ChecklistState {
  pre_admin_checks: boolean;
  communication: boolean;
  admin_process: boolean;
  mar_documentation: boolean;
  refusal_handling: boolean;
  prn_handling: boolean;
  storage_awareness: boolean;
  incident_escalation: boolean;
}

export interface CommentsState {
  pre_admin_checks_comments: string;
  communication_comments: string;
  admin_process_comments: string;
  mar_documentation_comments: string;
  refusal_handling_comments: string;
  prn_handling_comments: string;
  storage_awareness_comments: string;
  incident_escalation_comments: string;
}

const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'pre_admin_checks',
    label: '1. Pre-Administration Checks',
    description: 'Right person verified, MAR match confirmed, allergies noted, expiry checked, hygiene/PPE appropriate',
    checkField: 'pre_admin_checks',
    commentField: 'pre_admin_checks_comments',
  },
  {
    id: 'communication',
    label: '2. Communication with the Person',
    description: 'Obtained consent, maintained dignity, identified and accommodated support needs',
    checkField: 'communication',
    commentField: 'communication_comments',
  },
  {
    id: 'admin_process',
    label: '3. Administration Process',
    description: 'Policy-led approach, no dosing advice given, follows MAR exactly, safe technique appropriate to setting',
    checkField: 'admin_process',
    commentField: 'admin_process_comments',
  },
  {
    id: 'mar_documentation',
    label: '4. MAR Documentation',
    description: 'Completed correctly with time, initials/signature, and appropriate notes',
    checkField: 'mar_documentation',
    commentField: 'mar_documentation_comments',
  },
  {
    id: 'refusal_handling',
    label: '5. Refusal/Omission Scenario',
    description: 'Handled correctly – does not conceal, records accurately, and escalates as required',
    checkField: 'refusal_handling',
    commentField: 'refusal_handling_comments',
  },
  {
    id: 'prn_handling',
    label: '6. PRN Scenario',
    description: 'Checks criteria met, records reason and outcome, observes for effect',
    checkField: 'prn_handling',
    commentField: 'prn_handling_comments',
  },
  {
    id: 'storage_awareness',
    label: '7. Storage/Keys/Fridge Awareness',
    description: 'Demonstrates understanding of secure storage principles and temperature requirements',
    checkField: 'storage_awareness',
    commentField: 'storage_awareness_comments',
  },
  {
    id: 'incident_escalation',
    label: '8. Incident/Escalation Scenario',
    description: 'Knows who to contact and what to document in an incident or emergency',
    checkField: 'incident_escalation',
    commentField: 'incident_escalation_comments',
  },
];

export function MedicationSignoffDialog({
  open,
  onOpenChange,
  learnerId,
  learnerName,
  courseId,
  courseTitle,
  onSuccess,
}: MedicationSignoffDialogProps) {
  const { user } = useAuth();
  const { canSignOffCompetency } = useRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingSignoff, setExistingSignoff] = useState<any>(null);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  
  const [checklist, setChecklist] = useState<ChecklistState>({
    pre_admin_checks: false,
    communication: false,
    admin_process: false,
    mar_documentation: false,
    refusal_handling: false,
    prn_handling: false,
    storage_awareness: false,
    incident_escalation: false,
  });
  
  const [comments, setComments] = useState<CommentsState>({
    pre_admin_checks_comments: '',
    communication_comments: '',
    admin_process_comments: '',
    mar_documentation_comments: '',
    refusal_handling_comments: '',
    prn_handling_comments: '',
    storage_awareness_comments: '',
    incident_escalation_comments: '',
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
      // Get staff profile ID for the current user
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      setStaffProfileId(staffData?.id || null);

      // Get the latest attempt number for this learner/course
      const { data: latestAttempt } = await supabase
        .from('medication_competency_signoffs')
        .select('attempt_number, outcome')
        .eq('user_id', learnerId)
        .eq('course_id', courseId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentAttempt = 1;
      let signoffData = null;

      if (latestAttempt) {
        if (latestAttempt.outcome === 'competent') {
          // Already competent, show that record
          currentAttempt = latestAttempt.attempt_number;
        } else if (latestAttempt.outcome === 'not_yet_competent') {
          // Start a new attempt
          currentAttempt = latestAttempt.attempt_number + 1;
        } else {
          // Pending - continue with current attempt
          currentAttempt = latestAttempt.attempt_number;
        }

        // Fetch the current attempt data
        const { data } = await supabase
          .from('medication_competency_signoffs')
          .select('*')
          .eq('user_id', learnerId)
          .eq('course_id', courseId)
          .eq('attempt_number', currentAttempt)
          .maybeSingle();
        
        signoffData = data;
      }

      setAttemptNumber(currentAttempt);

      if (signoffData) {
        setExistingSignoff(signoffData);
        setChecklist({
          pre_admin_checks: signoffData.pre_admin_checks || false,
          communication: signoffData.communication || false,
          admin_process: signoffData.admin_process || false,
          mar_documentation: signoffData.mar_documentation || false,
          refusal_handling: signoffData.refusal_handling || false,
          prn_handling: signoffData.prn_handling || false,
          storage_awareness: signoffData.storage_awareness || false,
          incident_escalation: signoffData.incident_escalation || false,
        });
        setComments({
          pre_admin_checks_comments: signoffData.pre_admin_checks_comments || '',
          communication_comments: signoffData.communication_comments || '',
          admin_process_comments: signoffData.admin_process_comments || '',
          mar_documentation_comments: signoffData.mar_documentation_comments || '',
          refusal_handling_comments: signoffData.refusal_handling_comments || '',
          prn_handling_comments: signoffData.prn_handling_comments || '',
          storage_awareness_comments: signoffData.storage_awareness_comments || '',
          incident_escalation_comments: signoffData.incident_escalation_comments || '',
        });
        setLocation(signoffData.location || '');
        setNotes(signoffData.assessor_notes || '');
        setActionPlan(signoffData.action_plan || '');
        setReassessmentDate(signoffData.reassessment_date || '');
      } else {
        // Reset form for new sign-off
        resetForm();
      }
    } catch (error) {
      console.error('Error fetching sign-off data:', error);
      toast.error('Failed to load sign-off data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExistingSignoff(null);
    setChecklist({
      pre_admin_checks: false,
      communication: false,
      admin_process: false,
      mar_documentation: false,
      refusal_handling: false,
      prn_handling: false,
      storage_awareness: false,
      incident_escalation: false,
    });
    setComments({
      pre_admin_checks_comments: '',
      communication_comments: '',
      admin_process_comments: '',
      mar_documentation_comments: '',
      refusal_handling_comments: '',
      prn_handling_comments: '',
      storage_awareness_comments: '',
      incident_escalation_comments: '',
    });
    setLocation('');
    setNotes('');
    setActionPlan('');
    setReassessmentDate('');
  };

  const handleCheckboxChange = (field: keyof ChecklistState, checked: boolean) => {
    if (!canSignOffCompetency) return;
    setChecklist(prev => ({ ...prev, [field]: checked }));
  };

  const handleCommentChange = (field: keyof CommentsState, value: string) => {
    if (!canSignOffCompetency) return;
    setComments(prev => ({ ...prev, [field]: value }));
  };

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
      const signoffData = {
        user_id: learnerId,
        course_id: courseId,
        assessor_id: staffProfileId,
        attempt_number: attemptNumber,
        location,
        ...checklist,
        ...comments,
        assessor_notes: notes || null,
        outcome: 'pending' as const,
        updated_at: new Date().toISOString(),
      };

      if (existingSignoff) {
        const { error } = await supabase
          .from('medication_competency_signoffs')
          .update(signoffData)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('medication_competency_signoffs')
          .insert(signoffData);
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
        toast.error('Action plan is required when marking as not yet competent');
        return;
      }
      if (!reassessmentDate) {
        toast.error('Reassessment date is required when marking as not yet competent');
        return;
      }
    }

    setSaving(true);
    try {
      const signoffData = {
        user_id: learnerId,
        course_id: courseId,
        assessor_id: staffProfileId,
        attempt_number: attemptNumber,
        location,
        ...checklist,
        ...comments,
        assessor_notes: notes || null,
        action_plan: outcome === 'not_yet_competent' ? actionPlan : null,
        reassessment_date: outcome === 'not_yet_competent' ? reassessmentDate : null,
        outcome,
        assessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingSignoff) {
        const { error } = await supabase
          .from('medication_competency_signoffs')
          .update(signoffData)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('medication_competency_signoffs')
          .insert(signoffData);
        if (error) throw error;
      }

      // Send notification to learner
      const notificationTitle = outcome === 'competent' 
        ? 'Medication Competency Assessment Passed!'
        : 'Medication Competency: Further Practice Required';
      
      const notificationMessage = outcome === 'competent'
        ? `Congratulations! You have been signed off as competent for "${courseTitle}". Your Competency Sign-off Certificate is now available.`
        : `Your medication competency assessment for "${courseTitle}" requires further practice. Action Plan: ${actionPlan}. Reassessment scheduled for ${reassessmentDate}.`;

      await supabase
        .from('learner_notifications')
        .insert({
          user_id: learnerId,
          title: notificationTitle,
          message: notificationMessage,
          related_course_id: courseId,
        });

      // If competent, trigger certificate generation
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
            Medication Administration – Practical Sign-off
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
                  You can view and check this form but cannot submit the final sign-off. Only authorized assessors (Tamar or Marina) can complete sign-offs.
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
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Assessment Location *
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Care Home Name, Training Centre"
                  disabled={!canSignOffCompetency || isAlreadySigned}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Assessment Date
                </Label>
                <Input
                  value={new Date().toLocaleDateString('en-GB')}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Checklist Progress
              </span>
              <Badge variant={allChecked ? 'default' : 'secondary'}>
                {checkedCount} / {CHECKLIST_SECTIONS.length} Complete
              </Badge>
            </div>

            <Separator />

            {/* Checklist sections */}
            <div className="space-y-4">
              {CHECKLIST_SECTIONS.map((section) => (
                <MedicationChecklistSection
                  key={section.id}
                  section={section}
                  checked={checklist[section.checkField]}
                  comment={comments[section.commentField]}
                  onCheckChange={(checked) => handleCheckboxChange(section.checkField, checked)}
                  onCommentChange={(value) => handleCommentChange(section.commentField, value)}
                  disabled={!canSignOffCompetency || isAlreadySigned}
                />
              ))}
            </div>

            <Separator />

            {/* General notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Assessor Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any general observations, areas of strength, or additional comments..."
                rows={3}
                disabled={!canSignOffCompetency || isAlreadySigned}
              />
            </div>

            {/* Action plan section - only shown when needed */}
            <MedicationActionPlanSection
              actionPlan={actionPlan}
              reassessmentDate={reassessmentDate}
              onActionPlanChange={setActionPlan}
              onReassessmentDateChange={setReassessmentDate}
              disabled={!canSignOffCompetency || isAlreadySigned}
              isVisible={!isAlreadySigned && canSignOffCompetency}
            />
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          {canSignOffCompetency && !isAlreadySigned && (
            <>
              <Button
                variant="outline"
                onClick={handleSaveProgress}
                disabled={saving}
              >
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
