// types/task.ts
import { ChallengeCategory } from './challenge';

export type Task = {
  id: string;
  title: string;
  category: ChallengeCategory;
  week_key: string;
  done: boolean;
  completed_at: string | null;
  created_at: string;
};
