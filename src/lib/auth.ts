// Local user storage for the account system stub.
// All functions run against localStorage; swap this module for real backend later.

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: number;
}

const USERS_KEY = "islandquiz.v1.auth.users";
export const SESSION_KEY = "islandquiz.v1.auth.session";

function readUsersRaw(): User[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]") as User[];
  } catch {
    return [];
  }
}
function writeUsers(list: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id === null) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, id);
}

export function findUserById(id: string): User | null {
  return readUsersRaw().find((u) => u.id === id) ?? null;
}

export function findUserByEmail(email: string): User | null {
  const e = email.trim().toLowerCase();
  return readUsersRaw().find((u) => u.email.toLowerCase() === e) ?? null;
}

export function createUser(input: { email: string; name: string }): User {
  const list = readUsersRaw();
  const u: User = {
    id: Math.random().toString(36).slice(2, 10),
    email: input.email.trim(),
    name: input.name.trim() || input.email.split("@")[0],
    createdAt: Date.now(),
  };
  list.push(u);
  writeUsers(list);
  return u;
}

export function updateUserRecord(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): User | null {
  const list = readUsersRaw();
  const idx = list.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  writeUsers(list);
  return list[idx];
}

export function getCurrentUser(): User | null {
  const id = getSessionUserId();
  return id ? findUserById(id) : null;
}
