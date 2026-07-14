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
import {
  saveQuizResult,
  loadQuizResults,
  saveOnlineQuizResult,
  loadOnlineQuizResults,
  type OnlineQuizResult,
  type OnlineQuizPlayerAnswer,
} from "./results";
import { saveJeopardyResult, loadJeopardyResults, type JeopardyResult } from "./jeopardy-results";
import type {
  GameKind,
  JeopardyData,
  MillionaireData,
  QuizData,
  QuizQuestion,
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
export async function submitJeopardyResult(payload: Parameters<typeof saveJeopardyResult>[0]) {
  const rec = saveJeopardyResult(payload);
  return fake({ ok: true, id: rec.id });
}

// ---------- Online rooms (Sync Mode, TZ §3) ----------
// Хранение: localStorage + BroadcastChannel("islandquiz.room.<code>").
// Заменяется на WebSocket без изменения UI.

export interface RoomAnswerRecord {
  questionIdx: number;
  correct: boolean;
  delta: number;
  timeMs: number;
  given: string;
}

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  connected: boolean;
  lastAnswer?: RoomAnswerRecord;
  answerHistory?: RoomAnswerRecord[];
  jCorrect?: number;
  jWrong?: number;
}

export type RoomStatus = "waiting" | "active" | "reveal" | "leaderboard" | "finished";

export type JeopardyPhase =
  | "lobby"
  | "board"
  | "question"
  | "answering"
  | "reveal"
  | "final-bets"
  | "final-question"
  | "final-reveal"
  | "podium";

export interface JeopardyRoomState {
  phase: JeopardyPhase;
  mode: "buzz" | "turn";
  round: number;
  currentPlayerIdx: number;
  usedKeys: string[];
  selectedCat: number | null;
  selectedQ: number | null;
  buzzedPlayerId: string | null;
  buzzedPlayerIds: string[]; // buzz mode: players who already got a wrong attempt
  buzzedAnswer: string | null; // text the buzzed player submitted
  buzzStartAt: number | null; // ms — start of personal 30s answer timer
  buzzTimeoutMs: number; // ms — personal answer window
  questionTotalMs: number; // buzz mode: full timer for the current question
  questionElapsedMs: number; // buzz mode: accumulated elapsed time (frozen while answering)
  showAnswer: boolean;
  awaitingBonus: boolean; // turn-wrong: teacher can distribute bonus before advancing
  finalBets: Record<string, number>;
  finalAnswers: Record<string, boolean>;
  finalGiven: Record<string, string>;
  finalRevealOrder: string[];
  finalRevealIdx: number; // -1 not started
  finalRevealStep: "bet" | "answer" | "score" | "done";
  finalRevealAt: number | null;
  lastDelta?: { playerId: string; delta: number } | null;
}


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
  jeopardy?: JeopardyRoomState;
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
  } catch {
    /* ignore */
  }
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
  } catch {
    /* ignore */
  }
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
    ...(gameKind === "jeopardy"
      ? {
      jeopardy: {
            phase: "lobby" as const,
            mode: "buzz" as const,
            round: 0,
            currentPlayerIdx: 0,
            usedKeys: [],
            selectedCat: null,
            selectedQ: null,
            buzzedPlayerId: null,
            buzzedPlayerIds: [],
            buzzedAnswer: null,
            buzzStartAt: null,
            buzzTimeoutMs: 30000,
            questionTotalMs: 30000,
            questionElapsedMs: 0,
            showAnswer: false,
            awaitingBonus: false,
            finalBets: {},
            finalAnswers: {},
            finalGiven: {},
            finalRevealOrder: [],
            finalRevealIdx: -1,
            finalRevealStep: "done" as const,
            finalRevealAt: null,
            lastDelta: null,
          },

        }
      : {}),
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
  const s = readRoom(code);
  if (!s) return fake(null);
  s.status = "active";
  s.questionIdx = 0;
  s.questionStartAt = Date.now();
  s.players.forEach((p) => {
    p.lastAnswer = undefined;
    p.answerHistory = [];
  });
  writeRoom(s);
  return fake(s);
}
export async function revealAnswer(code: string) {
  const s = readRoom(code);
  if (!s) return fake(null);
  s.status = "reveal";
  const answered = s.players.filter(
    (p) => p.lastAnswer?.questionIdx === s.questionIdx && p.lastAnswer.correct,
  );
  const fastest = answered.sort((a, b) => a.lastAnswer!.timeMs - b.lastAnswer!.timeMs)[0];
  s.fastestPlayerId = fastest?.id;
  writeRoom(s);
  return fake(s);
}
export async function showLeaderboard(code: string) {
  const s = readRoom(code);
  if (!s) return fake(null);
  s.status = "leaderboard";
  writeRoom(s);
  return fake(s);
}
export async function nextQuestion(code: string) {
  const s = readRoom(code);
  if (!s) return fake(null);
  s.questionIdx += 1;
  s.status = "active";
  s.questionStartAt = Date.now();
  s.fastestPlayerId = undefined;
  writeRoom(s);
  return fake(s);
}
export async function finishRoom(code: string) {
  const s = readRoom(code);
  if (!s) return fake(null);
  s.status = "finished";
  writeRoom(s);
  // Save online results for dashboard (quiz only)
  if (s.gameKind === "quiz") {
    try {
      const rec = _loadGame<QuizData>("quiz", s.gameId);
      if (rec) {
        const questions = rec.data.questions;
        const maxScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);
        const durationSec = Math.max(0, Math.round((Date.now() - s.createdAt) / 1000));
        const players = s.players.map((p) => {
          const hist = p.answerHistory ?? [];
          const answers: OnlineQuizPlayerAnswer[] = hist.map((a) => {
            const q: QuizQuestion | undefined = questions[a.questionIdx];
            const correctAnswer = q?.answer ?? "";
            return {
              questionIdx: a.questionIdx,
              question: q?.q ?? `Вопрос ${a.questionIdx + 1}`,
              given: a.given,
              correctAnswer,
              correct: a.correct,
              earned: a.delta,
              points: q?.points ?? 0,
              timeMs: a.timeMs,
            };
          });
          const correctCount = answers.filter((a) => a.correct).length;
          return {
            id: p.id,
            nickname: p.nickname,
            avatar: p.avatar,
            score: p.score,
            maxScore,
            correctCount,
            totalQuestions: questions.length,
            answers,
          };
        });
        saveOnlineQuizResult({
          roomCode: s.code,
          gameId: s.gameId,
          durationSec,
          players,
        });
      }
    } catch (err) {
      console.error("Failed to save online room result", err);
    }
  }
  return fake(s);
}
export async function kickPlayer(code: string, playerId: string) {
  const s = readRoom(code);
  if (!s) return fake(null);
  s.players = s.players.filter((p) => p.id !== playerId);
  writeRoom(s);
  return fake(s);
}
export async function adjustPlayerScore(code: string, playerId: string, delta: number) {
  const s = readRoom(code);
  if (!s) return fake(null);
  const p = s.players.find((pl) => pl.id === playerId);
  if (p) {
    p.score = Math.max(0, p.score + delta);
  }
  writeRoom(s);
  return fake(s);
}
export async function restartRoom(code: string) {
  const s = readRoom(code);
  if (!s) return fake(null);
  s.status = "waiting";
  s.questionIdx = 0;
  s.questionStartAt = null;
  s.fastestPlayerId = undefined;
  s.players.forEach((p) => {
    p.score = 0;
    p.streak = 0;
    p.lastAnswer = undefined;
    p.answerHistory = [];
  });
  writeRoom(s);
  return fake(s);
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
  const streakBonus = streakAfter <= 1 ? 0 : Math.min(400, (streakAfter - 1) * 100);
  return { delta: base + speed + streakBonus, streakAfter };
}

export async function submitAnswer(
  code: string,
  playerId: string,
  payload: { correct: boolean; timeMs: number; totalMs: number; given?: string },
) {
  const s = readRoom(code);
  if (!s) return fake({ correct: false, score: 0 });
  const p = s.players.find((pl) => pl.id === playerId);
  if (!p) return fake({ correct: false, score: 0 });
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
  const rec: RoomAnswerRecord = {
    questionIdx: s.questionIdx,
    correct: payload.correct,
    delta,
    timeMs: payload.timeMs,
    given: payload.given ?? "",
  };
  p.lastAnswer = rec;
  if (!p.answerHistory) p.answerHistory = [];
  // Replace any earlier record for this question (in case of edge cases)
  p.answerHistory = p.answerHistory.filter((a) => a.questionIdx !== s.questionIdx);
  p.answerHistory.push(rec);
  writeRoom(s);
  return fake({ correct: payload.correct, score: p.score, delta });
}

// TODO(server): GET /api/quiz/:gameId/online-results
export async function getOnlineResults(gameId: string): Promise<OnlineQuizResult[]> {
  return fake(loadOnlineQuizResults(gameId));
}

export async function listRooms() {
  if (typeof window === "undefined") return fake([] as RoomState[]);
  const out: RoomState[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(ROOM_PREFIX)) {
      try {
        out.push(JSON.parse(localStorage.getItem(k)!));
      } catch {
        /* skip */
      }
    }
  }
  return fake(out.sort((a, b) => b.createdAt - a.createdAt));
}

// =========================================================================
//                        ONLINE JEOPARDY (rooms)
// =========================================================================

function mutJeopardy(code: string, fn: (j: JeopardyRoomState, s: RoomState) => void) {
  const s = readRoom(code);
  if (!s || !s.jeopardy) return null;
  fn(s.jeopardy, s);
  writeRoom(s);
  return s;
}

export async function setJeopardyMode(code: string, mode: "buzz" | "turn") {
  return fake(mutJeopardy(code, (j) => { j.mode = mode; }));
}

export async function startJeopardyGame(code: string) {
  return fake(
    mutJeopardy(code, (j, s) => {
      j.phase = "board";
      j.round = 0;
      j.usedKeys = [];
      j.currentPlayerIdx = 0;
      j.selectedCat = null;
      j.selectedQ = null;
      j.buzzedPlayerId = null;
      j.buzzedPlayerIds = [];
      j.showAnswer = false;
      j.lastDelta = null;
      s.status = "active";
      s.players.forEach((p) => {
        p.score = 0;
        p.jCorrect = 0;
        p.jWrong = 0;
      });
    }),
  );
}

export async function selectJeopardyQuestion(
  code: string,
  playerId: string | null,
  catIdx: number,
  qIdx: number,
) {
  return fake(
    mutJeopardy(code, (j, s) => {
      // In turn mode, only current player (or teacher: playerId=null) can select
      if (j.mode === "turn" && playerId) {
        const cur = s.players[j.currentPlayerIdx]?.id;
        if (cur && cur !== playerId) return;
      }
      // In buzz mode only the teacher (playerId=null) picks the cell.
      if (j.mode === "buzz" && playerId) return;
      const key = `${j.round}-${catIdx}-${qIdx}`;
      if (j.usedKeys.includes(key)) return;
      // Load points to compute timer.
      const rec = _loadGame<JeopardyData>("jeopardy", s.gameId);
      const q = rec?.data.rounds[j.round]?.[catIdx]?.questions[qIdx];
      const timeBase = rec?.data.config.timeBase ?? 30;
      const timeStep = rec?.data.config.timeStep ?? 0;
      const tier = q ? Math.max(0, Math.round((q.points || 100) / 100) - 1) : 0;
      j.selectedCat = catIdx;
      j.selectedQ = qIdx;
      j.buzzedPlayerId = null;
      j.buzzedPlayerIds = [];
      j.buzzedAnswer = null;
      j.buzzStartAt = null;
      j.awaitingBonus = false;
      j.showAnswer = false;
      j.phase = "question";
      j.questionTotalMs = Math.max(5, timeBase + timeStep * tier) * 1000;
      j.questionElapsedMs = 0;
      s.questionStartAt = Date.now();
    }),
  );
}

// Buzz-mode: player submits typed answer during personal 30s window.
export async function submitJeopardyBuzzAnswer(code: string, playerId: string, given: string) {
  return fake(
    mutJeopardy(code, (j) => {
      if (j.buzzedPlayerId !== playerId) return;
      j.buzzedAnswer = given;
    }),
  );
}

// Teacher: after turn-wrong bonus distribution, advance turn + close cell.
export async function finalizeJeopardyTurnWrong(code: string) {
  return fake(
    mutJeopardy(code, (j, s) => {
      if (!j.awaitingBonus) return;
      j.awaitingBonus = false;
      j.currentPlayerIdx = (j.currentPlayerIdx + 1) % Math.max(1, s.players.length);
      j.showAnswer = true;
      j.phase = "reveal";
      if (j.selectedCat != null && j.selectedQ != null) {
        const key = `${j.round}-${j.selectedCat}-${j.selectedQ}`;
        if (!j.usedKeys.includes(key)) j.usedKeys.push(key);
      }
    }),
  );
}

export async function buzzJeopardy(code: string, playerId: string) {
  return fake(
    mutJeopardy(code, (j, s) => {
      if (j.mode !== "buzz") return;
      if (j.phase !== "question" || j.buzzedPlayerId) return;
      if (j.buzzedPlayerIds.includes(playerId)) return;
      // Freeze question timer
      if (s.questionStartAt) {
        j.questionElapsedMs += Date.now() - s.questionStartAt;
      }
      s.questionStartAt = null;
      j.buzzedPlayerId = playerId;
      j.buzzedAnswer = null;
      j.buzzStartAt = Date.now();
      j.phase = "answering";
    }),
  );
}

export async function acceptJeopardyAnswer(code: string, correct: boolean) {
  return fake(
    mutJeopardy(code, (j, s) => {
      if (j.selectedCat == null || j.selectedQ == null) return;
      const rec = _loadGame<JeopardyData>("jeopardy", s.gameId);
      const q = rec?.data.rounds[j.round]?.[j.selectedCat]?.questions[j.selectedQ];
      const points = q?.points ?? 0;
      const targetId =
        j.mode === "buzz"
          ? j.buzzedPlayerId
          : (s.players[j.currentPlayerIdx]?.id ?? null);
      if (targetId) {
        const p = s.players.find((x) => x.id === targetId);
        if (p) {
          const delta = correct ? points : -points;
          p.score = p.score + delta;
          if (correct) p.jCorrect = (p.jCorrect ?? 0) + 1;
          else p.jWrong = (p.jWrong ?? 0) + 1;
          j.lastDelta = { playerId: targetId, delta };
        }
      }
      // TURN mode
      if (j.mode === "turn") {
        if (correct) {
          j.currentPlayerIdx = (j.currentPlayerIdx + 1) % Math.max(1, s.players.length);
          j.showAnswer = true;
          j.phase = "reveal";
          const key = `${j.round}-${j.selectedCat}-${j.selectedQ}`;
          if (!j.usedKeys.includes(key)) j.usedKeys.push(key);
        } else {
          // Wrong → let teacher distribute bonus/penalty to others; advance later
          j.awaitingBonus = true;
        }
        return;
      }
      // BUZZ + wrong → resume timer, allow other players to buzz.
      if (j.mode === "buzz" && !correct) {
        if (targetId && !j.buzzedPlayerIds.includes(targetId)) {
          j.buzzedPlayerIds.push(targetId);
        }
        j.buzzedPlayerId = null;
        j.buzzedAnswer = null;
        j.buzzStartAt = null;
        j.phase = "question";
        s.questionStartAt = Date.now();
        if (j.buzzedPlayerIds.length >= s.players.length) {
          j.showAnswer = true;
          j.phase = "reveal";
          const key = `${j.round}-${j.selectedCat}-${j.selectedQ}`;
          if (!j.usedKeys.includes(key)) j.usedKeys.push(key);
        }
        return;
      }
      // BUZZ + correct → close
      j.showAnswer = true;
      j.phase = "reveal";
      const key = `${j.round}-${j.selectedCat}-${j.selectedQ}`;
      if (!j.usedKeys.includes(key)) j.usedKeys.push(key);
    }),
  );
}

// Manually close the current question with no points (timer expired /
// teacher decided to move on). Marks the cell as used.
export async function closeJeopardyQuestion(code: string) {
  return fake(
    mutJeopardy(code, (j) => {
      if (j.selectedCat == null || j.selectedQ == null) {
        j.phase = "board";
        return;
      }
      const key = `${j.round}-${j.selectedCat}-${j.selectedQ}`;
      if (!j.usedKeys.includes(key)) j.usedKeys.push(key);
      j.showAnswer = true;
      j.phase = "reveal";
      j.buzzedPlayerId = null;
    }),
  );
}

export async function backToBoard(code: string) {
  return fake(
    mutJeopardy(code, (j) => {
      j.selectedCat = null;
      j.selectedQ = null;
      j.buzzedPlayerId = null;
      j.buzzedPlayerIds = [];
      j.showAnswer = false;
      j.lastDelta = null;
      j.phase = "board";
    }),
  );
}

export async function skipJeopardyQuestion(code: string) {
  return fake(
    mutJeopardy(code, (j) => {
      if (j.selectedCat == null || j.selectedQ == null) {
        j.phase = "board";
        return;
      }
      const key = `${j.round}-${j.selectedCat}-${j.selectedQ}`;
      if (!j.usedKeys.includes(key)) j.usedKeys.push(key);
      j.selectedCat = null;
      j.selectedQ = null;
      j.buzzedPlayerId = null;
      j.buzzedPlayerIds = [];
      j.showAnswer = false;
      j.phase = "board";
    }),
  );
}


export async function endJeopardyRound(code: string) {
  return fake(
    mutJeopardy(code, (j, s) => {
      const rec = _loadGame<JeopardyData>("jeopardy", s.gameId);
      const total = rec?.data.rounds.length ?? 0;
      if (j.round + 1 < total) {
        j.round += 1;
        j.usedKeys = [];
        j.selectedCat = null;
        j.selectedQ = null;
        j.buzzedPlayerId = null;
        j.showAnswer = false;
        j.phase = "board";
      } else {
        // Move to final
        j.phase = "final-bets";
        j.finalBets = {};
        j.finalAnswers = {};
        j.finalGiven = {};
      }
    }),
  );
}

export async function submitJeopardyFinalBet(code: string, playerId: string, bet: number) {
  return fake(
    mutJeopardy(code, (j, s) => {
      const p = s.players.find((x) => x.id === playerId);
      const cap = Math.max(0, p?.score ?? 0);
      j.finalBets[playerId] = Math.max(0, Math.min(cap, Math.floor(bet)));
    }),
  );
}

export async function startJeopardyFinalQuestion(code: string) {
  return fake(
    mutJeopardy(code, (j, s) => {
      // Fill missing bets with 0
      s.players.forEach((p) => {
        if (j.finalBets[p.id] == null) j.finalBets[p.id] = 0;
      });
      j.phase = "final-question";
      j.showAnswer = false;
      s.questionStartAt = Date.now();
    }),
  );
}

export async function submitJeopardyFinalAnswer(code: string, playerId: string, given: string) {
  return fake(
    mutJeopardy(code, (j) => {
      j.finalGiven[playerId] = given;
    }),
  );
}

export async function markJeopardyFinal(code: string, playerId: string, correct: boolean) {
  return fake(
    mutJeopardy(code, (j) => {
      j.finalAnswers[playerId] = correct;
    }),
  );
}

export async function revealJeopardyFinal(code: string) {
  return fake(
    mutJeopardy(code, (j, s) => {
      j.showAnswer = true;
      j.phase = "final-reveal";
      // Apply bets
      s.players.forEach((p) => {
        const bet = j.finalBets[p.id] ?? 0;
        const ok = j.finalAnswers[p.id] ?? false;
        p.score = p.score + (ok ? bet : -bet);
      });
    }),
  );
}

export async function finishJeopardyGame(code: string) {
  const s = readRoom(code);
  if (!s || !s.jeopardy) return fake(null);
  s.jeopardy.phase = "podium";
  s.status = "finished";
  writeRoom(s);
  // Persist result
  try {
    const sorted = [...s.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0] ?? null;
    const hasFinal = Object.keys(s.jeopardy.finalBets).length > 0;
    saveJeopardyResult({
      gameId: s.gameId,
      hasFinal,
      winnerId: winner?.id ?? null,
      teams: s.players.map((p) => ({
        id: p.id,
        name: p.nickname,
        score: p.score,
        correct: p.jCorrect ?? 0,
        wrong: p.jWrong ?? 0,
        finalBet: hasFinal ? (s.jeopardy!.finalBets[p.id] ?? 0) : undefined,
        finalCorrect: hasFinal ? (s.jeopardy!.finalAnswers[p.id] ?? false) : undefined,
      })),
    });
  } catch (err) {
    console.error("Failed to save online jeopardy result", err);
  }
  return fake(s);
}

export async function adjustJeopardyScore(code: string, playerId: string, delta: number) {
  return fake(
    mutJeopardy(code, (_j, s) => {
      const p = s.players.find((x) => x.id === playerId);
      if (p) p.score = p.score + delta;
    }),
  );
}


// =========================================================================
//                        AI HELPERS (TZ AI v2.0)
// =========================================================================
// Все функции — заглушки с [MOCK]-маркером. При интеграции с бэкендом
// меняем только тело функций, сигнатуры сохраняем. Промпты, роли и модель
// формируются на сервере — фронт передаёт только input-параметры.

export interface GeneratedQuestion {
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options?: string[];
  correct?: number | boolean;
  correctAnswer?: string;
  pairs?: { left: string; right: string }[];
}

export interface GeneratedQuizQuestion {
  type: "choice" | "bool" | "text" | "matching";
  question: string;
  options?: string[];
  correct?: number | boolean;
  correctAnswer?: string;
  pairs?: { left: string; right: string }[];
}

export interface GeneratedJeopardyCategory {
  name: string;
  description: string;
}

export interface GeneratedJeopardyQuestion {
  points: number;
  difficulty: string;
  q: string;
  a: string;
}

// TODO(server): POST /api/ai/improve-question
export async function improveQuestion(input: {
  currentText: string;
  format: string; // "quiz-choice" | "quiz-bool" | "quiz-text" | "quiz-matching" | "jeopardy" | "millionaire"
  topic?: string;
  wishes?: string;
  reroll?: boolean;
}): Promise<{ variants: GeneratedQuestion[] }> {
  const salt = input.reroll ? ` (reroll ${Math.floor(Math.random() * 100)})` : "";
  const difficulties = ["easy", "medium", "hard"] as const;
  const variants: GeneratedQuestion[] = difficulties.map((difficulty) => {
    const base = {
      difficulty,
      question: `[MOCK] [${difficulty}] Улучшено под ${input.format}: ${input.currentText}${salt}`,
    };
    if (input.format === "quiz-bool") {
      return { ...base, options: ["Да", "Нет"], correct: Math.random() > 0.5 };
    }
    if (input.format === "quiz-text" || input.format === "jeopardy") {
      return { ...base, correctAnswer: `[MOCK] Улучшенный ответ` };
    }
    if (input.format === "quiz-matching") {
      return {
        ...base,
        pairs: [
          { left: "[MOCK] A", right: "[MOCK] 1" },
          { left: "[MOCK] B", right: "[MOCK] 2" },
          { left: "[MOCK] C", right: "[MOCK] 3" },
        ],
      };
    }
    // quiz-choice / millionaire / default
    return {
      ...base,
      options: [
        "[MOCK] Правильный",
        "[MOCK] Неправильный 1",
        "[MOCK] Неправильный 2",
        "[MOCK] Неправильный 3",
      ],
      correct: Math.floor(Math.random() * 4),
    };
  });
  return fake({ variants }, 350);
}

// TODO(server): POST /api/ai/generate-question
export async function generateQuestion(input: {
  topic?: string;
  type?: "choice" | "bool" | "text";
  currentText?: string;
  wishes?: string;
  format?: string; // расширение для передачи точного формата билдера
  reroll?: boolean;
}): Promise<{ variants: GeneratedQuestion[] }> {
  const isImprovement = !!input.currentText && input.currentText.trim().length > 0;
  if (isImprovement) {
    return improveQuestion({
      currentText: input.currentText!,
      format: input.format ?? input.type ?? "quiz-choice",
      topic: input.topic,
      wishes: input.wishes,
      reroll: input.reroll,
    });
  }
  const topic = input.topic?.trim() || "Неожиданные факты";
  const effectiveFormat = input.format ?? input.type ?? "choice";
  const salt = input.reroll ? ` (reroll ${Math.floor(Math.random() * 100)})` : "";
  const difficulties = ["easy", "medium", "hard"] as const;
  const variants: GeneratedQuestion[] = difficulties.map((difficulty, i) => {
    const base = {
      difficulty,
      question: `[MOCK] [${difficulty}] Вопрос ${i + 1} по теме "${topic}"${salt}`,
    };
    if (effectiveFormat === "quiz-bool" || input.type === "bool") {
      return { ...base, options: ["Да", "Нет"], correct: Math.random() > 0.5 };
    }
    if (effectiveFormat === "quiz-text" || input.type === "text") {
      return { ...base, correctAnswer: `[MOCK] Правильный ответ на вопрос` };
    }
    if (effectiveFormat === "quiz-matching") {
      return {
        ...base,
        pairs: [
          { left: "[MOCK] A", right: "[MOCK] 1" },
          { left: "[MOCK] B", right: "[MOCK] 2" },
          { left: "[MOCK] C", right: "[MOCK] 3" },
        ],
      };
    }
    // choice / millionaire / default
    return {
      ...base,
      options: [
        "[MOCK] Правильный ответ",
        "[MOCK] Неправильный ответ 1",
        "[MOCK] Неправильный ответ 2",
        "[MOCK] Неправильный ответ 3",
      ],
      correct: Math.floor(Math.random() * 4),
    };
  });
  return fake({ variants }, 350);
}

// TODO(server): POST /api/ai/generate-quiz
export async function generateQuiz(input: {
  topic?: string;
  count?: number;
  wishes?: string;
}): Promise<{ title: string; questions: GeneratedQuizQuestion[] }> {
  const topic = input.topic?.trim() || "Удивительные открытия";
  const count = Math.min(20, Math.max(5, input.count ?? 10));
  const questions: GeneratedQuizQuestion[] = Array.from({ length: count }).map((_, i) => {
    const pos = i % 10;
    let type: GeneratedQuizQuestion["type"];
    if (pos < 6) type = "choice";
    else if (pos < 8) type = "text";
    else if (pos === 8) type = "bool";
    else type = "matching";
    const question = `[MOCK] Вопрос ${i + 1} (${type}) по теме "${topic}"`;
    if (type === "choice") {
      return {
        type,
        question,
        options: [
          "[MOCK] Правильный",
          "[MOCK] Неправильный 1",
          "[MOCK] Неправильный 2",
          "[MOCK] Неправильный 3",
        ],
        correct: Math.floor(Math.random() * 4),
      };
    }
    if (type === "bool") {
      return {
        type,
        question,
        options: ["Да", "Нет"],
        correct: Math.random() > 0.5,
      };
    }
    if (type === "text") {
      return {
        type,
        question,
        correctAnswer: "[MOCK] Правильный ответ",
      };
    }
    // matching
    return {
      type,
      question,
      pairs: [
        { left: "[MOCK] A", right: "[MOCK] 1" },
        { left: "[MOCK] B", right: "[MOCK] 2" },
        { left: "[MOCK] C", right: "[MOCK] 3" },
      ],
    };
  });
  return fake({ title: `[MOCK] Квиз: ${topic}`, questions }, 500);
}

// TODO(server): POST /api/ai/generate-jeopardy-categories
export async function generateJeopardyCategories(input: {
  topic?: string;
  wishes?: string;
}): Promise<{ categories: GeneratedJeopardyCategory[] }> {
  const topic = input.topic?.trim() || "Удивительные явления";
  return fake(
    {
      categories: [
        { name: `[MOCK] ${topic}: ключевые события`, description: "Основные даты и факты" },
        { name: `[MOCK] ${topic}: личности`, description: "Выдающиеся деятели" },
        { name: `[MOCK] ${topic}: малоизвестные факты`, description: "Удивительные подробности" },
      ],
    },
    400,
  );
}

// TODO(server): POST /api/ai/generate-jeopardy-questions
export async function generateJeopardyQuestions(input: {
  category: string;
  emptySlots: number[];
  wishes?: string;
}): Promise<{ questions: GeneratedJeopardyQuestion[] }> {
  const difficultyMap: Record<number, string> = {
    100: "easy",
    200: "easy-medium",
    300: "medium",
    400: "medium-hard",
    500: "hard",
  };
  const questions = input.emptySlots.map((points) => ({
    points,
    difficulty: difficultyMap[points] ?? "medium",
    q: `[MOCK] [${points}] Вопрос по теме "${input.category}"`,
    a: `[MOCK] Ответ на ${points}`,
  }));
  return fake({ questions }, 400);
}

// ---------- Public export for debugging / migration audits ----------
export const __apiVersion = "1.1.0-facade-ai";
