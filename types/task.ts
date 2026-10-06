// types/task.ts
import { ChallengeCategory } from './challenge';

export type Task = {
  id: string;
  title: string;
  category: ChallengeCategory | null; // null bei Tasks, die aus einem Traum-Schritt entstanden sind
  dream_id: string | null;
  week_key: string;
  done: boolean;
  completed_at: string | null;
  created_at: string;
};
