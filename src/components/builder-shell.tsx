import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "./site-header";

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function BuilderShell({ title, subtitle, icon, toolbar, sidebar, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
              {icon && (
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                  {icon}
                </span>
              )}
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {toolbar}
        </div>

        <div className={sidebar ? "flex flex-col gap-6 lg:flex-row" : ""}>
          {sidebar && (
            <aside className="lg:sticky lg:top-24 lg:w-52 lg:flex-shrink-0 lg:self-start">
              <div className="surface-card p-3">{sidebar}</div>
            </aside>
          )}
          <main className="min-w-0 flex-1 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
