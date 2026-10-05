// types/habit.ts
export type Habit = {
  id: string;
  name: string;
  icon: string | null;
  active: boolean;
  target_per_week: number; // 7 = täglich, 1–6 = Mal pro Woche
  created_at: string;
};

export type Log = {
  id: string;
  habit_id: string;
  date: string;
  done: boolean;
  created_at: string;
};