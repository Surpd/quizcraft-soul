import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { resetPassword } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Новый пароль — IslandQuiz" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 6) return setErr("Пароль должен быть не короче 6 символов");
    if (pwd !== pwd2) return setErr("Пароли не совпадают");
    setBusy(true);
    const r = await resetPassword(token, pwd);
    setBusy(false);
    if (r.ok) setDone(true);
    else setErr("Не удалось изменить пароль");
  };

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-3xl font-black">Новый пароль</h1>
        {done ? (
          <div className="surface-card mt-6 flex flex-col gap-3 p-6">
            <p className="text-sm">Пароль изменён!</p>
            <Link to="/login" className="btn-accent justify-center py-3">
              Войти
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="surface-card mt-6 flex flex-col gap-3 p-6">
            <label className="text-sm font-semibold">
              Новый пароль
              <input
                type="password"
                required
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="input-base mt-1 w-full"
                autoComplete="new-password"
              />
            </label>
            <label className="text-sm font-semibold">
              Повторите пароль
              <input
                type="password"
                required
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className="input-base mt-1 w-full"
                autoComplete="new-password"
              />
            </label>
            {err && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>
            )}
            <button type="submit" disabled={busy} className="btn-accent justify-center py-3">
              {busy ? "Сохраняем…" : "Изменить пароль"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
