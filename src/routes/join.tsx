import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Avatar } from "@/components/avatar";
import { joinRoom } from "@/lib/api";
import { LIMITS } from "@/lib/limits";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Присоединиться — IslandQuiz" },
      { name: "description", content: "Введите код комнаты и играйте вместе." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 4 || !nickname.trim()) {
      setError("Введите 4-значный код и имя");
      return;
    }
    setLoading(true);
    // Avatar is derived from nickname (deterministic color + letter);
    // send the nickname as the avatar payload for legacy shape compatibility.
    const res = await joinRoom(code, nickname.trim(), nickname.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Не удалось присоединиться");
      return;
    }
    try {
      sessionStorage.setItem(
        `islandquiz.me.${code}`,
        JSON.stringify({ playerId: res.player_id, nickname, avatar: nickname }),
      );
    } catch {
      /* ignore */
    }
    navigate({ to: "/room/$code/play", params: { code } });
  };

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          <Users className="h-3.5 w-3.5" /> Онлайн-комната
        </div>
        <h1 className="mb-2 font-display text-4xl font-bold tracking-tight">Присоединиться</h1>
        <p className="mb-8 text-muted-foreground">Введите код с экрана учителя.</p>

        <form onSubmit={submit} className="surface-card space-y-5 p-6">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Код комнаты
            </span>
            <input
              inputMode="numeric"
              maxLength={4}
              className="input-base text-center font-display text-3xl font-bold tracking-[0.5em]"
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ваше имя{" "}
              <span className="text-muted-foreground/70">
                ({nickname.length}/{LIMITS.nickname})
              </span>
            </span>
            <input
              className="input-base"
              placeholder="Как вас называть?"
              maxLength={LIMITS.nickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          {nickname.trim() && (
            <div className="flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
              <Avatar name={nickname} size={40} />
              <div className="text-sm">
                <p className="font-semibold">{nickname}</p>
                <p className="text-xs text-muted-foreground">
                  Цвет и буква создаются автоматически.
                </p>
              </div>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full justify-center py-3 text-base"
          >
            <LogIn className="h-4 w-4" /> {loading ? "Подключаемся..." : "Присоединиться"}
          </button>
        </form>
      </main>
    </div>
  );
}
