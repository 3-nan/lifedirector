// types/monthlyGoal.ts
export type MonthlyGoal = {
  id: string;
  title: string;
  month_key: string;
  done: boolean;
  completed_at: string | null;
  created_at: string;
};
