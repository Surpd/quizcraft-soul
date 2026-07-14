// Local user storage for the account system stub.
// All functions run against localStorage; swap this module for real backend later.

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: number;
}

type StoredUser = User & {
  passwordHash?: string;
  // Backward-compatible fallback for any records that may have been written by
  // an older local stub while debugging. New writes always use passwordHash.
  password?: string;
};

const USERS_KEY = "islandquiz.v1.auth.users";
export const SESSION_KEY = "islandquiz.v1.auth.session";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(email: string, password: string): string {
  let hash = 2166136261;
  const source = `${normalizeEmail(email)}\n${password}`;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `local-v1.${(hash >>> 0).toString(36)}`;
}

function publicUser(u: StoredUser): User {
  const { id, email, name, avatar, createdAt } = u;
  return { id, email, name, avatar, createdAt };
}

function readUsersRaw(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}
function writeUsers(list: StoredUser[]) {
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
  const user = readUsersRaw().find((u) => u.id === id);
  return user ? publicUser(user) : null;
}

export function findUserByEmail(email: string): User | null {
  const e = normalizeEmail(email);
  const user = readUsersRaw().find((u) => normalizeEmail(u.email) === e);
  return user ? publicUser(user) : null;
}

export function verifyUserCredentials(email: string, password: string): User | null {
  const e = normalizeEmail(email);
  const list = readUsersRaw();
  const idx = list.findIndex((u) => normalizeEmail(u.email) === e);
  if (idx < 0) return null;

  const user = list[idx];
  const expected = hashPassword(e, password);
  const ok = user.passwordHash === expected || user.password === password;
  if (!ok) return null;

  if (user.password || user.passwordHash !== expected) {
    list[idx] = { ...user, email: e, passwordHash: expected };
    delete list[idx].password;
    writeUsers(list);
  }

  return publicUser(list[idx]);
}

export function createUser(input: { email: string; name: string; password?: string }): User {
  const list = readUsersRaw();
  const email = normalizeEmail(input.email);
  const u: StoredUser = {
    id: Math.random().toString(36).slice(2, 10),
    email,
    name: input.name.trim() || email.split("@")[0],
    createdAt: Date.now(),
    passwordHash: input.password ? hashPassword(email, input.password) : undefined,
  };
  list.push(u);
  writeUsers(list);
  return publicUser(u);
}

export function updateUserRecord(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): User | null {
  const list = readUsersRaw();
  const idx = list.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  writeUsers(list);
  return publicUser(list[idx]);
}

export function getCurrentUser(): User | null {
  const id = getSessionUserId();
  return id ? findUserById(id) : null;
}
