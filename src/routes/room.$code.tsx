import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Play,
  Eye,
  ChevronRight,
  Trophy,
  Radio,
  Users,
  Flag,
  Copy,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  subscribeRoom,
  loadGame,
  startRoom,
  revealAnswer,
  showLeaderboard,
  nextQuestion,
  finishRoom,
  type RoomState,
} from "@/lib/api";
import { LaTeX } from "@/lib/latex";
import type { QuizData, QuizQuestion } from "@/lib/types";

export const Route = createFileRoute("/room/$code")({
  head: () => ({
    meta: [
      { title: "Комната — IslandQuiz" },
      { name: "description", content: "Учительский экран онлайн-квиза." },
    ],
  }),
  component: TeacherRoom,
});

function TeacherRoom() {
  const { code } = Route.useParams();
  const [state, setState] = useState<RoomState | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeRoom(code, setState), [code]);

  useEffect(() => {
    if (!state || quiz || state.gameKind !== "quiz") return;
    loadGame<QuizData>("quiz", state.gameId).then((rec) => rec && setQuiz(rec.data));
  }, [state, quiz]);

  if (!state) {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Комната не найдена</h1>
          <p className="mt-2 text-muted-foreground">Проверьте код или создайте новую комнату из библиотеки.</p>
          <Link to="/library" className="btn-accent mt-4 inline-flex">В библиотеку</Link>
        </div>
      </div>
    );
  }

  if (state.gameKind !== "quiz") {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Онлайн-режим</h1>
          <p className="mt-2 text-muted-foreground">Пока поддерживается только квиз. «Своя игра» и «Миллионер» — офлайн.</p>
        </div>
      </div>
    );
  }

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join` : "/join";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`;
  const question: QuizQuestion | undefined = quiz?.questions[state.questionIdx];
  const total = quiz?.questions.length ?? 0;
  const answered = state.players.filter((p) => p.lastAnswer?.questionIdx === state.questionIdx).length;

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {state.status === "waiting" && (
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div className="surface-card p-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                <Radio className="h-3.5 w-3.5" /> Зал ожидания
              </div>
              <p className="text-sm text-muted-foreground">Код комнаты</p>
              <div className="my-3 flex items-center gap-3">
                <div className="font-display text-7xl font-black tracking-[0.25em]">{code}</div>
                <button onClick={copyCode} className="btn-ghost">
                  <Copy className="h-4 w-4" /> {copied ? "Скопировано" : "Копировать"}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Ученики заходят на <span className="font-mono font-semibold text-foreground">/join</span> и вводят код.
              </p>
              <button onClick={() => startRoom(code)} disabled={state.players.length === 0} className="btn-accent mt-6 justify-center py-3 text-base">
                <Play className="h-4 w-4" /> Начать игру ({state.players.length})
              </button>
            </div>
            <div className="surface-card grid place-items-center p-6">
              <img src={qrUrl} alt="QR-код" className="rounded-xl" />
              <p className="mt-2 text-xs text-muted-foreground">QR ведёт на /join</p>
            </div>
            <div className="surface-card md:col-span-2 p-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Users className="h-4 w-4" /> Игроки ({state.players.length})
              </div>
              {state.players.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ждём подключения...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.players.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold">
                      <span className="text-lg">{p.avatar}</span>
                      {p.nickname}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(state.status === "active" || state.status === "reveal") && question && (
          <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
            <div className="surface-card p-8">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-muted-foreground">Вопрос {state.questionIdx + 1} / {total}</span>
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                  Ответили: {answered} / {state.players.length}
                </span>
              </div>
              <h2 className="mb-6 font-display text-2xl font-bold leading-tight">
                <LaTeX>{question.q}</LaTeX>
              </h2>
              {question.type === "choice" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((opt, i) => {
                    const isCorrect = state.status === "reveal" && opt === question.answer;
                    return (
                      <div key={i} className={`rounded-2xl border-2 p-4 text-lg font-semibold transition-colors ${
                        isCorrect ? "border-success bg-success-soft text-success" : "border-border bg-white"
                      }`}>
                        <span className="mr-2 font-mono text-sm text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                        <LaTeX>{opt}</LaTeX>
                      </div>
                    );
                  })}
                </div>
              )}
              {question.type !== "choice" && state.status === "reveal" && (
                <p className="rounded-xl bg-success-soft px-4 py-3 text-success">
                  Ответ: <b>{question.answer}</b>
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                {state.status === "active" && (
                  <button onClick={() => revealAnswer(code)} className="btn-ghost">
                    <Eye className="h-4 w-4" /> Показать ответ
                  </button>
                )}
                {state.status === "reveal" && (
                  <button onClick={() => showLeaderboard(code)} className="btn-ghost">
                    <Trophy className="h-4 w-4" /> Рейтинг
                  </button>
                )}
                {state.questionIdx + 1 < total ? (
                  <button onClick={() => nextQuestion(code)} className="btn-accent">
                    <ChevronRight className="h-4 w-4" /> Следующий
                  </button>
                ) : (
                  <button onClick={() => finishRoom(code)} className="btn-accent">
                    <Flag className="h-4 w-4" /> Завершить
                  </button>
                )}
              </div>
            </div>
            <Leaderboard state={state} highlightFastest />
          </div>
        )}

        {state.status === "leaderboard" && (
          <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
            <Leaderboard state={state} highlightFastest big />
            <div className="surface-card grid place-items-center p-8 text-center">
              <p className="text-sm text-muted-foreground">Готовы к следующему?</p>
              {state.questionIdx + 1 < total ? (
                <button onClick={() => nextQuestion(code)} className="btn-accent mt-3">
                  <ChevronRight className="h-4 w-4" /> Следующий вопрос
                </button>
              ) : (
                <button onClick={() => finishRoom(code)} className="btn-accent mt-3">
                  <Flag className="h-4 w-4" /> Финальный подиум
                </button>
              )}
            </div>
          </div>
        )}

        {state.status === "finished" && (
          <div className="surface-card p-8 text-center">
            <Trophy className="mx-auto mb-2 h-10 w-10 text-amber" />
            <h1 className="font-display text-3xl font-bold">Игра окончена</h1>
            <div className="mx-auto mt-6 flex max-w-2xl flex-col items-stretch gap-3">
              {sorted.slice(0, 3).map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between rounded-2xl px-5 py-4 text-left ${
                  i === 0 ? "bg-amber-soft" : i === 1 ? "bg-surface-muted" : "bg-primary-soft/50"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl font-black">{i + 1}</span>
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-semibold">{p.nickname}</span>
                  </div>
                  <span className="font-mono text-xl font-bold">{p.score.toLocaleString("ru-RU")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Leaderboard({ state, highlightFastest, big }: { state: RoomState; highlightFastest?: boolean; big?: boolean }) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Trophy className="h-4 w-4" /> Рейтинг
      </div>
      <div className="space-y-2">
        {sorted.map((p, i) => {
          const isFastest = highlightFastest && p.id === state.fastestPlayerId;
          return (
            <div key={p.id} className={`flex items-center justify-between rounded-xl px-3 py-2 transition-all ${
              i === 0 ? "bg-amber-soft" : "bg-surface-muted"
            } ${big ? "py-4 text-lg" : ""}`}>
              <div className="flex items-center gap-2 truncate">
                <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span>{p.avatar}</span>
                <span className="truncate font-semibold">{p.nickname}</span>
                {p.streak >= 2 && <span className="rounded-full bg-amber/20 px-1.5 text-[10px] font-bold text-amber">🔥{p.streak}</span>}
                {isFastest && <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-bold text-primary">🎯</span>}
              </div>
              <span className="font-mono text-sm font-bold">{p.score.toLocaleString("ru-RU")}</span>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">Пока никого.</p>}
      </div>
    </div>
  );
}
