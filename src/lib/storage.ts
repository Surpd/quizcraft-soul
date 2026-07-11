// localStorage-backed persistence for IslandQuiz.
// Designed so a future Lovable Cloud swap only replaces this module.

import type { GameKind, StoredGame } from "./types";

const NS = "islandquiz.v1";
const key = (kind: GameKind, id: string) => `${NS}.${kind}.${id}`;

export function newId(): string {
  // 8-char base36, human-friendly for share URLs
  return (
    Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6)
  );
}

export function saveGame<T>(kind: GameKind, id: string, data: T): StoredGame<T> {
  const record: StoredGame<T> = { id, kind, data, updatedAt: Date.now() };
  if (typeof window === "undefined") return record;
  try {
    localStorage.setItem(key(kind, id), JSON.stringify(record));
  } catch (err) {
    console.error("Failed to save game", err);
  }
  return record;
}

export function loadGame<T>(kind: GameKind, id: string): StoredGame<T> | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key(kind, id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredGame<T>;
  } catch {
    return null;
  }
}

export function deleteGame(kind: GameKind, id: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key(kind, id));
}

export function listGames(kind?: GameKind): StoredGame[] {
  if (typeof window === "undefined") return [];
  const out: StoredGame[] = [];
  const prefix = kind ? `${NS}.${kind}.` : `${NS}.`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      try {
        const rec = JSON.parse(localStorage.getItem(k)!) as StoredGame;
        out.push(rec);
      } catch { /* skip */ }
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}
