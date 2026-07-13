import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trophy, Check, X, Hourglass } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  subscribeRoom,
  loadGame,
  submitAnswer,
  type RoomState,
} from "@/lib/api";
import { LaTeX } from "@/lib/latex";
import type { QuizData, QuizQuestion } from "@/lib/types";

export const Route = createFileRoute("/room/$code/play")({
  head: () => ({ meta: [{ title: "Игра — IslandQuiz" }, { name: "robots", content: "noindex" }] }),
  component: StudentPlay,
});

interface Me { playerId: string; nickname: string; avatar: string }

function StudentPlay() {
  const { code } = Route.useParams();
  const [state, setState] = useState<RoomState | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedAt, setPickedAt] = useState<number>(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`islandquiz.me.${code}`);
      if (raw) setMe(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [code]);

  useEffect(() => subscribeRoom(code, setState), [code]);

  useEffect(() => {
    if (!state || quiz) return;
    loadGame<QuizData>("quiz", state.gameId).then((rec) => rec && setQuiz(rec.data));
  }, [state, quiz]);

  useEffect(() => {
    // Reset selection on question change
    if (state?.status === "active") { setPicked(null); setPickedAt(0); }
  }, [state?.questionIdx, state?.status]);

  const question: QuizQuestion | undefined = quiz?.questions[state?.questionIdx ?? -1];
  const myPlayer = useMemo(
    () => state?.players.find((p) => p.id === me?.playerId),
    [state, me],
  );

  if (!me) {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Сначала присоединитесь</h1>
          <a href="/join" className="btn-accent mt-4 inline-flex">На /join</a>
        </div>
      </div>
    );
  }

  if (!state) return <FullScreen msg="Загружаем комнату..." />;

  if (state.status === "waiting")
    return (
      <FullScreen
        title={`${me.avatar} ${me.nickname}`}
        msg="Ждём, пока учитель начнёт игру..."
      />
    );

  if (state.status === "finished") {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const place = sorted.findIndex((p) => p.id === me.playerId) + 1;
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <main className="mx-auto max-w-md px-6 py-16 text-center">
          <Trophy className="mx-auto mb-2 h-10 w-10 text-amber" />
          <h1 className="font-display text-3xl font-bold">Финал</h1>
          <p className="mt-2 text-muted-foreground">Ваше место: <b>{place || "—"}</b></p>
          <p className="mt-1 font-mono text-2xl font-bold">{myPlayer?.score.toLocaleString("ru-RU") ?? 0}</p>
        </main>
      </div>
    );
  }

  if (!question) return <FullScreen msg="Ждём вопрос..." />;

  const pick = async (value: string) => {
    if (picked || state.status !== "active") return;
    setPicked(value);
    const now = Date.now();
    setPickedAt(now);
    const totalMs = (question.time || 30) * 1000;
    const timeMs = state.questionStartAt ? now - state.questionStartAt : totalMs;
    const correct = value === question.answer;
    await submitAnswer(code, me.playerId, { correct, timeMs, totalMs });
  };

  const isReveal = state.status === "reveal" || state.status === "leaderboard";

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <span className="text-lg">{me.avatar}</span> {me.nickname}
          </span>
          <span className="font-mono font-bold">{myPlayer?.score.toLocaleString("ru-RU") ?? 0}</span>
        </div>

        {state.status === "active" && !picked && (
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Выберите ответ
          </p>
        )}

        {picked && !isReveal && (
          <div className="surface-card mb-3 flex items-center gap-2 p-4">
            <Hourglass className="h-4 w-4 text-primary" /> Ответ отправлен, ждём остальных...
          </div>
        )}

        {question.type === "choice" ? (
          <div className="grid gap-3">
            {question.options.map((opt, i) => {
              const isMine = picked === opt;
              const isRight = isReveal && opt === question.answer;
              const isWrongMine = isReveal && isMine && !isRight;
              return (
                <button
                  key={i}
                  onClick={() => pick(opt)}
                  disabled={!!picked || state.status !== "active"}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-5 text-left text-lg font-semibold transition-all ${
                    isRight ? "border-success bg-success-soft text-success" :
                    isWrongMine ? "border-danger bg-danger-soft text-danger" :
                    isMine ? "border-primary bg-primary-soft" :
                    "border-border bg-white hover:border-primary"
                  } disabled:cursor-not-allowed`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted font-mono text-sm">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1"><LaTeX>{opt}</LaTeX></span>
                  {isRight && <Check className="h-5 w-5" />}
                  {isWrongMine && <X className="h-5 w-5" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="surface-card p-5">
            <p className="text-sm text-muted-foreground">Этот тип вопроса в онлайн-режиме отображается только на экране учителя.</p>
          </div>
        )}

        {myPlayer?.streak && myPlayer.streak >= 2 ? (
          <p className="mt-4 text-center text-sm font-semibold text-amber">🔥 Стрик {myPlayer.streak}!</p>
        ) : null}
      </main>
    </div>
  );
}

function FullScreen({ title, msg }: { title?: string; msg: string }) {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        {title && <h1 className="mb-2 font-display text-3xl font-bold">{title}</h1>}
        <p className="text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
}
