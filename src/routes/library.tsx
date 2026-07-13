import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Library as LibraryIcon, Plus, Sparkles, FileText, Grid3x3, Coins } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { listGames } from "@/lib/api";
import { cleanupInvalidGames } from "@/lib/storage";
import type { GameKind, QuizData, StoredGame } from "@/lib/types";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Библиотека — IslandQuiz" },
      { name: "description", content: "Ваши квизы, «Своя игра» и «Миллионер»." },
    ],
  }),
  component: LibraryPage,
});

const KIND_LABEL: Record<GameKind, string> = {
  quiz: "Квиз",
  jeopardy: "Своя игра",
  millionaire: "Миллионер",
};

const KIND_ACCENT: Record<GameKind, string> = {
  quiz: "bg-primary-soft text-primary",
  jeopardy: "bg-amber-soft text-amber",
  millionaire: "bg-success-soft text-success",
};

const KIND_ICON: Record<GameKind, typeof FileText> = {
  quiz: FileText,
  jeopardy: Grid3x3,
  millionaire: Coins,
};

function LibraryPage() {
  const [games, setGames] = useState<StoredGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<GameKind | "all">("all");

  useEffect(() => {
    let cancel = false;
    try { cleanupInvalidGames(); } catch { /* ignore */ }
    listGames()
      .then((g) => {
        if (cancel) return;
        const clean = g.filter((x) => {
          const d = x?.data as { config?: unknown } | undefined;
          return !!x && !!x.kind && !!d && !!d.config;
        });
        setGames(clean);
      })
      .catch((e) => { if (!cancel) setError(e?.message ?? "Не удалось загрузить"); });
    return () => { cancel = true; };
  }, []);

  const titleOf = (g: StoredGame): string => {
    const d = g.data as Partial<QuizData> & { config?: { title?: string } };
    return d?.config?.title || `${KIND_LABEL[g.kind]} · ${g.id}`;
  };

  const filtered = !games
    ? []
    : filter === "all"
      ? games
      : games.filter((g) => g.kind === filter);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <LibraryIcon className="h-3.5 w-3.5" /> Библиотека
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Мои квизы</h1>
            <p className="mt-1 text-muted-foreground">Кликните на карточку, чтобы открыть игру.</p>
          </div>
          <Link to="/builder/quiz" className="btn-accent"><Plus className="h-4 w-4" /> Новый квиз</Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "quiz", "jeopardy", "millionaire"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === k ? "bg-foreground text-white" : "bg-surface-muted text-muted-foreground hover:bg-border"
              }`}
            >
              {k === "all" ? "Все" : KIND_LABEL[k as GameKind]}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
        )}

        {games === null && !error ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface-card h-40 animate-pulse bg-surface-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card grid place-items-center py-20 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-display text-xl font-bold">Пока пусто</h3>
            <p className="mt-1 text-sm text-muted-foreground">Создайте первую игру в конструкторе.</p>
            <div className="mt-4 flex gap-2">
              <Link to="/builder/quiz" className="btn-accent">Квиз</Link>
              <Link to="/builder/jeopardy" className="btn-ghost">Своя игра</Link>
              <Link to="/builder/millionaire" className="btn-ghost">Миллионер</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((g) => {
              try {
                const Icon = KIND_ICON[g.kind] ?? FileText;
                return (
                  <Link
                    key={`${g.kind}-${g.id}`}
                    to="/game/$id"
                    params={{ id: g.id }}
                    className="surface-card group relative flex flex-col gap-3 overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${KIND_ACCENT[g.kind]}`}>
                        <Icon className="h-3 w-3" />
                        {KIND_LABEL[g.kind]}
                      </div>
                    </div>
                    <h3 className="line-clamp-2 font-display text-lg font-bold">{titleOf(g)}</h3>
                    <p className="mt-auto text-xs text-muted-foreground">
                      Создано: {new Date(g.updatedAt).toLocaleDateString("ru-RU")}
                    </p>
                  </Link>
                );
              } catch (err) {
                console.error("Ошибка рендера карточки", g, err);
                return null;
              }
            })}
          </div>
        )}
      </main>
    </div>
  );
}
