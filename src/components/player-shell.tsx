// Player-side atoms shared by all three plays: timer bar, back link, chrome shell.
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import type { PlayerTheme } from "@/lib/types";
import type { ReactNode } from "react";
import { AnimatedBackground } from "./animated-bg";

export function PlayerShell({
  theme,
  children,
}: {
  theme: PlayerTheme;
  children: ReactNode;
}) {
  return (
    <div data-scope="player" className={`relative pt-${theme}`}>
      <AnimatedBackground theme={theme} />
      <Link
        to="/"
        aria-label="На главную"
        className="fixed top-4 left-4 z-50 grid h-10 w-10 place-items-center rounded-full border border-[color:var(--pt-border)] bg-[color:var(--pt-surface-strong)] text-[color:var(--pt-text)] backdrop-blur-md transition-colors hover:bg-[color:var(--pt-accent)] hover:text-black"
      >
        <Home className="h-4 w-4" />
      </Link>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function TimerBar({ pct, urgent }: { pct: number; urgent?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--pt-surface-strong)]">
      <div
        className={`h-full rounded-full transition-all ${urgent ? "animate-pulse-soft" : ""}`}
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: urgent ? "var(--danger)" : "var(--pt-accent)",
          transitionDuration: "800ms",
          transitionTimingFunction: "linear",
        }}
      />
    </div>
  );
}

export function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm text-[color:var(--pt-text-muted)] hover:text-[color:var(--pt-text)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      На главную
    </Link>
  );
}
