import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { RefreshCw, Trophy, Timer } from "lucide-react";
import { PlayerShell, TimerBar } from "@/components/player-shell";
import { LaTeX } from "@/lib/latex";
import { loadGame } from "@/lib/storage";
import { saveQuizResult } from "@/lib/results";
import { formatQuizAnswer } from "@/lib/format-answer";
import type { QuizData, QuizQuestion } from "@/lib/types";

export const Route = createFileRoute("/play/quiz/$id")({
  component: PlayQuiz,
});

interface QAnswer {
  qId: string;
  correct: boolean;
  earned: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function checkAnswer(q: QuizQuestion, given: string): boolean {
  if (q.type === "choice" || q.type === "bool") return given === q.answer;
  if (q.type === "text") {
    const accept = q.answer
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return accept.some((a) => given.trim().toLowerCase().includes(a));
  }
  if (q.type === "matching") {
    try {
      const pairs = JSON.parse(q.answer) as { left: string; right: string }[];
      const givenMap = JSON.parse(given || "{}") as Record<string, string>;
      return pairs.every((p) => givenMap[p.left] === p.right);
    } catch {
      return false;
    }
  }
  return false;
}

function PlayQuiz() {
  const { id } = Route.useParams();
  const [stored, setStored] = useState<QuizData | null>(null);
  const [phase, setPhase] = useState<"start" | "playing" | "done">("start");
  const [name, setName] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<QAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [current, setCurrent] = useState<string>("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    const g = loadGame<QuizData>("quiz", id);
    if (g) setStored(g.data);
  }, [id]);

  const config = stored?.config;
  const questions = stored?.questions ?? [];

  useEffect(() => {
    if (!config || !questions.length) return;
    if (phase !== "playing") return;
    const isFree = config.orderMode === "free";
    if (isFree) {
      const remaining = Math.max(0, config.totalTime * 60 - Math.floor((Date.now() - startedAt.current) / 1000));
      setTimeLeft(remaining);
      const t = setInterval(() => {
        const r = Math.max(0, config.totalTime * 60 - Math.floor((Date.now() - startedAt.current) / 1000));
        setTimeLeft(r);
        if (r <= 0) {
          clearInterval(t);
          finishAll();
        }
      }, 500);
      return () => clearInterval(t);
    }
    // sequential: per-question timer
    const q = questions[order[idx]];
    setTimeLeft(q.time || config.defaultTime);
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          submit(true); // timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, order, config]);

  const start = () => {
    if (!config) return;
    const base = questions.map((_, i) => i);
    const ord = config.shuffleQuestions ? shuffle(base) : base;
    setOrder(ord);
    setIdx(0);
    setAnswers([]);
    setCurrent("");
    setFeedback(null);
    startedAt.current = Date.now();
    setPhase("playing");
  };

  const submit = (timeout = false) => {
    if (!config) return;
    const q = questions[order[idx]];
    const isCorrect = timeout ? false : checkAnswer(q, current);
    const earned = isCorrect ? q.points : 0;
    setAnswers((prev) => [...prev, { qId: q.id, correct: isCorrect, earned }]);
    setFeedback(isCorrect ? "correct" : "wrong");
    const delay = config.showResult === "each" ? 1200 : 200;
    setTimeout(() => {
      setFeedback(null);
      setCurrent("");
      if (idx + 1 >= order.length) setPhase("done");
      else setIdx(idx + 1);
    }, delay);
  };

  const finishAll = () => setPhase("done");
  const goTo = (newIdx: number) => {
    setCurrent("");
    setFeedback(null);
    setIdx(newIdx);
  };

  // Persist result once when reaching "done"
  useEffect(() => {
    if (phase !== "done" || !stored) return;
    const totalPts = questions.reduce((s, q) => s + q.points, 0);
    const earned = answers.reduce((s, a) => s + a.earned, 0);
    const correct = answers.filter((a) => a.correct).length;
    const timeSec = Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000));
    saveQuizResult({
      gameId: id,
      playerName: name.trim(),
      score: earned,
      maxScore: totalPts,
      correctCount: correct,
      totalQuestions: questions.length,
      timeSec,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!stored || !config) {
    return (
      <PlayerShell theme="amber">
        <div className="flex min-h-screen items-center justify-center px-4 text-center">
          <div>
            <p className="text-lg font-semibold">Игра не найдена</p>
            <p className="mt-2 text-sm text-[color:var(--pt-text-muted)]">
              Возможно, она сохранена в другом браузере.
            </p>
          </div>
        </div>
      </PlayerShell>
    );
  }

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const earnedPoints = answers.reduce((s, a) => s + a.earned, 0);
  const correctCount = answers.filter((a) => a.correct).length;

  return (
    <PlayerShell theme={config.theme}>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-16">
        {phase === "start" && (
          <div className="w-full max-w-lg animate-fade-up rounded-3xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] p-8 text-center backdrop-blur-md">
            <div className="mb-4 text-5xl">📝</div>
            <h1 className="font-display text-3xl font-black">{config.title}</h1>
            {config.description && (
              <p className="mt-2 text-[color:var(--pt-text-muted)]">{config.description}</p>
            )}
            <p className="mt-4 text-sm text-[color:var(--pt-text-muted)]">
              Вопросов: {questions.length} · {config.orderMode === "free" ? `Общее время ${config.totalTime} мин` : "Таймер на каждый вопрос"}
            </p>
            <input
              className="mt-6 w-full rounded-xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] px-4 py-3 text-center text-lg text-[color:var(--pt-text)] outline-none placeholder:text-[color:var(--pt-text-muted)]"
              placeholder="Ваше имя (необязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              onClick={start}
              className="mt-4 w-full rounded-xl bg-[color:var(--pt-accent)] py-3 font-bold text-black transition-transform hover:scale-[1.02] active:scale-95"
            >
              🚀 Начать
            </button>
          </div>
        )}

        {phase === "playing" && questions[order[idx]] && (
          <div className="flex w-full flex-col gap-6">
            <FreeNav
              questions={questions}
              order={order}
              answers={answers}
              current={idx}
              onGo={goTo}
            />
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[color:var(--pt-text-muted)]">
              <span>
                {idx + 1} / {order.length}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />
                {config.orderMode === "free"
                  ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`
                  : `${timeLeft}с`}
              </span>
            </div>
            <TimerBar
              pct={
                config.orderMode === "free"
                  ? (timeLeft / (config.totalTime * 60)) * 100
                  : (timeLeft / (questions[order[idx]].time || config.defaultTime)) * 100
              }
              urgent={timeLeft <= 5 && config.orderMode !== "free"}
            />

            <QuestionCard
              question={questions[order[idx]]}
              value={current}
              onChange={setCurrent}
              feedback={feedback}
              config={config}
            />

            <div className="flex justify-end gap-3">
              {config.orderMode === "free" && (
                <button
                  onClick={finishAll}
                  className="rounded-xl border border-[color:var(--pt-border)] px-6 py-3 text-sm font-semibold text-[color:var(--pt-text)] hover:bg-[color:var(--pt-surface-strong)]"
                >
                  Завершить
                </button>
              )}
              <button
                disabled={feedback !== null}
                onClick={() => submit(false)}
                className="rounded-xl bg-[color:var(--pt-accent)] px-8 py-3 font-bold text-black transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                Ответить
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="w-full max-w-lg animate-fade-up rounded-3xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] p-8 text-center backdrop-blur-md">
            <Trophy className="mx-auto mb-4 h-14 w-14 text-[color:var(--pt-accent)]" />
            <h1 className="font-display text-3xl font-black">Готово!</h1>
            {name && <p className="mt-1 text-[color:var(--pt-text-muted)]">{name}</p>}
            <div className="my-6 font-display text-6xl font-black text-[color:var(--pt-accent)]">
              {correctCount}/{questions.length}
            </div>
            <p className="text-sm text-[color:var(--pt-text-muted)]">
              Заработано {earnedPoints} из {totalPoints} баллов
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[color:var(--pt-surface-strong)]">
              <div
                className="h-full rounded-full bg-[color:var(--pt-accent)] transition-all"
                style={{ width: `${(earnedPoints / Math.max(totalPoints, 1)) * 100}%` }}
              />
            </div>
            <button
              onClick={() => {
                setPhase("start");
                setIdx(0);
                setAnswers([]);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:var(--pt-accent)] px-6 py-3 font-bold text-black hover:scale-[1.02]"
            >
              <RefreshCw className="h-4 w-4" /> Пройти ещё раз
            </button>
          </div>
        )}
      </div>
    </PlayerShell>
  );
}

function FreeNav({
  questions,
  order,
  answers,
  current,
  onGo,
}: {
  questions: QuizQuestion[];
  order: number[];
  answers: QAnswer[];
  current: number;
  onGo: (i: number) => void;
}) {
  const answeredMap = new Map(answers.map((a) => [a.qId, a]));
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] p-3">
      {order.map((qIdx, i) => {
        const answered = answeredMap.get(questions[qIdx].id);
        const active = i === current;
        return (
          <button
            key={i}
            onClick={() => onGo(i)}
            className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold transition-all ${
              active
                ? "bg-[color:var(--pt-accent)] text-black"
                : answered
                  ? answered.correct
                    ? "bg-success-soft text-success"
                    : "bg-danger-soft text-danger"
                  : "bg-[color:var(--pt-surface-strong)] text-[color:var(--pt-text-muted)] hover:text-[color:var(--pt-text)]"
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
  feedback,
  config,
}: {
  question: QuizQuestion;
  value: string;
  onChange: (v: string) => void;
  feedback: "correct" | "wrong" | null;
  config: QuizData["config"];
}) {
  return (
    <div className="rounded-3xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] p-8 backdrop-blur-md">
      {question.image && (
        <img
          src={question.image}
          alt=""
          className="mx-auto mb-4 max-h-56 rounded-xl border border-[color:var(--pt-border)] object-contain"
        />
      )}
      <div className="mb-6 text-center text-2xl font-semibold leading-snug">
        <LaTeX>{question.q}</LaTeX>
      </div>

      {question.type === "choice" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt, i) => {
            const selected = value === opt;
            const isCorrect = config.showResult === "each" && feedback && opt === question.answer;
            const isWrong = config.showResult === "each" && feedback === "wrong" && selected && opt !== question.answer;
            return (
              <button
                key={i}
                type="button"
                disabled={feedback !== null}
                onClick={() => onChange(opt)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                  isCorrect
                    ? "border-success bg-success/20"
                    : isWrong
                      ? "border-danger bg-danger/20"
                      : selected
                        ? "border-[color:var(--pt-accent)] bg-[color:var(--pt-surface-strong)]"
                        : "border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] hover:border-[color:var(--pt-accent)]"
                }`}
              >
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[color:var(--pt-accent)] text-sm font-bold text-black">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0"><LaTeX>{opt}</LaTeX></span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === "bool" && (
        <div className="grid grid-cols-2 gap-3">
          {(["true", "false"] as const).map((v) => (
            <button
              key={v}
              disabled={feedback !== null}
              onClick={() => onChange(v)}
              className={`rounded-xl border-2 px-4 py-6 text-lg font-bold ${
                value === v
                  ? v === "true"
                    ? "border-success bg-success/20 text-success"
                    : "border-danger bg-danger/20 text-danger"
                  : "border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)]"
              }`}
            >
              {v === "true" ? "✓ Правда" : "✕ Ложь"}
            </button>
          ))}
        </div>
      )}

      {question.type === "text" && (
        <input
          disabled={feedback !== null}
          className="w-full rounded-xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] px-4 py-3 text-lg text-[color:var(--pt-text)] outline-none focus:border-[color:var(--pt-accent)]"
          placeholder="Введите ответ..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.type === "matching" && (
        <MatchingBoard question={question} value={value} onChange={onChange} />
      )}

      {feedback && (
        <div className="mt-4 text-center">
          <p
            className={`text-lg font-bold ${
              feedback === "correct" ? "text-success" : "text-danger"
            }`}
          >
            {feedback === "correct" ? "✓ Верно!" : "✕ Неверно"}
          </p>
          {feedback === "wrong" && config.showResult === "each" && (
            <p className="mt-1 text-sm text-[color:var(--pt-text-muted)]">
              Правильный ответ: <span className="text-[color:var(--pt-text)]">{formatQuizAnswer(question)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MatchingBoard({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  const pairs = useMemo(() => {
    try {
      return JSON.parse(question.answer) as { left: string; right: string }[];
    } catch {
      return [];
    }
  }, [question.answer]);

  const shuffledRights = useMemo(() => shuffle(pairs.map((p) => p.right)), [pairs]);

  const assigned: Record<string, string> = useMemo(() => {
    try {
      return JSON.parse(value || "{}") as Record<string, string>;
    } catch {
      return {};
    }
  }, [value]);

  const usedRights = new Set(Object.values(assigned));

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const right = String(e.active.id).replace("right:", "");
    const left = String(e.over.id).replace("left:", "");
    // Remove any prior assignment of that right
    const next: Record<string, string> = {};
    Object.entries(assigned).forEach(([k, v]) => {
      if (v !== right) next[k] = v;
    });
    next[left] = right;
    onChange(JSON.stringify(next));
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase text-[color:var(--pt-text-muted)]">Пары</p>
          {pairs.map((p) => (
            <DropZone key={p.left} left={p.left} value={assigned[p.left]} />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase text-[color:var(--pt-text-muted)]">Перетащите варианты</p>
          {shuffledRights
            .filter((r) => !usedRights.has(r))
            .map((r) => (
              <Draggable key={r} value={r} />
            ))}
          {shuffledRights.filter((r) => !usedRights.has(r)).length === 0 && (
            <p className="rounded-xl border border-dashed border-[color:var(--pt-border)] p-3 text-center text-xs text-[color:var(--pt-text-muted)]">
              Все варианты расставлены
            </p>
          )}
        </div>
      </div>
    </DndContext>
  );
}

function DropZone({ left, value }: { left: string; value?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `left:${left}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-all ${
        isOver ? "border-[color:var(--pt-accent)] bg-[color:var(--pt-surface-strong)]" : "border-[color:var(--pt-border)]"
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{left}</span>
      <span className="text-[color:var(--pt-text-muted)]">→</span>
      <span
        className={`min-w-[40%] rounded-lg px-3 py-2 text-sm ${
          value
            ? "bg-[color:var(--pt-accent)] font-bold text-black"
            : "bg-[color:var(--pt-surface-strong)] text-[color:var(--pt-text-muted)]"
        }`}
      >
        {value || "…"}
      </span>
    </div>
  );
}

function Draggable({ value }: { value: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `right:${value}` });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      className={`cursor-grab rounded-xl border-2 border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] px-4 py-3 text-sm font-semibold shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {value}
    </div>
  );
}
