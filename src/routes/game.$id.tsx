import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Radio,
  Play,
  Printer,
  FileSpreadsheet,
  Pencil,
  Trophy,
  Trash2,
  Monitor,
  Copy,
  X,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { findGame, createRoom, deleteGame } from "@/lib/api";
import {
  exportQuizExcel,
  exportJeopardyExcel,
  exportMillionaireExcel,
  printQuiz,
  printJeopardy,
  printMillionaire,
} from "@/lib/exports";
import type { GameKind, QuizData, JeopardyData, MillionaireData, StoredGame } from "@/lib/types";

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
      })
      .catch((e) => {
        if (!cancel) setError(e?.message ?? "Не удалось загрузить");
      });
    return () => {
      cancel = true;
    };
  }, [id]);

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
      else if (game.kind === "jeopardy")
        printJeopardy(game.data as JeopardyData, { withAnswers: true });
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
          <Link to="/library" className="btn-accent mt-4 inline-flex">
            В библиотеку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          to="/library"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
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

        {/* Results dashboard link */}
        <div className="surface-card p-6">
          {game.kind === "millionaire" ? (
            <p className="text-sm text-muted-foreground">
              Статистика прохождений доступна для форматов «Квиз» и «Своя игра».
            </p>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-base font-bold">Результаты прохождений</h2>
                <p className="text-sm text-muted-foreground">
                  Вся статистика, ответы и таблицы лидеров на отдельной странице.
                </p>
              </div>
              <Link
                to={`/${game.kind}/${game.id}/results`}
                className="btn-accent inline-flex items-center gap-2"
              >
                <Trophy className="h-4 w-4" /> Открыть результаты
              </Link>
            </div>
          )}
        </div>
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
