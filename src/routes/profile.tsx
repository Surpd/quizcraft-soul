import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/use-auth";
import { listGames } from "@/lib/api";
import type { StoredGame } from "@/lib/types";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Профиль — IslandQuiz" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoading, updateProfile, logout } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mine, setMine] = useState<StoredGame[]>([]);


  useEffect(() => {
    if (!isLoading && !user) nav({ to: "/login" });
  }, [isLoading, user, nav]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio ?? "");
      setSubject(user.subject ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    listGames().then((all) => setMine(all.filter((g) => g.ownerId === user.id)));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
      </div>
    );
  }

  const onSave = async () => {
    setSaving(true);
    await updateProfile({
      name: name.trim() || user.name,
      bio: bio.trim(),
      subject: subject.trim(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };


  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user.name} size={64} />
          <div>
            <h1 className="font-display text-3xl font-black">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="surface-card mb-6 flex flex-col gap-3 p-6">
          <label className="text-sm font-semibold">
            Имя
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base mt-1 w-full"
            />
          </label>
          <label className="text-sm font-semibold">
            Предмет / направление
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={60}
              placeholder="Математика, история…"
              className="input-base mt-1 w-full"
            />
          </label>
          <label className="text-sm font-semibold">
            О себе
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Пара слов о себе — видно на публичном профиле."
              className="input-base mt-1 w-full resize-none"
            />
          </label>
          <div className="flex items-center gap-2">
            <button onClick={onSave} disabled={saving} className="btn-accent">
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
            {saved && <span className="text-sm text-success">Сохранено</span>}
            <Link
              to="/profile/$userId"
              params={{ userId: user.id }}
              className="btn-ghost"
            >
              Открыть публичный профиль
            </Link>

            <button
              onClick={async () => {
                await logout();
                nav({ to: "/" });
              }}
              className="btn-ghost ml-auto text-danger hover:bg-danger-soft"
            >
              Выйти
            </button>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-bold">Статистика</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ваших игр: <b className="text-foreground">{mine.length}</b>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Публичных: <b className="text-foreground">{mine.filter((g) => g.visibility === "public").length}</b>
          </p>
          <Link to="/library" className="btn-ghost mt-4 inline-flex">
            Открыть библиотеку
          </Link>
        </div>
      </main>
    </div>
  );
}
