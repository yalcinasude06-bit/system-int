export type ModuleId = 1 | 2 | 3 | 4;

export interface Session {
  id: string;
  pin_code: string;
  title: string;
  current_module: ModuleId;
  module_stage: number;
  is_active: boolean;
  fault_injected: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  session_id: string;
  nickname: string;
  avatar: string;
  score: number;
  last_active: string;
}

export interface Submission {
  id: string;
  session_id: string;
  student_id: string;
  module_id: ModuleId;
  stage: number;
  payload: Record<string, unknown>;
  score: number;
  is_submitted: boolean;
  updated_at: string;
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
  onSubmit: (submission: ModuleSubmission) => Promise<void> | void;
  faultInjected?: boolean;
}
