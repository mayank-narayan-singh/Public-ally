export interface Leader {
  id: string;
  name: string;
  city: string;
  points: number;
}

export interface CivicReport {
  id: string;
  imageUrl: string;
  category: string;
  city: string;
  leaderName: string;
  status: string; // e.g. "Reported"
  timestamp: number;
}

export type Screen = "REPORT" | "FEED" | "LEADERBOARD";
