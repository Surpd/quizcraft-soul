// Quiz result persistence in localStorage.
// Structured so a future Lovable Cloud swap only replaces this module.

export interface QuizResult {
  id: string;
  gameId: string;
  playerName: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  timeSec: number;
  finishedAt: number;
}

const NS = "islandquiz.v1.results";
const key = (gameId: string) => `${NS}.${gameId}`;

export function saveQuizResult(r: Omit<QuizResult, "id" | "finishedAt">): QuizResult {
  const record: QuizResult = {
    ...r,
    id: Math.random().toString(36).slice(2, 10),
    finishedAt: Date.now(),
  };
  if (typeof window === "undefined") return record;
  try {
    const list = loadQuizResults(r.gameId);
    list.push(record);
    localStorage.setItem(key(r.gameId), JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save result", err);
  }
  return record;
}

export function loadQuizResults(gameId: string): QuizResult[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key(gameId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as QuizResult[];
    return arr.sort((a, b) => b.finishedAt - a.finishedAt);
  } catch {
    return [];
  }
}

export function clearQuizResults(gameId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key(gameId));
}
