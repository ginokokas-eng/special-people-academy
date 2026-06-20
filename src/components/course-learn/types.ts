export interface LearnLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  lesson_type: string;
  module_id: string | null;
  scorm_package_id: string | null;
  completed?: boolean;
  /** Number of authored questions when lesson_type === 'quiz'. */
  question_count?: number;
}

export interface LearnModule {
  id: string;
  title: string;
  order_index: number;
}

export interface LearnResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  order_index: number;
  lesson_id: string | null;
}

export interface LearnCourse {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  overview: string | null;
  has_certificate: boolean | null;
  requires_practical_signoff: boolean | null;
  practical_details: string | null;
  certificate_details: string | null;
  scope_notes: string | null;
  learning_outcomes: string[] | null;
}


export interface LessonVideoSource {
  id: string;
  lesson_id: string;
  quality_label: string;
  source_url: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  is_default: boolean;
}

export interface TranscriptSegment {
  start: number; // seconds
  end?: number;
  text: string;
}

export interface LessonTranscript {
  id: string;
  lesson_id: string;
  language_code: string;
  language_label: string;
  transcript_text: string | null;
  vtt_url: string | null;
  segments: TranscriptSegment[] | null;
}

/** Imperative bridge so tabs (notes, transcript) can drive the active video. */
export interface MediaController {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  isAvailable: () => boolean;
}
