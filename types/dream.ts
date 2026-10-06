// types/dream.ts
export type DreamHorizon = 'this_year' | '1_3_years' | '5_plus' | 'someday';
export type DreamStage = 'dream' | 'explored' | 'planned' | 'committed' | 'fulfilled' | 'let_go';

export type Dream = {
  id: string;
  title: string;
  emoji: string;
  color: string;
  horizon: DreamHorizon;
  target_label: string | null;
  why: string | null;
  feeling: string | null;
  obstacle: string | null;
  next_step: string | null;
  stage: DreamStage;
  last_activity_at: string;
  fulfilled_at: string | null;
  fulfilled_note: string | null;
  created_at: string;
  updated_at: string;
};

export type DreamStep = {
  id: string;
  dream_id: string;
  title: string;
  task_id: string | null;
  done_at: string | null;
  created_at: string;
};
