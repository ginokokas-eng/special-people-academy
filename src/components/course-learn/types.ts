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
}
