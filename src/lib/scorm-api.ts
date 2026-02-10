/**
 * SCORM 1.2 API Adapter
 * Exposes window.API for SCORM 1.2 content
 */

import { supabase } from '@/integrations/supabase/client';

type ScormData = Record<string, string>;

interface ScormApiOptions {
  registrationId: string;
  onStatusChange?: (status: string) => void;
  onComplete?: () => void;
}

export class ScormApiAdapter {
  private data: ScormData = {};
  private initialized = false;
  private finished = false;
  private lastError = '0';
  private registrationId: string;
  private onStatusChange?: (status: string) => void;
  private onComplete?: () => void;
  private dirty = false;

  constructor(options: ScormApiOptions) {
    this.registrationId = options.registrationId;
    this.onStatusChange = options.onStatusChange;
    this.onComplete = options.onComplete;
  }

  // Load existing data from DB
  async loadSavedData(registration: {
    lesson_location?: string | null;
    suspend_data?: string | null;
    score?: number | null;
    total_time_seconds?: number | null;
    status?: string;
  }) {
    if (registration.lesson_location) {
      this.data['cmi.core.lesson_location'] = registration.lesson_location;
    }
    if (registration.suspend_data) {
      this.data['cmi.suspend_data'] = registration.suspend_data;
    }
    if (registration.score != null) {
      this.data['cmi.core.score.raw'] = String(registration.score);
    }
    if (registration.total_time_seconds != null) {
      this.data['cmi.core.total_time'] = this.secondsToScormTime(registration.total_time_seconds);
    }
    // Map our status to SCORM status
    const statusMap: Record<string, string> = {
      not_attempted: 'not attempted',
      in_progress: 'incomplete',
      completed: 'completed',
      passed: 'passed',
      failed: 'failed',
    };
    this.data['cmi.core.lesson_status'] = statusMap[registration.status || 'not_attempted'] || 'not attempted';
    this.data['cmi.core.entry'] = registration.lesson_location ? 'resume' : 'ab-initio';
    this.data['cmi.core.credit'] = 'credit';
    this.data['cmi.core.lesson_mode'] = 'normal';
  }

  // Install on window
  install() {
    (window as any).API = {
      LMSInitialize: this.LMSInitialize.bind(this),
      LMSFinish: this.LMSFinish.bind(this),
      LMSGetValue: this.LMSGetValue.bind(this),
      LMSSetValue: this.LMSSetValue.bind(this),
      LMSCommit: this.LMSCommit.bind(this),
      LMSGetLastError: this.LMSGetLastError.bind(this),
      LMSGetErrorString: this.LMSGetErrorString.bind(this),
      LMSGetDiagnostic: this.LMSGetDiagnostic.bind(this),
    };
  }

  uninstall() {
    delete (window as any).API;
  }

  LMSInitialize(_param: string = ''): string {
    if (this.initialized) {
      this.lastError = '101'; // already initialized
      return 'false';
    }
    this.initialized = true;
    this.finished = false;
    this.lastError = '0';
    console.log('[SCORM] LMSInitialize');
    return 'true';
  }

  LMSFinish(_param: string = ''): string {
    if (!this.initialized) {
      this.lastError = '301'; // not initialized
      return 'false';
    }
    // Auto-commit on finish
    this.persistToDb();
    this.initialized = false;
    this.finished = true;
    this.lastError = '0';
    console.log('[SCORM] LMSFinish');
    return 'true';
  }

  LMSGetValue(key: string): string {
    if (!this.initialized) {
      this.lastError = '301';
      return '';
    }
    this.lastError = '0';
    const val = this.data[key] || '';
    console.log(`[SCORM] LMSGetValue("${key}") = "${val}"`);
    return val;
  }

  LMSSetValue(key: string, value: string): string {
    if (!this.initialized) {
      this.lastError = '301';
      return 'false';
    }
    this.lastError = '0';
    this.data[key] = value;
    this.dirty = true;
    console.log(`[SCORM] LMSSetValue("${key}", "${value}")`);

    // Track status changes
    if (key === 'cmi.core.lesson_status') {
      this.onStatusChange?.(value);
    }

    return 'true';
  }

  LMSCommit(_param: string = ''): string {
    if (!this.initialized) {
      this.lastError = '301';
      return 'false';
    }
    this.lastError = '0';
    this.persistToDb();
    console.log('[SCORM] LMSCommit');
    return 'true';
  }

  LMSGetLastError(): string {
    return this.lastError;
  }

  LMSGetErrorString(code: string): string {
    const errors: Record<string, string> = {
      '0': 'No error',
      '101': 'General exception',
      '201': 'Invalid argument error',
      '202': 'Element cannot have children',
      '203': 'Element not an array',
      '301': 'Not initialized',
      '401': 'Not implemented error',
      '402': 'Invalid set value',
      '403': 'Element is read only',
      '404': 'Element is write only',
    };
    return errors[code] || 'Unknown error';
  }

  LMSGetDiagnostic(code: string): string {
    return this.LMSGetErrorString(code);
  }

  // Force commit (called on exit)
  async forceCommit() {
    if (this.dirty || this.initialized) {
      await this.persistToDb();
    }
  }

  private async persistToDb() {
    try {
      const lessonStatus = this.data['cmi.core.lesson_status'] || '';
      const scoreRaw = this.data['cmi.core.score.raw'];
      const sessionTime = this.data['cmi.core.session_time'];
      const lessonLocation = this.data['cmi.core.lesson_location'];
      const suspendData = this.data['cmi.suspend_data'];

      // Map SCORM status to our enum
      let dbStatus: string = 'in_progress';
      if (lessonStatus === 'completed') dbStatus = 'completed';
      else if (lessonStatus === 'passed') dbStatus = 'passed';
      else if (lessonStatus === 'failed') dbStatus = 'failed';
      else if (lessonStatus === 'not attempted') dbStatus = 'not_attempted';
      else dbStatus = 'in_progress';

      const updateData: Record<string, any> = {
        status: dbStatus,
        last_commit_at: new Date().toISOString(),
      };

      if (scoreRaw) updateData.score = parseFloat(scoreRaw);
      if (lessonLocation) updateData.lesson_location = lessonLocation;
      if (suspendData) updateData.suspend_data = suspendData;
      if (sessionTime) {
        const existingSeconds = await this.getExistingTotalTime();
        const sessionSeconds = this.scormTimeToSeconds(sessionTime);
        updateData.total_time_seconds = existingSeconds + sessionSeconds;
      }

      const { error } = await supabase
        .from('scorm_registrations')
        .update(updateData)
        .eq('id', this.registrationId);

      if (error) {
        console.error('[SCORM] DB persist error:', error);
      } else {
        this.dirty = false;
        // Check for completion
        if (dbStatus === 'completed' || dbStatus === 'passed') {
          this.onComplete?.();
        }
      }
    } catch (err) {
      console.error('[SCORM] Persist error:', err);
    }
  }

  private async getExistingTotalTime(): Promise<number> {
    const { data } = await supabase
      .from('scorm_registrations')
      .select('total_time_seconds')
      .eq('id', this.registrationId)
      .single();
    return data?.total_time_seconds || 0;
  }

  private scormTimeToSeconds(scormTime: string): number {
    // Format: HH:MM:SS or HHHH:MM:SS.SS
    const parts = scormTime.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + Math.round(seconds);
  }

  private secondsToScormTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(4, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
