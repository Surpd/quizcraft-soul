// Readable formatting for quiz answers used in print / feedback UIs.
// Matching answers are stored as JSON; render them as "left → right, ..." instead.
import type { QuizQuestion } from "./types";

export function formatQuizAnswer(q: QuizQuestion): string {
  if (!q) return "";
  if (q.type === "matching") {
    try {
      const pairs = JSON.parse(q.answer || "[]") as { left: string; right: string }[];
      if (!Array.isArray(pairs)) return q.answer;
      return pairs
        .filter((p) => p && (p.left || p.right))
        .map((p) => `${p.left} → ${p.right}`)
        .join(", ");
    } catch {
      return q.answer;
    }
  }
  if (q.type === "bool") return q.answer === "true" ? "Правда" : "Ложь";
  return q.answer || "";
}
