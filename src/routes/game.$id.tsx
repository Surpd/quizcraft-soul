import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Radio,
  Play,
  Printer,
  FileSpreadsheet,
  Pencil,
  Trophy,
  Trash2,
  ChevronDown,
  ChevronRight,
  Monitor,
  Copy,
  X,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { findGame, createRoom, deleteGame, getJeopardyResults } from "@/lib/api";
import { loadQuizResults, type QuizResult } from "@/lib/results";
import type { JeopardyResult } from "@/lib/jeopardy-results";
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

export const Route = createFileRoute("/game/$id")({
  head: () => ({ meta: [{ title: "Дашборд игры — IslandQuiz" }] }),
  component: GameDashboard,
});

const KIND_LABEL: Record<GameKind, string> = {
  quiz: "Квиз",
  jeopardy: "Своя игра",
  millionaire: "Миллионер",
};

function titleOf(g: StoredGame): string {
  const d = g.data as Partial<QuizData> & { config?: { title?: string } };
  return d?.config?.title || `${KIND_LABEL[g.kind]} · ${g.id}`;
}

function GameDashboard() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState<StoredGame | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openHost, setOpenHost] = useState(false);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    let cancel = false;
    findGame(id)
      .then((g) => {
        if (cancel) return;
        setGame(g);
        if (g?.kind === "quiz") setResults(loadQuizResults(g.id));
      })
      .catch((e) => { if (!cancel) setError(e?.message ?? "Не удалось загрузить"); });
    return () => { cancel = true; };
  }, [id]);

  const stats = useMemo(() => {
    if (!results.length) return null;
    const totals = results.reduce(
      (acc, r) => {
        acc.score += r.score;
        acc.pct += r.totalQuestions ? (r.correctCount / r.totalQuestions) * 100 : 0;
        acc.best = Math.min(acc.best, r.timeSec || Infinity);
        return acc;
      },
      { score: 0, pct: 0, best: Infinity },
    );
    return {
      count: results.length,
      avgScore: Math.round(totals.score / results.length),
      avgPct: Math.round(totals.pct / results.length),
      bestTime: Number.isFinite(totals.best) ? totals.best : 0,
    };
  }, [results]);

  const startOnline = async () => {
    if (!game) return;
    setBusyMsg("Создаём комнату…");
    try {
      const { code } = await createRoom(game.kind, game.id);
      navigate({ to: "/room/$code", params: { code } });
    } catch {
      showToast("Не удалось создать комнату");
    } finally {
      setBusyMsg(null);
    }
  };

  const playOffline = () => {
    if (!game) return;
    if (game.kind === "quiz") setOpenHost(true);
    else window.open(`/play/${game.kind}/${game.id}`, "_blank", "noopener");
  };

  const doPrint = () => {
    if (!game) return;
    try {
      if (game.kind === "quiz") printQuiz(game.data as QuizData, { withAnswers: true });
      else if (game.kind === "jeopardy") printJeopardy(game.data as JeopardyData, { withAnswers: true });
      else printMillionaire(game.data as MillionaireData, { withAnswers: true });
    } catch {
      showToast("Ошибка печати");
    }
  };

  const doExport = () => {
    if (!game) return;
    try {
      if (game.kind === "quiz") exportQuizExcel(game.data as QuizData);
      else if (game.kind === "jeopardy") exportJeopardyExcel(game.data as JeopardyData);
      else exportMillionaireExcel(game.data as MillionaireData);
    } catch {
      showToast("Ошибка экспорта");
    }
  };

  const doDelete = async () => {
    if (!game) return;
    if (!confirm(`Удалить «${titleOf(game)}»?`)) return;
    try {
      await deleteGame(game.kind, game.id);
      navigate({ to: "/library" });
    } catch {
      showToast("Не удалось удалить");
    }
  };

  if (game === undefined && !error) {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="surface-card h-64 animate-pulse bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Игра не найдена</h1>
          <p className="mt-2 text-muted-foreground">{error ?? "Возможно, она была удалена."}</p>
          <Link to="/library" className="btn-accent mt-4 inline-flex">В библиотеку</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/library" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> В библиотеку
        </Link>

        <div className="mb-6">
          <div className="mb-2 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {KIND_LABEL[game.kind]}
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight">{titleOf(game)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Обновлено: {new Date(game.updatedAt).toLocaleString("ru-RU")}
          </p>
        </div>

        {/* Actions */}
        <div className="surface-card mb-6 flex flex-wrap gap-2 p-4">
          <button onClick={startOnline} className="btn-accent" disabled={!!busyMsg}>
            <Radio className="h-4 w-4" /> {busyMsg ?? "Онлайн-комната"}
          </button>
          <button onClick={playOffline} className="btn-ghost">
            <Play className="h-4 w-4" /> Офлайн-игра
          </button>
          <button onClick={doPrint} className="btn-ghost">
            <Printer className="h-4 w-4" /> Печать / PDF
          </button>
          <button onClick={doExport} className="btn-ghost">
            <FileSpreadsheet className="h-4 w-4" /> Экспорт в Excel
          </button>
          <a href={`/builder/${game.kind}?id=${game.id}`} className="btn-ghost">
            <Pencil className="h-4 w-4" /> Редактировать
          </a>
          <button onClick={doDelete} className="btn-ghost ml-auto text-danger hover:bg-danger-soft">
            <Trash2 className="h-4 w-4" /> Удалить
          </button>
        </div>

        {/* Stats + Results (quiz only for now) */}
        {game.kind === "quiz" ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <StatCard label="Прохождений" value={String(stats?.count ?? 0)} />
              <StatCard label="Средний балл" value={String(stats?.avgScore ?? 0)} />
              <StatCard
                label="Лучшее время"
                value={
                  stats
                    ? `${Math.floor(stats.bestTime / 60)}:${String(stats.bestTime % 60).padStart(2, "0")}`
                    : "—"
                }
              />
            </div>

            <div className="surface-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <Trophy className="h-4 w-4 text-amber" />
                <h2 className="font-display text-base font-bold">Результаты</h2>
              </div>
              {results.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Ещё никто не проходил.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-muted text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="w-8 px-3 py-2"></th>
                      <th className="px-3 py-2">Игрок</th>
                      <th className="px-3 py-2">Баллы</th>
                      <th className="px-3 py-2">% верно</th>
                      <th className="px-3 py-2">Время</th>
                      <th className="px-3 py-2">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.flatMap((r) => {
                      const pct = r.totalQuestions
                        ? Math.round((r.correctCount / r.totalQuestions) * 100)
                        : 0;
                      const isOpen = expanded === r.id;
                      const rows = [
                        <tr
                          key={r.id}
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="cursor-pointer border-t border-border hover:bg-surface-muted/60"
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="px-3 py-2 font-semibold">{r.playerName || "Аноним"}</td>
                          <td className="px-3 py-2 font-mono">
                            {r.score}
                            <span className="text-muted-foreground">/{r.maxScore}</span>
                          </td>
                          <td className="px-3 py-2">{pct}%</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {Math.floor(r.timeSec / 60)}:{String(r.timeSec % 60).padStart(2, "0")}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(r.finishedAt).toLocaleString("ru-RU")}
                          </td>
                        </tr>,
                      ];
                      if (isOpen) {
                        rows.push(
                          <tr key={r.id + "-d"} className="bg-surface-muted/40">
                            <td colSpan={6} className="px-5 py-3">
                              {r.answers && r.answers.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-border bg-white">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-surface-muted text-left uppercase tracking-wider text-muted-foreground">
                                        <th className="w-8 px-2 py-1.5"></th>
                                        <th className="px-2 py-1.5">Вопрос</th>
                                        <th className="px-2 py-1.5">Ответ игрока</th>
                                        <th className="px-2 py-1.5">Правильный</th>
                                        <th className="px-2 py-1.5">Баллы</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.answers.map((a, i) => (
                                        <tr key={i} className="border-t border-border align-top">
                                          <td className="px-2 py-1.5">
                                            {a.isCorrect ? (
                                              <span className="text-success">✓</span>
                                            ) : (
                                              <span className="text-danger">✕</span>
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5">{a.question}</td>
                                          <td className={`px-2 py-1.5 ${a.isCorrect ? "text-success" : "text-danger"}`}>
                                            {a.given || <span className="text-muted-foreground">—</span>}
                                          </td>
                                          <td className="px-2 py-1.5 text-muted-foreground">{a.correctAnswer}</td>
                                          <td className="px-2 py-1.5 font-mono">
                                            {a.earned}
                                            <span className="text-muted-foreground">/{a.points}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Детализация недоступна: результат сохранён до обновления.
                                </p>
                              )}
                            </td>
                          </tr>,
                        );
                      }
                      return rows;
                    })}

                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="surface-card p-6 text-sm text-muted-foreground">
            Статистика прохождений доступна для формата «Квиз».
          </div>
        )}
      </main>

      {openHost && game.kind === "quiz" && (
        <OfflineHostView gameId={game.id} onClose={() => setOpenHost(false)} />
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-danger px-5 py-3 text-sm font-semibold text-white shadow-lift">
          {toast}
        </div>
      )}
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

function OfflineHostView({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const playUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/quiz/${gameId}`
      : `/play/quiz/${gameId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(playUrl)}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(playUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-up rounded-3xl bg-surface p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Офлайн-режим</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ссылка для учеников
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                className="input-base flex-1 font-mono text-xs"
                value={playUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="btn-ghost" onClick={copy}>
                <Copy className="h-4 w-4" /> {copied ? "Ок" : "Копировать"}
              </button>
            </div>
            <button
              onClick={() => window.open(playUrl, "_blank", "noopener")}
              className="btn-accent mt-4 w-full justify-center py-3"
            >
              <Monitor className="h-4 w-4" /> Открыть плеер на проекторе
            </button>
          </div>
          <div className="grid place-items-center rounded-2xl border border-border bg-surface-muted p-3">
            <img src={qrUrl} alt="QR" className="h-40 w-40 rounded-lg" />
            <p className="mt-2 text-[11px] text-muted-foreground">QR к плееру</p>
          </div>
        </div>
      </div>
    </div>
  );
}
