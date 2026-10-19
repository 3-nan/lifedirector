// types/chore.ts
export type ChoreStatus = 'open' | 'done' | 'let_go';

export type Chore = {
  id: string;
  title: string;
  status: ChoreStatus;
  /** YYYY-MM-DD; schließt `due_week` aus. */
  due_date: string | null;
  /** ISO-Woche, z.B. "2026-W43"; beides leer = Irgendwann. */
  due_week: string | null;
  remind_at: string | null;
  plan_note: string | null;
  postponed_count: number;
  parent_id: string | null;
  done_at: string | null;
  let_go_at: string | null;
  last_decided_at: string | null;
  created_at: string;
  updated_at: string;
};
