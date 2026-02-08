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
  Eye
} from 'lucide-react';

interface CompetencySignoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

interface ChecklistItem {
  id: keyof ChecklistState;
  label: string;
  description: string;
}

interface ChecklistState {
  tube_identification: boolean;
  bolus_method: boolean;
  pump_setup: boolean;
  flushing_medication: boolean;
  routine_care: boolean;
  troubleshooting: boolean;
  documentation_standard: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'tube_identification',
    label: 'Tube Identification & Feeding Method Rules',
    description: 'Correctly identifies NG, NJ, PEG, PEG-J, and PEJ tubes and understands their specific feeding method rules',
  },
  {
    id: 'bolus_method',
    label: 'Bolus Method (Gravity + Syringe Push-Pull)',
    description: 'Demonstrates correct bolus feeding technique using gravity method and syringe push-pull method',
  },
  {
    id: 'pump_setup',
    label: 'Pump Setup Basics',
    description: 'Can prime line, prevent free-flow, and set prescribed rate correctly on feeding pump',
  },
  {
    id: 'flushing_medication',
    label: 'Safe Flushing & Medication Sequencing',
    description: 'Demonstrates correct flushing technique and safe medication administration sequencing',
  },
  {
    id: 'routine_care',
    label: 'Routine Care (Clean/Dry; Rotation Rules)',
    description: 'Understands daily care requirements including keeping site clean/dry and knows rotation rules (including PEJ/PEG-J exceptions)',
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting Scenarios',
    description: 'Can identify and respond appropriately to: blockage, dislodgement, aspiration symptoms, and infection signs',
  },
  {
    id: 'documentation_standard',
    label: 'Documentation Standard Met',
    description: 'Demonstrates accurate and complete documentation of feeding administration and any incidents',
  },
];

export function CompetencySignoffDialog({
  open,
  onOpenChange,
  learnerId,
  learnerName,
  courseId,
  courseTitle,
  onSuccess,
}: CompetencySignoffDialogProps) {
  const { user } = useAuth();
  const { canSignOffCompetency } = useRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingSignoff, setExistingSignoff] = useState<any>(null);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);
  
  const [checklist, setChecklist] = useState<ChecklistState>({
    tube_identification: false,
    bolus_method: false,
    pump_setup: false,
    flushing_medication: false,
    routine_care: false,
    troubleshooting: false,
    documentation_standard: false,
  });
  
  const [notes, setNotes] = useState('');

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

      // Check for existing sign-off record
      const { data: signoffData, error } = await supabase
        .from('competency_signoffs')
        .select('*')
        .eq('user_id', learnerId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (signoffData) {
        setExistingSignoff(signoffData);
        setChecklist({
          tube_identification: signoffData.tube_identification || false,
          bolus_method: signoffData.bolus_method || false,
          pump_setup: signoffData.pump_setup || false,
          flushing_medication: signoffData.flushing_medication || false,
          routine_care: signoffData.routine_care || false,
          troubleshooting: signoffData.troubleshooting || false,
          documentation_standard: signoffData.documentation_standard || false,
        });
        setNotes(signoffData.assessor_notes || '');
      } else {
        // Reset form for new sign-off
        setExistingSignoff(null);
        setChecklist({
          tube_identification: false,
          bolus_method: false,
          pump_setup: false,
          flushing_medication: false,
          routine_care: false,
          troubleshooting: false,
          documentation_standard: false,
        });
        setNotes('');
      }
    } catch (error) {
      console.error('Error fetching sign-off data:', error);
      toast.error('Failed to load sign-off data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (id: keyof ChecklistState, checked: boolean) => {
    if (!canSignOffCompetency) return;
    setChecklist(prev => ({ ...prev, [id]: checked }));
  };

  const handleSaveProgress = async () => {
    if (!staffProfileId) {
      toast.error('Staff profile not found');
      return;
    }

    setSaving(true);
    try {
      const signoffData = {
        user_id: learnerId,
        course_id: courseId,
        assessor_id: staffProfileId,
        ...checklist,
        assessor_notes: notes || null,
        outcome: 'pending' as const,
        updated_at: new Date().toISOString(),
      };

      if (existingSignoff) {
        const { error } = await supabase
          .from('competency_signoffs')
          .update(signoffData)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('competency_signoffs')
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

    if (outcome === 'competent' && !allChecked) {
      toast.error('All checklist items must be completed to mark as competent');
      return;
    }

    if (outcome === 'not_yet_competent' && !notes.trim()) {
      toast.error('Notes are required when marking as not yet competent');
      return;
    }

    setSaving(true);
    try {
      const signoffData = {
        user_id: learnerId,
        course_id: courseId,
        assessor_id: staffProfileId,
        ...checklist,
        assessor_notes: notes || null,
        outcome,
        signed_off_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingSignoff) {
        const { error } = await supabase
          .from('competency_signoffs')
          .update(signoffData)
          .eq('id', existingSignoff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('competency_signoffs')
          .insert(signoffData);
        if (error) throw error;
      }

      // Send notification to learner
      const notificationTitle = outcome === 'competent' 
        ? 'Competency Assessment Passed!'
        : 'Competency Assessment: Further Practice Required';
      
      const notificationMessage = outcome === 'competent'
        ? `Congratulations! You have been signed off as competent for "${courseTitle}". Your Competency Sign-off Certificate is now available.`
        : `Your competency assessment for "${courseTitle}" requires further practice. Assessor notes: ${notes}. Please arrange another practical session.`;

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
          // Call edge function to issue competency certificate
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
          : 'Assessment saved - learner notified'
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Competency Sign-off Checklist
          </DialogTitle>
          <DialogDescription>
            {learnerName} • {courseTitle}
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
                  You can view this checklist but cannot sign off competency. Only authorized assessors (Tamar or Marina) can complete sign-offs.
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

            {/* Progress indicator */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Checklist Progress
              </span>
              <Badge variant={allChecked ? 'default' : 'secondary'}>
                {checkedCount} / {CHECKLIST_ITEMS.length} Complete
              </Badge>
            </div>

            <Separator />

            {/* Checklist items */}
            <div className="space-y-4">
              {CHECKLIST_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                    checklist[item.id]
                      ? 'bg-success/5 border-success/30'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <Checkbox
                    id={item.id}
                    checked={checklist[item.id]}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange(item.id, checked as boolean)
                    }
                    disabled={!canSignOffCompetency || isAlreadySigned}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={item.id}
                      className={`font-medium cursor-pointer ${
                        checklist[item.id] ? 'text-success' : ''
                      }`}
                    >
                      {item.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  {checklist[item.id] && (
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Assessor Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any observations, areas of strength, or areas for improvement..."
                rows={4}
                disabled={!canSignOffCompetency || isAlreadySigned}
              />
              <p className="text-xs text-muted-foreground">
                Required if marking as "Not Yet Competent"
              </p>
            </div>
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
