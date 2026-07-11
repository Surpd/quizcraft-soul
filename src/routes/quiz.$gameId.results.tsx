import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, Trophy, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { loadQuizResults, type QuizResult } from "@/lib/results";
import { loadGame } from "@/lib/storage";
import type { QuizData } from "@/lib/types";

export const Route = createFileRoute("/quiz/$gameId/results")({
  head: () => ({
    meta: [{ title: "Результаты квиза — IslandQuiz" }],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { gameId } = Route.useParams();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [game, setGame] = useState<QuizData | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setResults(loadQuizResults(gameId));
    const g = loadGame<QuizData>("quiz", gameId);
    setGame(g?.data ?? null);
  }, [gameId, tick]);

  const count = results.length;
  const avgScore = count ? Math.round(results.reduce((s, r) => s + r.score, 0) / count) : 0;
  const bestScore = count ? Math.max(...results.map((r) => r.score)) : 0;
  const avgPct = count
    ? Math.round(
        results.reduce((s, r) => s + (r.totalQuestions ? (r.correctCount / r.totalQuestions) * 100 : 0), 0) / count,
      )
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Trophy className="h-5 w-5" />
              </span>
              Результаты
            </h1>
            {game && <p className="mt-2 text-sm text-muted-foreground">{game.config.title}</p>}
          </div>
          <button className="btn-ghost" onClick={() => setTick((t) => t + 1)}>
            <RefreshCw className="h-4 w-4" /> Обновить
          </button>
        </div>

        {count > 0 ? (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-4">
              <StatCard label="Прошли" value={String(count)} />
              <StatCard label="Средний балл" value={String(avgScore)} />
              <StatCard label="Лучший" value={String(bestScore)} />
              <StatCard label="Средняя точность" value={`${avgPct}%`} />
            </div>

            <div className="surface-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-soft text-left text-xs font-bold uppercase tracking-wider text-primary">
                    <th className="px-4 py-3">Игрок</th>
                    <th className="px-4 py-3">Баллы</th>
                    <th className="px-4 py-3">Верно</th>
                    <th className="px-4 py-3">Точность</th>
                    <th className="px-4 py-3">Время</th>
                    <th className="px-4 py-3">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const pct = r.totalQuestions ? Math.round((r.correctCount / r.totalQuestions) * 100) : 0;
                    const tone = pct >= 80 ? "success" : pct >= 50 ? "amber" : "danger";
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-surface-muted/60">
                        <td className="px-4 py-3 font-semibold">{r.playerName || "Аноним"}</td>
                        <td className="px-4 py-3 font-mono">{r.score}<span className="text-muted-foreground">/{r.maxScore}</span></td>
                        <td className="px-4 py-3 font-mono">{r.correctCount}/{r.totalQuestions}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              tone === "success"
                                ? "bg-success-soft text-success"
                                : tone === "amber"
                                  ? "bg-amber-soft text-amber"
                                  : "bg-danger-soft text-danger"
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {Math.floor(r.timeSec / 60)}:{String(r.timeSec % 60).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(r.finishedAt).toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="surface-card p-12 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-4 h-12 w-12 opacity-40" />
            <p className="text-lg font-semibold text-foreground">Пока никто не прошёл квиз</p>
            <p className="mt-2 text-sm">
              Поделитесь ссылкой на плеер — как только кто-то завершит игру, результаты появятся здесь.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4 text-center">
      <div className="font-display text-3xl font-black text-primary">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
