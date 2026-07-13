// src/lib/api.ts — единая точка входа для всех данных (TZ v2.0 §10, §11).
// Сейчас работает поверх localStorage + BroadcastChannel (кросс-вкладочная
// синхронизация комнат). Легко заменяется на FastAPI + WebSocket без правок
// в UI: сохраняется контракт функций и форма возвращаемых Promise.

import {
  saveGame as _saveGame,
  loadGame as _loadGame,
  listGames as _listGames,
  deleteGame as _deleteGame,
  newId,
} from "./storage";
import { saveQuizResult, loadQuizResults } from "./results";
import {
  saveJeopardyResult,
  loadJeopardyResults,
  type JeopardyResult,
} from "./jeopardy-results";
import type {
  GameKind,
  JeopardyData,
  MillionaireData,
  QuizData,
  StoredGame,
} from "./types";

// ---------- Fake latency helper ----------
const fake = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// ---------- Games ----------
export type AnyGameData = QuizData | JeopardyData | MillionaireData;

export interface SaveGameInput<T = AnyGameData> {
  id?: string;
  kind: GameKind;
  data: T;
  title?: string;
}

export async function saveGame<T = AnyGameData>(input: SaveGameInput<T>) {
  const id = input.id ?? newId();
  _saveGame<T>(input.kind, id, input.data);
  return fake({ id, play_url: `/play/${input.kind}/${id}` });
}

export async function loadGame<T = AnyGameData>(kind: GameKind, id: string) {
  const rec = _loadGame<T>(kind, id);
  return fake(rec);
}

export async function listGames(kind?: GameKind): Promise<StoredGame[]> {
  return fake(_listGames(kind));
}

export async function findGame(id: string): Promise<StoredGame | null> {
  const all = _listGames();
  const g = all.find((x) => x.id === id) ?? null;
  if (!g) return fake(null);
  const d = g.data as { config?: unknown; rounds?: unknown; questions?: unknown } | undefined;
  if (!d || !d.config) return fake(null);
  if (g.kind === "jeopardy" && !Array.isArray(d.rounds)) {
    (d as { rounds: unknown[] }).rounds = [];
  }
  if ((g.kind === "quiz" || g.kind === "millionaire") && !Array.isArray(d.questions)) {
    (d as { questions: unknown[] }).questions = [];
  }
  return fake(g);
}


export async function deleteGame(kind: GameKind, id: string) {
  _deleteGame(kind, id);
  return fake({ ok: true });
}

// ---------- Results (per-quiz dashboard) ----------
export async function getResults(gameId: string) {
  return fake(loadQuizResults(gameId));
}

export async function submitResult(payload: Parameters<typeof saveQuizResult>[0]) {
  saveQuizResult(payload);
  return fake({ ok: true });
}

// ---------- Jeopardy results ----------
// TODO(server): заменить на GET /api/jeopardy/:gameId/results
export async function getJeopardyResults(gameId: string): Promise<JeopardyResult[]> {
  return fake(loadJeopardyResults(gameId));
}

// TODO(server): заменить на GET /api/jeopardy/:gameId/results/:resultId
export async function getJeopardyGameDetail(
  gameId: string,
  resultId: string,
): Promise<JeopardyResult | null> {
  const all = loadJeopardyResults(gameId);
  return fake(all.find((r) => r.id === resultId) ?? null);
}

// TODO(server): заменить на POST /api/jeopardy/:gameId/results
export async function submitJeopardyResult(
  payload: Parameters<typeof saveJeopardyResult>[0],
) {
  const rec = saveJeopardyResult(payload);
  return fake({ ok: true, id: rec.id });
}


// ---------- Online rooms (Sync Mode, TZ §3) ----------
// Хранение: localStorage + BroadcastChannel("islandquiz.room.<code>").
// Заменяется на WebSocket без изменения UI.

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  connected: boolean;
  lastAnswer?: {
    questionIdx: number;
    correct: boolean;
    delta: number;
    timeMs: number;
  };
}

export type RoomStatus = "waiting" | "active" | "reveal" | "leaderboard" | "finished";

export interface RoomState {
  code: string;
  gameKind: GameKind;
  gameId: string;
  hostId: string;
  status: RoomStatus;
  questionIdx: number;
  questionStartAt: number | null;
  players: RoomPlayer[];
  fastestPlayerId?: string;
  createdAt: number;
}

const ROOM_PREFIX = "islandquiz.room.v1.";
const roomKey = (code: string) => ROOM_PREFIX + code;

function readRoom(code: string): RoomState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(roomKey(code));
  return raw ? (JSON.parse(raw) as RoomState) : null;
}

function writeRoom(state: RoomState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(roomKey(state.code), JSON.stringify(state));
  try {
    new BroadcastChannel("islandquiz.rooms").postMessage({ code: state.code });
  } catch { /* ignore */ }
}

export function subscribeRoom(code: string, handler: (s: RoomState) => void) {
  if (typeof window === "undefined") return () => {};
  const push = () => {
    const s = readRoom(code);
    if (s) handler(s);
  };
  push();
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel("islandquiz.rooms");
    bc.onmessage = (e) => {
      if (e.data?.code === code) push();
    };
  } catch { /* ignore */ }
  const onStorage = (e: StorageEvent) => {
    if (e.key === roomKey(code)) push();
  };
  window.addEventListener("storage", onStorage);
  const interval = window.setInterval(push, 1000);
  return () => {
    bc?.close();
    window.removeEventListener("storage", onStorage);
    window.clearInterval(interval);
  };
}

export async function createRoom(gameKind: GameKind, gameId: string) {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const state: RoomState = {
    code,
    gameKind,
    gameId,
    hostId: newId(),
    status: "waiting",
    questionIdx: 0,
    questionStartAt: null,
    players: [],
    createdAt: Date.now(),
  };
  writeRoom(state);
  return fake({ code, room_url: `/room/${code}` });
}

export async function joinRoom(code: string, nickname: string, avatar: string) {
  const state = readRoom(code);
  if (!state) return fake({ success: false as const, error: "Комната не найдена" });
  // Reconnect: match by nickname (TZ §3 reconnection)
  let player = state.players.find((p) => p.nickname === nickname);
  if (player) {
    player.connected = true;
    player.avatar = avatar || player.avatar;
  } else {
    player = {
      id: newId(),
      nickname,
      avatar,
      score: 0,
      streak: 0,
      connected: true,
    };
    state.players.push(player);
  }
  writeRoom(state);
  return fake({ success: true as const, player_id: player.id });
}

export async function getRoomState(code: string) {
  return fake(readRoom(code));
}

// Teacher controls
export async function startRoom(code: string) {
  const s = readRoom(code); if (!s) return fake(null);
  s.status = "active"; s.questionIdx = 0; s.questionStartAt = Date.now();
  s.players.forEach((p) => { p.lastAnswer = undefined; });
  writeRoom(s); return fake(s);
}
export async function revealAnswer(code: string) {
  const s = readRoom(code); if (!s) return fake(null);
  s.status = "reveal";
  // fastest badge
  const answered = s.players.filter((p) => p.lastAnswer?.questionIdx === s.questionIdx && p.lastAnswer.correct);
  const fastest = answered.sort((a, b) => (a.lastAnswer!.timeMs - b.lastAnswer!.timeMs))[0];
  s.fastestPlayerId = fastest?.id;
  writeRoom(s); return fake(s);
}
export async function showLeaderboard(code: string) {
  const s = readRoom(code); if (!s) return fake(null);
  s.status = "leaderboard"; writeRoom(s); return fake(s);
}
export async function nextQuestion(code: string) {
  const s = readRoom(code); if (!s) return fake(null);
  s.questionIdx += 1; s.status = "active"; s.questionStartAt = Date.now();
  s.fastestPlayerId = undefined;
  writeRoom(s); return fake(s);
}
export async function finishRoom(code: string) {
  const s = readRoom(code); if (!s) return fake(null);
  s.status = "finished"; writeRoom(s); return fake(s);
}

// Kahoot-style scoring (TZ §0)
export function computeKahootScore(opts: {
  correct: boolean;
  timeMs: number;
  totalMs: number;
  streakBefore: number;
}) {
  if (!opts.correct) return { delta: 0, streakAfter: 0 };
  const ratio = Math.max(0, 1 - opts.timeMs / Math.max(1, opts.totalMs));
  const base = 1000;
  const speed = Math.round(500 * ratio);
  const streakAfter = opts.streakBefore + 1;
  const streakBonus =
    streakAfter <= 1 ? 0 : Math.min(400, (streakAfter - 1) * 100);
  return { delta: base + speed + streakBonus, streakAfter };
}

export async function submitAnswer(
  code: string,
  playerId: string,
  payload: { correct: boolean; timeMs: number; totalMs: number },
) {
  const s = readRoom(code);
  if (!s) return fake({ correct: false, score: 0 });
  const p = s.players.find((pl) => pl.id === playerId);
  if (!p) return fake({ correct: false, score: 0 });
  // Ignore duplicate answers for the same question
  if (p.lastAnswer?.questionIdx === s.questionIdx) {
    return fake({ correct: p.lastAnswer.correct, score: p.score });
  }
  const { delta, streakAfter } = computeKahootScore({
    correct: payload.correct,
    timeMs: payload.timeMs,
    totalMs: payload.totalMs,
    streakBefore: p.streak,
  });
  p.score += delta;
  p.streak = streakAfter;
  p.lastAnswer = {
    questionIdx: s.questionIdx,
    correct: payload.correct,
    delta,
    timeMs: payload.timeMs,
  };
  writeRoom(s);
  return fake({ correct: payload.correct, score: p.score, delta });
}

export async function listRooms() {
  if (typeof window === "undefined") return fake([] as RoomState[]);
  const out: RoomState[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(ROOM_PREFIX)) {
      try { out.push(JSON.parse(localStorage.getItem(k)!)); } catch { /* skip */ }
    }
  }
  return fake(out.sort((a, b) => b.createdAt - a.createdAt));
}

// ---------- AI helpers (TZ §7 из AI_LOGIC.md; заглушка) ----------
// Замените на реальный вызов к OpenAI/Anthropic/Lovable AI Gateway.

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correct: number;
}

const SAMPLES = [
  { question: "Столица Франции?", options: ["Париж", "Лион", "Марсель", "Ницца"], correct: 0 },
  { question: "Кто написал «Войну и мир»?", options: ["Толстой", "Достоевский", "Чехов", "Пушкин"], correct: 0 },
  { question: "Химический символ золота?", options: ["Au", "Ag", "Gd", "Go"], correct: 0 },
];

export async function generateQuestion(input: {
  topic?: string;
  type?: "choice" | "bool" | "text";
  wishes?: string;
}): Promise<{ variants: GeneratedQuestion[] }> {
  const topic = (input.topic ?? "").trim();
  const seed = topic ? topic : "общей эрудиции";
  const variants: GeneratedQuestion[] = Array.from({ length: 3 }).map((_, i) => {
    const base = SAMPLES[i % SAMPLES.length];
    return {
      question: topic
        ? `Вопрос ${i + 1} по теме «${seed}»${input.wishes ? " — " + input.wishes : ""}`
        : base.question,
      options: base.options,
      correct: base.correct,
    };
  });
  return fake({ variants }, 350);
}

export async function generateQuiz(input: { topic: string; count?: number; wishes?: string }) {
  const count = Math.min(20, Math.max(1, input.count ?? 10));
  const { variants } = await generateQuestion({ topic: input.topic, wishes: input.wishes });
  const questions = Array.from({ length: count }).map((_, i) => variants[i % variants.length]);
  return fake({ title: `Квиз: ${input.topic}`, questions }, 500);
}

export async function generateJeopardyCategory(topic: string) {
  const values = [100, 200, 300, 400, 500];
  const items = values.map((v) => ({
    points: v,
    q: `Вопрос за ${v} по теме «${topic}»`,
    a: "Пример ответа",
  }));
  return fake({ category: topic, questions: items }, 400);
}

// ---------- Public export for debugging / migration audits ----------
export const __apiVersion = "1.0.0-facade";
