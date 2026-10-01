// types/challenge.ts
export type ChallengeCategory = 'koerperlich' | 'kreativ' | 'sozial' | 'handwerklich';
export type ChallengeSize = 'micro' | 'afternoon' | 'ongoing' | 'bold';
export type ChallengeStatus = 'open' | 'active' | 'done';

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  category: ChallengeCategory;
  size: ChallengeSize;
  friend_friendly: boolean;
  active: boolean;
  is_custom: boolean;
  created_at: string;
};

export type ChallengeProgress = {
  id: string;
  challenge_id: string;
  status: ChallengeStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};
