// types/habit.ts
export type Habit = {
  id: string;
  name: string;
  icon: string | null;
  active: boolean;
  created_at: string;
};

export type Log = {
  id: string;
  habit_id: string;
  date: string;
  done: boolean;
  created_at: string;
};