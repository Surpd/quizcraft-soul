import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Library as LibraryIcon,
  Play,
  Radio,
  Printer,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { listGames, deleteGame, createRoom } from "@/lib/api";
import {
  exportQuizExcel,
  exportJeopardyExcel,
  exportMillionaireExcel,
  printQuiz,
  printJeopardy,
  printMillionaire,
} from "@/lib/exports";
import type {
  GameKind,
  QuizData,
  JeopardyData,
  MillionaireData,
  StoredGame,
} from "@/lib/types";

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

function LibraryPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<StoredGame[]>([]);
  const [filter, setFilter] = useState<GameKind | "all">("all");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => setGames(await listGames());
  useEffect(() => { refresh(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const titleOf = (g: StoredGame): string => {
    const d = g.data as Partial<QuizData> & { config?: { title?: string } };
    return d?.config?.title || `${KIND_LABEL[g.kind]} · ${g.id}`;
  };

  const startOnline = async (g: StoredGame) => {
    const { code } = await createRoom(g.kind, g.id);
    navigate({ to: "/room/$code", params: { code } });
  };

  const doPrint = (g: StoredGame) => {
    if (g.kind === "quiz") printQuiz(g.data as QuizData, { withAnswers: true });
    else if (g.kind === "jeopardy") printJeopardy(g.data as JeopardyData, { withAnswers: true });
    else printMillionaire(g.data as MillionaireData, { withAnswers: true });
  };

  const doExport = (g: StoredGame) => {
    if (g.kind === "quiz") exportQuizExcel(g.data as QuizData);
    else if (g.kind === "jeopardy") exportJeopardyExcel(g.data as JeopardyData);
    else exportMillionaireExcel(g.data as MillionaireData);
  };

  const doDelete = async (g: StoredGame) => {
    if (!confirm(`Удалить «${titleOf(g)}»?`)) return;
    await deleteGame(g.kind, g.id);
    showToast("Удалено");
    refresh();
  };

  const filtered = filter === "all" ? games : games.filter((g) => g.kind === filter);

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
            <p className="mt-1 text-muted-foreground">Всё, что вы создали — в одном месте.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/builder/quiz" className="btn-accent"><Plus className="h-4 w-4" /> Новый квиз</Link>
          </div>
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

        {filtered.length === 0 ? (
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
            {filtered.map((g) => (
              <div key={`${g.kind}-${g.id}`} className="surface-card group relative overflow-hidden p-5 transition-transform hover:-translate-y-0.5">
                <div className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${KIND_ACCENT[g.kind]}`}>
                  {KIND_LABEL[g.kind]}
                </div>
                <h3 className="line-clamp-2 font-display text-lg font-bold">{titleOf(g)}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Обновлено: {new Date(g.updatedAt).toLocaleString("ru-RU")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a
                    href={`/play/${g.kind}/${g.id}`}
                    target="_blank"
                    rel="noopener"
                    className="btn-accent justify-center text-xs"
                  >
                    <Play className="h-3.5 w-3.5" /> Офлайн
                  </a>
                  <button onClick={() => startOnline(g)} className="btn-ghost justify-center text-xs">
                    <Radio className="h-3.5 w-3.5" /> Онлайн
                  </button>
                  <button onClick={() => doPrint(g)} className="btn-ghost justify-center text-xs">
                    <Printer className="h-3.5 w-3.5" /> Печать
                  </button>
                  <button onClick={() => doExport(g)} className="btn-ghost justify-center text-xs">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </button>
                  <a
                    href={`/builder/${g.kind}?id=${g.id}`}
                    className="btn-ghost justify-center text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Изменить
                  </a>
                  <button onClick={() => doDelete(g)} className="btn-ghost justify-center text-xs text-danger hover:bg-danger-soft">
                    <Trash2 className="h-3.5 w-3.5" /> Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white shadow-lift">
          {toast}
        </div>
      )}
    </div>
  );
}
