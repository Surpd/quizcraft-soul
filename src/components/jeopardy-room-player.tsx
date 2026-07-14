// Player-side online Jeopardy. Board (turn mode) or waiting (buzz mode until
// question opens). Buzz button, final-round bet & text answer, personal podium.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Volume2, VolumeX, Bell, Users, Hourglass } from "lucide-react";
import { PlayerShell } from "@/components/player-shell";
import { LaTeX } from "@/lib/latex";
import {
  loadGame,
  buzzJeopardy,
  selectJeopardyQuestion,
  submitJeopardyFinalBet,
  submitJeopardyFinalAnswer,
  type RoomState,
} from "@/lib/api";
import { sfx, isMuted, toggleMute } from "@/lib/sounds";
import { fitQuestionSize } from "@/lib/fit-text";
import type { JeopardyData } from "@/lib/types";

interface Me {
  playerId: string;
  nickname: string;
  avatar: string;
}

export function JeopardyRoomPlayer({
  state,
  code,
  me,
}: {
  state: RoomState;
  code: string;
  me: Me;
}) {
  const [game, setGame] = useState<JeopardyData | null>(null);
  const [muted, setMutedState] = useState(true);
  const [betLocal, setBetLocal] = useState<string>("");
  const [answerLocal, setAnswerLocal] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => setMutedState(isMuted()), []);
  useEffect(() => {
    loadGame<JeopardyData>("jeopardy", state.gameId).then((r) => r && setGame(r.data));
  }, [state.gameId]);

  // Redirect kicked players
  useEffect(() => {
    if (!state.players.some((p) => p.id === me.playerId)) {
      navigate({ to: "/join", replace: true });
    }
  }, [state.players, me.playerId, navigate]);

  const j = state.jeopardy!;
  const theme = game?.config.theme ?? "amber";
  const myPlayer = state.players.find((p) => p.id === me.playerId);
  const currentRound = game?.rounds[j.round] ?? [];
  const currentPlayer = state.players[j.currentPlayerIdx] ?? null;
  const isMyTurn = j.mode === "turn" && currentPlayer?.id === me.playerId;
  const question =
    j.selectedCat != null && j.selectedQ != null
      ? currentRound[j.selectedCat]?.questions[j.selectedQ]
      : null;

  const MuteBtn = (
    <button
      onClick={() => setMutedState(toggleMute())}
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] px-3 py-1.5 text-xs font-semibold"
    >
      {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      Звук
    </button>
  );

  if (!game) {
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <p className="text-[color:var(--pt-text-muted)]">Загрузка…</p>
        </div>
      </PlayerShell>
    );
  }

  // LOBBY
  if (j.phase === "lobby") {
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <div className="flex justify-center">{MuteBtn}</div>
          <div className="mt-6 text-6xl iq-pop">{me.avatar}</div>
          <h1 className="mt-3 font-display text-3xl font-black">Вы в комнате!</h1>
          <p className="mt-1 text-[color:var(--pt-text-muted)]">{me.nickname}</p>
          <p className="mt-6 text-sm text-[color:var(--pt-text-muted)]">
            Режим: {j.mode === "buzz" ? "🔔 по нажатию" : "🔄 по очереди"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--pt-text-muted)]">Ждём начала игры...</p>
          <div className="mt-6 rounded-3xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] p-4 text-left">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-[color:var(--pt-text-muted)]">
              <Users className="h-3.5 w-3.5" /> В комнате ({state.players.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className={`iq-pop flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                    p.id === me.playerId
                      ? "bg-[color:var(--pt-accent)] font-bold text-black"
                      : "bg-[color:var(--pt-surface-strong)]"
                  }`}
                >
                  <span>{p.avatar}</span>
                  {p.nickname}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PlayerShell>
    );
  }

  // BOARD
  if (j.phase === "board") {
    const maxRows = currentRound.reduce((m, c) => Math.max(m, c.questions.length), 0);
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <PlayerTop me={me} myScore={myPlayer?.score ?? 0} MuteBtn={MuteBtn} />
          <div className="mb-3 text-center text-sm">
            {j.mode === "turn" ? (
              isMyTurn ? (
                <p className="rounded-lg bg-[color:var(--pt-accent)]/20 px-3 py-2 font-bold text-[color:var(--pt-accent)]">
                  🎯 Ваш ход — выберите вопрос
                </p>
              ) : (
                <p className="text-[color:var(--pt-text-muted)]">
                  Ход: {currentPlayer?.avatar} <b>{currentPlayer?.nickname}</b>
                </p>
              )
            ) : (
              <p className="text-[color:var(--pt-text-muted)]">
                Учитель выбирает вопрос…
              </p>
            )}
          </div>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${currentRound.length}, minmax(0, 1fr))`,
              gridTemplateRows: `auto repeat(${maxRows}, minmax(0, 1fr))`,
            }}
          >
            {currentRound.map((cat, ci) => (
              <div
                key={`h-${ci}`}
                className="rounded-lg border border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] p-2 text-center text-[10px] font-bold uppercase leading-tight"
                style={{ gridColumn: ci + 1, gridRow: 1 }}
              >
                {cat.category || `К${ci + 1}`}
              </div>
            ))}
            {currentRound.flatMap((cat, ci) =>
              Array.from({ length: maxRows }).map((_, ri) => {
                const q = cat.questions[ri];
                if (!q)
                  return (
                    <div
                      key={`e-${ci}-${ri}`}
                      style={{ gridColumn: ci + 1, gridRow: ri + 2 }}
                      className="rounded-lg border border-dashed border-[color:var(--pt-border)]/40 opacity-30"
                    />
                  );
                const key = `${j.round}-${ci}-${ri}`;
                const used = j.usedKeys.includes(key);
                return (
                  <button
                    key={`q-${ci}-${ri}`}
                    disabled={used || !isMyTurn}
                    onClick={() => {
                      sfx.click();
                      selectJeopardyQuestion(code, me.playerId, ci, ri);
                    }}
                    style={{ gridColumn: ci + 1, gridRow: ri + 2 }}
                    className={`rounded-lg border border-[color:var(--pt-border)] py-4 font-display text-lg font-black transition-all ${
                      used
                        ? "opacity-20"
                        : isMyTurn
                          ? "bg-[color:var(--pt-accent)]/20 text-[color:var(--pt-accent)] hover:scale-105"
                          : "bg-[color:var(--pt-surface)] text-[color:var(--pt-text-muted)]"
                    }`}
                  >
                    {q.points}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </PlayerShell>
    );
  }

  // QUESTION / ANSWERING / REVEAL
  if (
    (j.phase === "question" || j.phase === "answering" || j.phase === "reveal") &&
    question
  ) {
    const iAmBuzzed = j.buzzedPlayerId === me.playerId;
    const isTurnAnswerer = j.mode === "turn" && isMyTurn;
    const canBuzz =
      j.mode === "buzz" && j.phase === "question" && !j.buzzedPlayerId;
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <PlayerTop me={me} myScore={myPlayer?.score ?? 0} MuteBtn={MuteBtn} />
          <p className="mb-2 text-center text-xs uppercase tracking-widest text-[color:var(--pt-text-muted)]">
            {currentRound[j.selectedCat!]?.category ?? "—"} · {question.points}
          </p>
          {question.image && (
            <img
              src={question.image}
              alt=""
              className="mx-auto mb-4 max-h-40 rounded-xl object-contain"
            />
          )}
          <div
            className={`rounded-3xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] p-6 text-center font-semibold ${fitQuestionSize(question.q)}`}
          >
            <LaTeX>{question.q}</LaTeX>
          </div>

          {(j.phase === "reveal" || j.showAnswer) && (
            <p className="mt-4 text-center text-xl font-bold text-[color:var(--pt-accent)]">
              Ответ: <LaTeX>{question.a}</LaTeX>
            </p>
          )}

          {canBuzz && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  sfx.click();
                  buzzJeopardy(code, me.playerId);
                }}
                className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-[color:var(--pt-accent)] text-4xl font-bold text-black shadow-lg transition-transform hover:scale-110 active:scale-95 iq-bounce"
              >
                <Bell className="h-10 w-10" />
              </button>
            </div>
          )}

          {j.phase === "answering" && (
            <div className="mt-6 text-center">
              {iAmBuzzed ? (
                <p className="text-xl font-bold text-[color:var(--pt-accent)]">
                  🎤 Отвечайте вслух! Учитель принимает ответ.
                </p>
              ) : (
                <p className="text-sm text-[color:var(--pt-text-muted)]">
                  Отвечает {state.players.find((p) => p.id === j.buzzedPlayerId)?.nickname}…
                </p>
              )}
            </div>
          )}

          {isTurnAnswerer && j.phase === "question" && (
            <div className="mt-6 text-center">
              <p className="text-xl font-bold text-[color:var(--pt-accent)]">
                🎤 Ваш ход — отвечайте вслух!
              </p>
            </div>
          )}

          {j.mode === "buzz" && !canBuzz && j.phase === "question" && !iAmBuzzed && (
            <p className="mt-6 text-center text-sm text-[color:var(--pt-text-muted)]">
              Ждём вопрос…
            </p>
          )}
        </div>
      </PlayerShell>
    );
  }

  // FINAL BETS
  if (j.phase === "final-bets") {
    const cap = Math.max(0, myPlayer?.score ?? 0);
    const saved = j.finalBets[me.playerId];
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-md px-4 py-8">
          <PlayerTop me={me} myScore={myPlayer?.score ?? 0} MuteBtn={MuteBtn} />
          <h1 className="mt-4 font-display text-2xl font-black">Финал · ставка</h1>
          <p className="mt-2 text-sm text-[color:var(--pt-text-muted)]">
            Категория: <b>{game.final.category || "секретно"}</b>. Ставьте от 0 до {cap}.
          </p>
          <input
            type="number"
            min={0}
            max={cap}
            className="mt-4 w-full rounded-xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] px-4 py-3 text-right font-mono text-2xl font-bold"
            value={betLocal || (saved ?? "").toString()}
            onChange={(e) => setBetLocal(e.target.value)}
            disabled={saved != null}
          />
          {saved != null ? (
            <p className="mt-4 rounded-xl bg-success/20 p-3 text-center text-sm font-bold text-success">
              🔒 Ставка {saved} заблокирована
            </p>
          ) : (
            <button
              onClick={() => {
                const v = Math.max(0, Math.min(cap, parseInt(betLocal) || 0));
                submitJeopardyFinalBet(code, me.playerId, v);
              }}
              className="mt-4 w-full rounded-xl bg-[color:var(--pt-accent)] py-3 font-bold text-black"
            >
              Подтвердить ставку
            </button>
          )}
        </div>
      </PlayerShell>
    );
  }

  // FINAL QUESTION
  if (j.phase === "final-question") {
    const given = j.finalGiven[me.playerId];
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-md px-4 py-8">
          <PlayerTop me={me} myScore={myPlayer?.score ?? 0} MuteBtn={MuteBtn} />
          <p className="mt-4 text-center text-xs uppercase tracking-widest text-[color:var(--pt-text-muted)]">
            Финал · ставка {j.finalBets[me.playerId] ?? 0}
          </p>
          <div
            className={`mt-2 rounded-3xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] p-6 text-center font-semibold ${fitQuestionSize(game.final.q)}`}
          >
            <LaTeX>{game.final.q}</LaTeX>
          </div>
          <input
            type="text"
            className="mt-4 w-full rounded-xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface)] px-4 py-3 text-lg"
            placeholder="Ваш ответ…"
            value={answerLocal || given || ""}
            onChange={(e) => setAnswerLocal(e.target.value)}
            disabled={given != null}
          />
          {given != null ? (
            <p className="mt-4 rounded-xl bg-success/20 p-3 text-center text-sm font-bold text-success">
              <Hourglass className="mr-1 inline h-4 w-4" /> Ответ отправлен
            </p>
          ) : (
            <button
              onClick={() =>
                submitJeopardyFinalAnswer(code, me.playerId, answerLocal.trim())
              }
              disabled={!answerLocal.trim()}
              className="mt-4 w-full rounded-xl bg-[color:var(--pt-accent)] py-3 font-bold text-black disabled:opacity-40"
            >
              Отправить ответ
            </button>
          )}
        </div>
      </PlayerShell>
    );
  }

  // FINAL REVEAL
  if (j.phase === "final-reveal") {
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-md px-4 py-8 text-center">
          <PlayerTop me={me} myScore={myPlayer?.score ?? 0} MuteBtn={MuteBtn} />
          <p className="mt-6 text-sm uppercase tracking-widest text-[color:var(--pt-text-muted)]">
            Ответ был:
          </p>
          <p className="mt-1 font-display text-2xl font-black text-[color:var(--pt-accent)]">
            {game.final.a}
          </p>
          <p className="mt-4 font-mono text-3xl font-bold">
            {myPlayer?.score.toLocaleString("ru-RU") ?? 0}
          </p>
          <p className="mt-6 text-sm text-[color:var(--pt-text-muted)]">
            Ждём объявления победителей…
          </p>
        </div>
      </PlayerShell>
    );
  }

  // PODIUM
  if (j.phase === "podium" || state.status === "finished") {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const place = sorted.findIndex((p) => p.id === me.playerId) + 1;
    return (
      <PlayerShell theme={theme}>
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <div className="flex justify-center">{MuteBtn}</div>
          <div className="mt-6 text-7xl iq-bounce">{me.avatar}</div>
          <Trophy className="mx-auto mt-4 h-10 w-10 text-[color:var(--pt-accent)]" />
          <h1 className="mt-2 font-display text-3xl font-black">Финал</h1>
          <p className="mt-1 text-[color:var(--pt-text-muted)]">
            Ваше место: <b className="text-[color:var(--pt-text)]">{place || "—"}</b>
          </p>
          <p className="mt-1 font-mono text-3xl font-bold">
            {myPlayer?.score.toLocaleString("ru-RU") ?? 0}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] px-5 py-3 font-bold"
          >
            На главную
          </Link>
        </div>
      </PlayerShell>
    );
  }

  return (
    <PlayerShell theme={theme}>
      <div className="mx-auto max-w-md px-6 py-16 text-center text-[color:var(--pt-text-muted)]">
        Ждём…
      </div>
    </PlayerShell>
  );
}

function PlayerTop({
  me,
  myScore,
  MuteBtn,
}: {
  me: Me;
  myScore: number;
  MuteBtn: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 font-semibold">
        <span className="text-lg">{me.avatar}</span> {me.nickname}
      </span>
      <div className="flex items-center gap-2">
        {MuteBtn}
        <span className="font-mono font-bold">{myScore.toLocaleString("ru-RU")}</span>
      </div>
    </div>
  );
}
