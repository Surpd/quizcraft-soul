import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { joinRoom } from "@/lib/api";
import { LIMITS } from "@/lib/limits";

const AVATARS = ["🦩", "🐢", "🦜", "🐬", "🦀", "🐙", "🦑", "🐠", "🌴", "🌊", "🍍", "🏝️"];

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
  const [avatar, setAvatar] = useState(AVATARS[0]);
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
    const res = await joinRoom(code, nickname.trim(), avatar);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Не удалось присоединиться");
      return;
    }
    try {
      sessionStorage.setItem(`islandquiz.me.${code}`, JSON.stringify({ playerId: res.player_id, nickname, avatar }));
    } catch { /* ignore */ }
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
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Код комнаты</span>
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
              Ваше имя <span className="text-muted-foreground/70">({nickname.length}/{LIMITS.nickname})</span>
            </span>
            <input
              className="input-base"
              placeholder="Как вас называть?"
              maxLength={LIMITS.nickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Аватар</span>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`aspect-square rounded-xl text-2xl transition-all ${
                    avatar === a ? "bg-primary text-primary-foreground scale-110 shadow-lift" : "bg-surface-muted hover:bg-border"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-accent w-full justify-center py-3 text-base">
            <LogIn className="h-4 w-4" /> {loading ? "Подключаемся..." : "Присоединиться"}
          </button>
        </form>
      </main>
    </div>
  );
}
