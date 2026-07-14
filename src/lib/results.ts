// Quiz result persistence in localStorage.
// Structured so a future Lovable Cloud swap only replaces this module.

export interface QuizAnswerDetail {
  qId: string;
  question: string;
  given: string;
  correctAnswer: string;
  isCorrect: boolean;
  earned: number;
  points: number;
}

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
  answers?: QuizAnswerDetail[];
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

// ============= Online quiz results (multiplayer rooms) =============

export interface OnlineQuizPlayerAnswer {
  questionIdx: number;
  question: string;
  given: string;
  correctAnswer: string;
  correct: boolean;
  earned: number;
  points: number;
  timeMs: number;
}

export interface OnlineQuizPlayerResult {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  answers: OnlineQuizPlayerAnswer[];
}

export interface OnlineQuizResult {
  id: string;
  roomCode: string;
  gameId: string;
  playedAt: number;
  durationSec: number;
  players: OnlineQuizPlayerResult[];
}

const ONLINE_KEY = (gameId: string) => `islandquiz.v1.online-results.${gameId}`;

export function saveOnlineQuizResult(
  input: Omit<OnlineQuizResult, "id" | "playedAt">,
): OnlineQuizResult {
  const rec: OnlineQuizResult = {
    ...input,
    id: Math.random().toString(36).slice(2, 10),
    playedAt: Date.now(),
  };
  if (typeof window === "undefined") return rec;
  try {
    const list = loadOnlineQuizResults(input.gameId);
    list.push(rec);
    localStorage.setItem(ONLINE_KEY(input.gameId), JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save online result", err);
  }
  return rec;
}

export function loadOnlineQuizResults(gameId: string): OnlineQuizResult[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ONLINE_KEY(gameId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as OnlineQuizResult[];
    return arr.sort((a, b) => b.playedAt - a.playedAt);
  } catch {
    return [];
  }
}
