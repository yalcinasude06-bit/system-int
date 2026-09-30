export type ModuleId = 1 | 2 | 3 | 4 | 5;

export interface Session {
  id: string;
  pin_code: string;
  title: string;
  selected_week: number;
  current_module: ModuleId;
  module_stage: number;
  is_module_started: boolean;
  module_started_at: string | null;
  is_active: boolean;
  fault_injected: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  session_id: string;
  student_number: string;
  nickname: string;
  avatar: string;
  score: number;
  session_score: number;
  joined_at: string;
  last_active: string;
}

export interface StudentProfile {
  student_number: string;
  full_name: string;
  total_score: number;
  created_at: string;
  last_seen: string;
}

export interface Submission {
  id: string;
  session_id: string;
  student_id: string;
  student_number: string;
  week_id: number;
  module_id: ModuleId;
  stage: number;
  payload: Record<string, unknown>;
  score: number;
  is_submitted: boolean;
  updated_at: string;
  submitted_at: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapElement {
  id: string;
  name: string;
  type: "internal" | "direct_env" | "indirect_env";
  position: Point;
  icon: string;
}

export interface ModuleSubmission {
  payload: Record<string, unknown>;
  score: number;
  stage?: number;
}

export interface LearningModuleProps {
  onSubmit: (submission: ModuleSubmission) => Promise<boolean | void> | boolean | void;
  faultInjected?: boolean;
  existingSubmission?: Submission | null;
  forceSubmit?: boolean;
}
