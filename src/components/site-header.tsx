import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-border bg-white/80 backdrop-blur-md ${compact ? "" : ""}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">IslandQuiz</span>
        </Link>
        <nav className="hidden gap-6 md:flex">
          <Link to="/library" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Библиотека
          </Link>
          <Link to="/builder/quiz" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Квиз
          </Link>
          <Link to="/builder/jeopardy" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Своя игра
          </Link>
          <Link to="/builder/millionaire" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Миллионер
          </Link>
          <Link to="/join" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Присоединиться
          </Link>
        </nav>
        <Link
          to="/library"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
        >
          Мои квизы
        </Link>
      </div>
    </header>
  );
}
