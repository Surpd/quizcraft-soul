import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { SiteHeader } from "./site-header";
import { AnimatedBackground } from "./animated-bg";
import type { PlayerTheme } from "@/lib/types";

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  theme?: PlayerTheme;
  onSave?: () => void;
  saveLabel?: string;
  extraFabs?: ReactNode;
}

export function BuilderShell({
  title,
  subtitle,
  icon,
  toolbar,
  sidebar,
  children,
  theme,
  onSave,
  saveLabel = "Сохранить игру",
  extraFabs,
}: Props) {
  return (
    <div className={`relative min-h-screen bg-background ${theme ? `pt-${theme}` : ""}`}>
      {theme && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
            style={{ background: "var(--pt-bg)" }}
          />
          <AnimatedBackground theme={theme} />
        </>
      )}
      <div className="relative z-10">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            На главную
          </Link>

          <div className="mb-6 space-y-4">
            <div>
              <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
                {icon && (
                  <span
                    className="grid h-11 w-11 place-items-center rounded-2xl text-primary"
                    style={
                      theme
                        ? { background: "var(--pt-surface-strong)", color: "var(--pt-accent)" }
                        : { background: "var(--primary-soft)" }
                    }
                  >
                    {icon}
                  </span>
                )}
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {toolbar && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {toolbar}
              </div>
            )}
          </div>

          <div className={sidebar ? "flex flex-col gap-6 lg:flex-row" : ""}>
            {sidebar && (
              <aside className="lg:sticky lg:top-24 lg:w-52 lg:flex-shrink-0 lg:self-start">
                <div className="surface-card p-3">{sidebar}</div>
              </aside>
            )}
            <main className="min-w-0 flex-1 space-y-4 pb-24">{children}</main>
          </div>
        </div>
      </div>

      {extraFabs}
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lift transition-transform hover:scale-[1.03] active:scale-95"
          style={{
            background: theme ? "var(--pt-accent)" : "var(--primary)",
            color: theme ? "#000" : "#fff",
          }}
        >
          <Save className="h-4 w-4" />
          {saveLabel}
        </button>
      )}
    </div>
  );
}
